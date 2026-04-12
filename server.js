const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'brain.db');

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
    }
});

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
        SELECT orders.status 
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
        res.status(200).json({ message: 'Thông tin đăng ký khảo sát đã được ghi nhận vào hệ thống.' });
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
        SELECT orders.id, orders.amount 
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
                return res.status(200).json({ success: true, message: 'Order marked as paid' });
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
