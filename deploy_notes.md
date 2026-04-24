# Hướng dẫn Deploy lên VPS Ubuntu

Dự án này sử dụng Node.js (Express) và SQLite.

## 1. Các biến môi trường (.env) cần thiết
Copy file `.env.example` thành `.env` trên VPS và điền các giá trị:
- `PORT`: Cổng server sẽ lắng nghe (Mặc định: 3000)
- `RESEND_API_KEY`: API Key từ Resend để gửi email
- `RESEND_SENDER`: Email gửi đi (ví dụ: `LAMAI <onboarding@resend.dev>`)
- `NODE_ENV`: Đặt là `production`

## 2. Cấu hình VPS
1. Cài đặt Node.js (v18+) và npm.
2. Cài đặt PM2 để quản lý process: `npm install -g pm2`

## 3. Lệnh chạy server
Tại thư mục gốc của dự án trên VPS:
```bash
# Cài đặt dependencies
npm install

# Khởi chạy server bằng PM2 (Sử dụng file ecosystem.config.js đã có)
pm2 start ecosystem.config.js

# Hoặc chạy trực tiếp bằng Node
npm start
```

## 4. Thông tin kết nối
- **Cổng đang lắng nghe:** 3000 (hoặc theo cấu hình PORT trong .env)
- **Admin Panel:** `http://<IP_VPS>:<PORT>/admin/index.html`
- **Database:** SQLite (`brain.db`) - Tự động khởi tạo nếu chưa có.

## 5. Lưu ý quan trọng
- Đã thêm `brain.db` vào `.gitignore` để tránh ghi đè dữ liệu local lên server. 
- Khi deploy lần đầu, hãy đảm bảo copy file `brain.db` thủ công nếu bạn muốn giữ dữ liệu hiện tại, hoặc để server tự khởi tạo bảng mới.
