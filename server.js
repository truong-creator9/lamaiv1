const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Resend } = require('resend');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'brain.db');

// --- Cấu hình Resend Email ---
let resend;
const RESEND_CONFIG_PATH = path.join(__dirname, 'resend_config.txt');
try {
    if (fs.existsSync(RESEND_CONFIG_PATH)) {
        const apiKey = fs.readFileSync(RESEND_CONFIG_PATH, 'utf8').trim();
        resend = new Resend(apiKey);
        console.log('✅ Resend đã được khởi tạo thành công.');
    } else {
        console.warn('⚠️ Không tìm thấy file resend_config.txt. Email sẽ không được gửi.');
    }
} catch (err) {
    console.error('❌ Lỗi khi đọc file cấu hình Resend:', err.message);
}

// Hàm gửi email chung qua Resend
async function sendResendEmail({ to, subject, html }) {
    if (!resend) {
        console.warn('[Resend] Bỏ qua gửi mail vì Resend chưa được cấu hình.');
        return { success: false, message: 'Resend not configured' };
    }

    try {
        // Xử lý giới hạn Sandbox: Nếu gửi đến email có alias (+) mà Resend chưa verify domain
        // Chúng ta sẽ tạm thời gửi về email gốc (bỏ phần +alias) để đảm bảo mail tới được hòm thư test
        let targetEmail = Array.isArray(to) ? to[0] : to;
        if (targetEmail.includes('+') && targetEmail.includes('@gmail.com')) {
            const [local, domain] = targetEmail.split('@');
            const baseLocal = local.split('+')[0];
            targetEmail = `${baseLocal}@${domain}`;
            console.log(`[Sandbox Mode] Chuyển hướng email từ ${to} sang ${targetEmail}`);
        }

        const { data, error } = await resend.emails.send({
            from: 'LAMAI <onboarding@resend.dev>', // Email mặc định của Resend để test
            to: targetEmail,
            subject,
            html,
        });

        if (error) {
            console.error('[Resend Error]', error);
            return { success: false, error };
        }

        console.log('[Resend Success] Email đã gửi:', data.id);
        return { success: true, data };
    } catch (err) {
        console.error('[Resend Crash]', err.message);
        return { success: false, error: err.message };
    }
}
// -----------------------------

// URL Render trực tiếp (bypass Cloudflare WAF đang chặn SePay)
const RENDER_DIRECT_URL = 'https://lamaiv1.onrender.com';
const IS_PRODUCTION = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';

// Hàm tạo local time VN chuẩn YYYY-MM-DD HH:MM:SS
function getVNTime() {
    const d = new Date();
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000); // ms UTC
    const vnTime = new Date(utcTime + (7 * 3600000)); // Cấp GMT+7
    const pad = n => n.toString().padStart(2, '0');
    return `${vnTime.getFullYear()}-${pad(vnTime.getMonth()+1)}-${pad(vnTime.getDate())} ${pad(vnTime.getHours())}:${pad(vnTime.getMinutes())}:${pad(vnTime.getSeconds())}`;
}

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain' })); // Support text/plain from admin fetch
app.use((req, res, next) => {
    // Auto parse text/plain to JSON if it looks like JSON
    if (typeof req.body === 'string' && req.body.startsWith('{')) {
        try { req.body = JSON.parse(req.body); } catch (e) {}
    }
    next();
});

// Serve static files from the current directory (for index.html, etc.)
app.use(express.static(__dirname));

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error connecting to brain.db:', err.message);
    } else {
        console.log('Connected to the brain.db database.');
        // Khởi tạo bảng email_queue để lưu trữ chuỗi email cần gửi
        db.run(`
            CREATE TABLE IF NOT EXISTS email_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                email TEXT,
                subject TEXT,
                html TEXT,
                scheduled_at DATETIME,
                sent_at DATETIME,
                status TEXT DEFAULT 'pending',
                error TEXT
            )
        `);
    }
});

// --- Logic Phân tích & Lên lịch Chuỗi Email ---

/**
 * Phân tích nội dung file email_sequence.md thành 3 phần.
 */
function parseEmailSequence() {
    const filePath = path.join(__dirname, 'email_sequence.md');
    if (!fs.existsSync(filePath)) return null;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const sections = content.split('---');
    
    const parsed = sections.map(section => {
        const subjectMatch = section.match(/\*\*Tiêu đề:\*\*\s*(.*)/);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'Chào mừng đến với LAMAI';
        
        const bodies = section.split(/\*\*Tiêu đề:\*\*.*?\n/s);
        let body = bodies.length > 1 ? bodies[1] : section;
        body = body.trim();
        
        return { subject, body };
    }).filter(s => s.body.length > 50); // Lọc bỏ các phần thừa nếu có

    return parsed;
}

/**
 * Lên lịch gửi 3 email cho khách hàng.
 */
async function scheduleEmailSequence(customerId, email, name, isTestMode = false) {
    const emails = parseEmailSequence();
    if (!emails || emails.length < 3) {
        console.error('❌ Không thể tải hoặc phân tích file email_sequence.md (Yêu cầu ít nhất 3 phần).');
        return;
    }

    const vnTime = new Date(new Date().getTime() + (7 * 3600000));
    
    const schedules = [
        { email: emails[0], delayMs: 0 }, // Email 1: Ngay lập tức
        { email: emails[1], delayMs: isTestMode ? 5000 : 2 * 24 * 60 * 60 * 1000 }, // Email 2: 2 ngày (hoặc 5s nếu test)
        { email: emails[2], delayMs: isTestMode ? 10000 : 3 * 24 * 60 * 60 * 1000 } // Email 3: 3 ngày (hoặc 10s nếu test)
    ];

    for (const item of schedules) {
        const scheduledTime = new Date(vnTime.getTime() + item.delayMs);
        const scheduledStr = scheduledTime.toISOString().replace('T', ' ').substring(0, 19);
        
        // Chuyển đổi nội dung Markdown sơ khai sang HTML cơ bản có style LAMAI
        let htmlContent = item.email.body
            .replace(/\n/g, '<br>')
            .replace(/Chào Nàng,/g, `Chào ${name},`)
            .replace(/Chào Nàng yêu của LAMAI ơi,/g, `Chào ${name} yêu của LAMAI ơi,`)
            .replace(/\[Link Trang Thanh Toán\]/g, '<a href="https://www.lamai.vn/#checkoutForm" style="display:inline-block; padding:12px 24px; background-color:#ea754d; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">Sở hữu ngay thiết kế của riêng Nàng</a>');

        const fullHtml = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #ea754d; margin: 0;">LAMAI</h2>
                    <p style="font-size: 12px; color: #999; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">Thương Hiệu Thời Trang Thiết Kế</p>
                </div>
                <div style="font-size: 16px;">
                    ${htmlContent}
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <div style="font-size: 12px; color: #777; text-align: center;">
                    © 2025 LAMAI - Thương hiệu thời trang thiết kế cao cấp.<br>
                    Website: www.lamai.vn | Hotline: 0393096645
                </div>
            </div>
        `;

        db.run(`
            INSERT INTO email_queue (customer_id, email, subject, html, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [customerId, email, item.email.subject, fullHtml, scheduledStr, 'pending']);
    }

    console.log(`✅ Đã lên lịch chuỗi 3 email cho ${email} (Test mode: ${isTestMode})`);
}

/**
 * Worker xử lý hàng đợi email.
 */
async function processEmailQueue() {
    const now = new Date(new Date().getTime() + (7 * 3600000));
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);

    db.all(`
        SELECT * FROM email_queue 
        WHERE status = 'pending' AND scheduled_at <= ? 
        LIMIT 5
    `, [nowStr], async (err, rows) => {
        if (err || !rows || rows.length === 0) return;

        for (const row of rows) {
            // Đánh dấu là đang gửi để tránh gửi trùng
            db.run(`UPDATE email_queue SET status = 'sending' WHERE id = ?`, [row.id]);

            const result = await sendResendEmail({
                to: row.email,
                subject: row.subject,
                html: row.html
            });

            const sentAt = getVNTime();
            if (result.success) {
                db.run(`UPDATE email_queue SET status = 'sent', sent_at = ? WHERE id = ?`, [sentAt, row.id]);
            } else {
                db.run(`UPDATE email_queue SET status = 'error', error = ? WHERE id = ?`, [JSON.stringify(result.error), row.id]);
            }
        }
    });
}

// Chạy worker mỗi phút
setInterval(processEmailQueue, 60000);
// Chạy ngay lập tức một lần sau 5 giây khi khởi động
setTimeout(processEmailQueue, 5000);

// GET /api/admin: Xử lý polling & lấy dữ liệu cho admin panel
app.get('/api/admin', (req, res) => {
    const { action, sheet, phone } = req.query;

    if (action === 'check_payment') {
        // Polling thanh toán SePay - kiểm tra cả 2 trạng thái
        db.get(`
            SELECT orders.status 
            FROM orders 
            JOIN customers ON orders.customer_id = customers.id 
            WHERE customers.phone = ? 
            ORDER BY orders.id DESC LIMIT 1
        `, [phone], (err, row) => {
            if (err) return res.status(500).json({ status: 'error', message: err.message });
            // Kiểm tra cả 2 giá trị status có thể có
            if (row && (row.status === 'success' || row.status === 'Đã Thanh Toán')) {
                return res.json({ status: 'paid' });
            }
            res.json({ status: 'pending' });
        });
    } else if (action === 'getRows') {
        // Lấy dữ liệu cho Admin Board
        if (sheet === 'products') {
            db.all("SELECT * FROM products ORDER BY id DESC", (err, rows) => {
                const data = (rows || []).map(r => ({ row: r.id, cols: [r.name, r.price, r.description, r.stock_quantity] }));
                res.json({ success: true, data });
            });
        } else if (sheet === 'customers') {
            db.all(`
                SELECT c.*, o.product_id, o.amount, o.status, p.name as product_name
                FROM customers c
                LEFT JOIN orders o ON o.customer_id = c.id
                LEFT JOIN products p ON o.product_id = p.id
                ORDER BY c.id DESC
            `, (err, rows) => {
                const data = (rows || []).map(r => ({
                    row: r.id,
                    data: {
                        registration_date: r.registration_date,
                        name: r.name,
                        phone: r.phone || '',
                        email: r.email || '',
                        address: r.address || '',
                        size: r.size_preference || '',
                        product: r.product_name || (r.pain_points ? 'Khảo Sát Đợi' : ''),
                        amount: r.amount || ''
                    }
                }));
                res.json({ success: true, data });
            });
        } else if (sheet === 'orders') {
            db.all(`
                SELECT o.*, c.name as cname, c.email as cemail, c.phone as cphone, p.name as pname 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                LEFT JOIN products p ON o.product_id = p.id 
                ORDER BY o.id DESC
            `, (err, rows) => {
                if (err) {
                    console.error("Error fetching orders:", err);
                    return res.status(500).json({ error: "Lỗi tải đơn hàng" });
                }
                const data = (rows || []).map(r => ({
                    row: r.id,
                    data: {
                        purchase_date: r.purchase_date,
                        customer_name: r.cname || '',
                        phone: r.cphone || '',
                        email: r.cemail || '',
                        product: r.pname || 'LADY GRACE - Váy Thiết Kế',
                        amount: r.amount || 0,
                        status: r.status || 'pending',
                        order_code: 'MGD_' + r.id
                    }
                }));
                res.json({ success: true, data });
            });
        } else {
            res.json({ success: false, error: 'Unknown sheet' });
        }
    }
});

// POST /api/admin: Xử lý Thêm / Sửa / Xóa cho admin panel
app.post('/api/admin', (req, res) => {
    const { action, sheet, row, data } = req.body;

    if (action === 'create') {
        if (sheet === 'products') {
            db.run("INSERT INTO products (name, price, description, stock_quantity) VALUES (?, ?, ?, ?)", data, function (err) {
                if (err) return res.json({ success: false, error: err.message });
                res.json({ success: true, message: 'Thêm sản phẩm thành công!' });
            });
        } else if (sheet === 'customers') {
            db.run("INSERT INTO customers (registration_date, name, phone, email, address, size_preference) VALUES (?, ?, ?, ?, ?, ?)", [data[0], data[1], data[2], data[3], data[4], data[5]], function (err) {
                if (err) return res.json({ success: false, error: err.message });
                res.json({ success: true, message: 'Thêm khách hàng thành công!' });
            });
        } else if (sheet === 'orders') {
            db.run("INSERT INTO customers (registration_date, name, phone, email) VALUES (?, ?, ?, ?)", [data[0], data[1], data[2], data[3]], function(err) {
                const cid = this.lastID;
                const amt = parseFloat((data[5]||'').replace(/[^\d]/g, '')) || 0;
                db.run("INSERT INTO orders (customer_id, purchase_date, amount, status) VALUES (?, ?, ?, ?)", [cid, data[0], amt, data[6]], function(err) {
                    res.json({ success: true, message: 'Tạo đơn hàng thành công!' });
                });
            });
        }
    } else if (action === 'update') {
        if (sheet === 'products') {
            db.run("UPDATE products SET name=?, price=?, description=?, stock_quantity=? WHERE id=?", [...data, row], function (err) {
                res.json({ success: err ? false : true, error: err?.message });
            });
        } else if (sheet === 'customers') {
            db.run("UPDATE customers SET registration_date=?, name=?, phone=?, email=?, address=?, size_preference=? WHERE id=?", [data[0], data[1], data[2], data[3], data[4], data[5], row], function (err) {
                res.json({ success: err ? false : true, error: err?.message });
            });
        } else if (sheet === 'orders') {
            const amt = parseFloat((data[5]||'').replace(/[^\d]/g, '')) || 0;
            db.run("UPDATE orders SET purchase_date=?, amount=?, status=? WHERE id=?", [data[0], amt, data[6], row], function (err) {
                res.json({ success: err ? false : true, error: err?.message, message: 'Cập nhật đơn hàng thành công.' });
            });
        }
    } else if (action === 'delete') {
        db.run(`DELETE FROM ${sheet} WHERE id=?`, [row], function (err) {
            res.json({ success: err ? false : true, message: 'Đã xóa dữ liệu', error: err?.message });
        });
    }
});

// GET /api/admin/check_payment: Polling kiểm tra trạng thái thanh toán
app.get('/api/admin/check_payment', (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.json({ status: 'error', message: 'Missing phone' });

    db.get(`
        SELECT orders.id, orders.status 
        FROM orders 
        JOIN customers ON orders.customer_id = customers.id 
        WHERE customers.phone = ? 
        ORDER BY orders.id DESC LIMIT 1
    `, [phone], (err, row) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (row && (row.status === 'success' || row.status === 'Đã Thanh Toán')) {
            return res.json({ status: 'paid' });
        }
        res.json({ status: 'pending' });
    });
});

// POST /api/admin/mark_paid: Admin hoặc khách tự xác nhận đã thanh toán (manual override)
app.post('/api/admin/mark_paid', (req, res) => {
    const { phone, order_id } = req.body;
    
    db.get(`
        SELECT orders.id, customers.name, customers.email, customers.phone 
        FROM orders 
        JOIN customers ON orders.customer_id = customers.id 
        WHERE ${order_id ? 'orders.id = ?' : 'customers.phone = ?'} AND orders.status = 'pending'
        ORDER BY orders.id DESC LIMIT 1
    `, [order_id || phone], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row) return res.json({ success: false, message: 'Không tìm thấy đơn pending' });

        db.run(`UPDATE orders SET status = 'success' WHERE id = ?`, [row.id], function(updateErr) {
            if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });
            
            console.log(`[ManualPay] ✅ Đã mark paid cho unit ${row.phone || 'order#' + row.id}`);
            res.json({ success: true, message: 'Đã cập nhật trạng thái thanh toán thành công' });

            // Scenario B: Gửi email Xác nhận đơn hàng thành công
            if (row.email) {
                sendResendEmail({
                    to: row.email,
                    subject: 'Xác nhận: Thanh toán thành công! 🎉',
                    html: `
                        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                            <h2>Chào ${row.name},</h2>
                            <p>Chúc mừng! Giao dịch của bạn đã được xác nhận thành công.</p>
                            <p>Đơn hàng <strong>#${row.id}</strong> của bạn đã chuyển sang trạng thái <strong>Đã thanh toán</strong> và đang được chúng tôi chuẩn bị để giao cho bạn sớm nhất.</p>
                            <p>Cảm ơn bạn đã tin tưởng và lựa chọn LAMAI.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 0.9em; color: #777;">Trân trọng,<br>Đội ngũ LAMAI</p>
                        </div>
                    `
                });
            }
        });
    });
});

// POST /api/waitlist: Xử lý đăng ký khảo sát / form đợi từ khách
app.post('/api/waitlist', (req, res) => {
    const { name, email, phone, pain_points, priorities, size_preference } = req.body;
    db.run(`
        INSERT INTO customers (registration_date, name, email, phone, pain_points, priorities, size_preference) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [getVNTime(), name, email, phone, pain_points, priorities, size_preference], function (err) {
        if (err) {
            console.error('Error in /api/waitlist:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ message: 'Thông tin đăng ký khảo sát đã được ghi nhận. Hệ thống sẽ gửi chuỗi email chăm sóc đến bạn sớm nhất.' });

        const customerId = this.lastID;
        // Kích hoạt chuỗi email tự động (Welcome -> Nurture -> Sales)
        if (email) {
            const isTestMode = email.includes('+test');
            scheduleEmailSequence(customerId, email, name, isTestMode);
        }
    });
});

// POST /api/order: Xử lý đặt mua hàng từ khách
app.post('/api/order', (req, res) => {
    const { fullname, email, phone, address, size, product, price } = req.body;
    const amount = parseFloat((price || '').replace(/[^\d]/g, '')) || 595000;
    
    // Tạo record khách hàng
    db.run(`
        INSERT INTO customers (registration_date, name, email, phone, address, size_preference) 
        VALUES (?, ?, ?, ?, ?, ?)
    `, [getVNTime(), fullname, email, phone, address, size], function (err) {
        if (err) {
            console.error('Error creating customer in /api/order:', err);
            return res.status(500).json({ error: 'Lỗi ghi khách hàng.' });
        }
        const customerId = this.lastID;
        
        // Tìm ID của sản phẩm mặc định (để thêm vào order)
        db.get('SELECT id FROM products ORDER BY id DESC LIMIT 1', (err, productRow) => {
            const productId = productRow ? productRow.id : null; 
            
            // Tạo record đặt hàng
            db.run(`
                INSERT INTO orders (customer_id, product_id, purchase_date, amount, status, address, size) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [customerId, productId, getVNTime(), amount, 'pending', address, size], function (err) {
                if (err) {
                    console.error('Error creating order in /api/order:', err);
                    return res.status(500).json({ error: 'Lỗi ghi đơn hàng.' });
                }
                res.status(200).json({ message: 'Đơn hàng đã được ghi nhận.' });

                // Kích hoạt chuỗi email tự động (Email Sequence) thay vì chỉ gửi 1 mail đơn lẻ
                if (email) {
                    const isTestMode = email.includes('+test');
                    scheduleEmailSequence(customerId, email, fullname, isTestMode);
                }
            });
        });
    });
});

// GET /webhook/sepay: SePay có thể gọi GET để verify endpoint hoạt động
app.get('/webhook/sepay', (req, res) => {
    res.status(200).json({ success: true, message: 'SePay webhook endpoint is active' });
});

// GET /api/webhook-test: Test thuần tuý — gọi để simulate webhook và kiểm tra logic
app.get('/api/webhook-test', (req, res) => {
    const { phone, amount } = req.query;
    if (!phone) return res.json({ error: 'Missing phone param' });
    
    db.get(`
        SELECT orders.id, orders.amount, orders.status
        FROM orders 
        JOIN customers ON orders.customer_id = customers.id 
        WHERE customers.phone = ? AND orders.status = 'pending'
        ORDER BY orders.id DESC LIMIT 1
    `, [phone], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({ found: false, message: 'No pending order for ' + phone });
        
        db.run(`UPDATE orders SET status = 'success', amount = ? WHERE id = ?`,
            [parseInt(amount) || row.amount, row.id],
            function(e) {
                if (e) return res.status(500).json({ error: e.message });
                res.json({ success: true, orderId: row.id, phone, message: 'Order marked as paid (test)' });
            }
        );
    });
});

// POST /webhook/sepay: Nhận dữ liệu webhook từ SePay
app.post('/webhook/sepay', (req, res) => {
    const payload = req.body;
    console.log('[SePay Webhook] Payload nhận:', JSON.stringify(payload));

    let content = '';
    let transferAmount = 0;
    
    if (Array.isArray(payload) && payload.length > 0) {
        content = payload[0].content || payload[0].description || '';
        transferAmount = payload[0].transferAmount || payload[0].amount || 0;
    } else if (payload) {
        content = payload.content || payload.description || '';
        transferAmount = payload.transferAmount || payload.amount || 0;
    }

    console.log('[SePay Webhook] Nội dung:', content, '| Số tiền:', transferAmount);

    if (!content) {
        console.error('[SePay Webhook] Bỏ qua - không có nội dung.');
        return res.status(200).json({ success: false, message: 'No content' });
    }

    // Bóc tách SĐT từ nội dung: "THANH TOAN DON HANG 0123456789"
    const phoneMatch = content.match(/\d{9,11}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    if (!phone) {
        console.error('[SePay Webhook] Không tìm ra SĐT trong:', content);
        return res.status(200).json({ success: false, message: 'Phone not found' });
    }

    console.log('[SePay Webhook] Tìm kiếm đơn hàng cho SĐT:', phone);

    // Tìm đơn hàng hợp lệ đang "pending" của SĐT này
    db.get(`
        SELECT orders.id, orders.amount, customers.name, customers.email 
        FROM orders 
        JOIN customers ON orders.customer_id = customers.id 
        WHERE customers.phone = ? AND orders.status = 'pending'
        ORDER BY orders.id DESC LIMIT 1
    `, [phone], (err, row) => {
        if (err) {
            console.error('[SePay Webhook] Lỗi DB:', err.message);
            return res.status(500).json({ error: 'DB Error' });
        }

        if (!row) {
            console.log(`[SePay Webhook] Không tìm thấy đơn "pending" cho SĐT ${phone}`);
            return res.status(200).json({ success: true, message: 'No pending order found' });
        }

        console.log(`[SePay Webhook] Tìm thấy đơn hàng ID: ${row.id}, Số tiền đơn: ${row.amount}, Nhận được: ${transferAmount}`);

        // Cập nhật trạng thái và ghi lại số tiền thực tế nhận được
        db.run(`UPDATE orders SET status = 'success', amount = ? WHERE id = ?`, 
            [transferAmount > 0 ? transferAmount : row.amount, row.id], 
            function(updateErr) {
                if (updateErr) {
                    console.error('[SePay Webhook] Lỗi update:', updateErr.message);
                    return res.status(500).json({ error: 'DB Update Error' });
                }
                console.log(`[SePay Webhook] ✅ Cập nhật THÀNH CÔNG đơn #${row.id} cho SĐT: ${phone}`);
                res.status(200).json({ success: true, message: 'Order marked as paid' });

                // Scenario B: Gửi email Xác nhận đơn hàng thành công qua Webhook
                if (row.email) {
                    sendResendEmail({
                        to: row.email,
                        subject: 'Xác nhận: Thanh toán thành công! 🎉',
                        html: `
                            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                                <h2>Chào ${row.name},</h2>
                                <p>LAMAI xin xác nhận đã nhận được thanh toán cho đơn hàng <strong>#${row.id}</strong> của bạn.</p>
                                <p>Đơn hàng sẽ được xử lý và vận chuyển đến bạn trong thời gian sớm nhất.</p>
                                <p>Cảm ơn bạn đã ủng hộ chúng tôi!</p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 0.9em; color: #777;">Trân trọng,<br>Đội ngũ LAMAI</p>
                            </div>
                        `
                    });
                }
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`👉 Mở trình duyệt và truy cập: http://localhost:${PORT}`);
    console.log(`👉 Mở trang quản trị tại: http://localhost:${PORT}/admin/index.html`);
    console.log(`======================================================\n`);
});
