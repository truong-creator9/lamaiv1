# 📋 Danh sách Kiểm tra Triển khai VPS (Deploy Checklist) - LAMAI

Tài liệu này tổng hợp kết quả rà soát dự án và hướng dẫn chi tiết các bước để đưa Website LAMAI lên VPS Linux vào ngày mai.

---

## 1. 🛠 Phân tích Công nghệ & Framework
Dự án của Nàng đang sử dụng các công nghệ sau:
- **Ngôn ngữ chính**: JavaScript (Node.js). Khuyên dùng phiên bản **Node.js v20 hoặc v22 (LTS)** trên VPS.
- **Backend Framework**: Express.js (v5.2.1).
- **Cơ sở dữ liệu**: SQLite3 (File `brain.db`).
- **Frontend**: HTML5/CSS3 (Tailwind CSS via CDN) và Vanilla JavaScript.
- **Email Service**: Resend SDK.

**Đánh giá**: Cấu trúc này rất nhẹ và phù hợp để chạy trên các gói VPS nhỏ (như 1 vCPU, 1GB RAM) của DigitalOcean, Vultr hoặc Linode.

---

## 2. 🛡 Rà soát Bảo mật (Secrets Audit)
Trong quá trình kiểm tra, tôi phát hiện một số thông tin nhạy cảm sau cần được xử lý trước khi chạy production:

1. **Resend API Key**: Đang nằm trong file `resend_config.txt`. 
   - *Rủi ro*: Dễ bị lộ nếu đẩy lên GitHub công khai.
   - *Giải pháp*: Chuyển sang sử dụng biến môi trường `.env`.
2. **Google Sheet URL**: Nằm tại dòng 940 file `index.html`. 
   - *Đánh giá*: Chấp nhận được nếu đây là dữ liệu công cộng, nhưng nên hạn chế quyền ghi của Link này chỉ dành cho App Script.
3. **Sender Email**: Đang dùng `onboarding@resend.dev`.
   - *Yêu cầu*: Cần thay bằng `info@lamai.vn` (hoặc email tên miền của Nàng) sau khi đã Verify Domain trên Resend để tránh mail bị vào Spam.

---

## 3. 📂 Các file cần tạo thêm / Chỉnh sửa
Để chạy ổn định trên VPS, Nàng nên tạo thêm các file sau:

- **`.env`**: Dùng để lưu các biến bí mật.
- **`ecosystem.config.js`**: File cấu hình cho PM2 để tự động khởi động lại App nếu server bị crash hoặc restart.
- **`.gitignore`**: Đảm bảo đã chặn file `resend_config.txt` và `node_modules`.

---

## 4. 🚀 Quy trình Triển khai chi tiết (Ubuntu + PM2)

### Bước 1: Cấu hình DNS (Trỏ tên miền về VPS)
Vì Nàng đang trỏ về Render, Nàng cần vào trang quản lý Tên miền (ví dụ: Cloudflare, PA Việt Nam, Mắt Bão...) và thực hiện:
1. Tìm bản ghi **Loại A (A Record)**.
2. Thay đổi giá trị IP cũ (của Render) thành **Địa chỉ IP của VPS mới**.
3. Lưu lại (Có thể mất từ 5-30 phút để cập nhật hoàn toàn).

### Bước 2: Cài đặt môi trường trên VPS Ubuntu
Đăng nhập vào VPS qua SSH và chạy các lệnh sau:
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js (dùng NVM cho linh hoạt)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# Cài đặt PM2 (Quản lý tiến trình)
npm install pm2 -g
```

### Bước 3: Đưa Code lên và Chạy ứng dụng
```bash
# Clone code từ GitHub
git clone https://github.com/truong-creator9/lamaiv1.git
cd lamaiv1

# Cài đặt thư viện
npm install

# Khởi chạy bằng PM2
pm2 start server.js --name "lamai-app"
pm2 save
pm2 startup
```

### Bước 4: Cấu hình Nginx (Reverse Proxy) & SSL
Để truy cập được qua `https://www.lamai.vn` thay vì `IP:3000`:
1. Cài đặt Nginx: `sudo apt install nginx -y`
2. Tạo file cấu hình: `sudo nano /etc/nginx/sites-available/lamai`
   - Chèn cấu hình ánh xạ cổng 80 về 3000.
3. Cài đặt SSL miễn phí (Certbot):
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d lamai.vn -d www.lamai.vn
   ```

---

> [!IMPORTANT]
> **Lưu ý về SQLite**: File `brain.db` sẽ lưu dữ liệu ngay trên đĩa cứng của VPS. Nàng nhớ thực hiện backup file này định kỳ để tránh mất dữ liệu khách hàng.

> [!TIP]
> **Gợi ý**: Tôi có thể giúp Nàng tạo file `ecosystem.config.js` và hướng dẫn cách sửa `server.js` để đọc biến `.env` ngay bây giờ nếu Nàng muốn.
