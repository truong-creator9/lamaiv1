# 🚀 Hướng dẫn Triển khai LAMAI lên VPS Linux

Tài liệu này hướng dẫn Nàng các bước để đưa Website LAMAI lên chạy trên VPS (Ubuntu).

---

## 1. Chuẩn bị môi trường (Cài đặt 1 lần)

Đăng nhập vào VPS qua SSH và chạy các lệnh sau:

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js v20
curl -lsFn https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2 để chạy ngầm
sudo npm install pm2 -g
```

---

## 2. Triển khai Code

```bash
# Clone code từ GitHub
git clone [URL_REO_CUA_NANG]
cd lamaiv1

# Cài đặt thư viện
npm install

# Tạo file cấu hình bảo mật
cp .env.example .env
nano .env  # Sau đó điền RESEND_API_KEY của Nàng vào
```

---

## 3. Khởi chạy & Vận hành

Sử dụng PM2 để website luôn hoạt động:

```bash
# Chạy ứng dụng
pm2 start ecosystem.config.js

# Lưu cấu hình để tự khởi động khi VPS reboot
pm2 save
pm2 startup
```

---

## 4. Quản lý Logs (Xem lỗi nếu có)

```bash
# Xem log trực tiếp
pm2 logs lamai-app

# Xem trạng thái
pm2 status
```

---

## 5. Cấu hình Nginx & SSL (Để dùng tên miền lamai.vn)

Nàng có thể dùng **Certbot** để cài SSL miễn phí:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d lamai.vn -d www.lamai.vn
```

---

> [!IMPORTANT]
> **Bảo mật**: Không bao giờ chia sẻ file `.env` cho bất kỳ ai. File này đã được cấu hình để không bị đẩy lên GitHub.
