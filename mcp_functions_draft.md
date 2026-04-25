# 🛠 MCP Functions Draft - LAMAI AI Agent (Final Version)

Dưới đây là 4 "cánh tay" thực thi bạn đã chọn để triển khai cho MCP Server.

---

### 1. `get_business_summary`
- **Tác dụng:** Báo cáo nhanh tình hình kinh doanh (Tổng đơn, đơn thành công, doanh thu, khách mới).
- **Ví dụ Telegram:** 
    - "Hôm nay bán được bao nhiêu đơn rồi?"
    - "Báo cáo doanh thu 24h qua."
    - "Tình hình kinh doanh tuần này thế nào?"
- **Độ ưu tiên:** 5/5

### 2. `search_customer_profile`
- **Tác dụng:** Tra cứu hồ sơ chi tiết của khách hàng (Size, Pain points, lịch sử mua hàng).
- **Ví dụ Telegram:** 
    - "Check thông tin khách 098xxxxxxx."
    - "Chị Lan 0978646565 hay mặc size gì và thích phong cách nào?"
    - "Khách này đã mua những gì của shop mình rồi?"
- **Độ ưu tiên:** 5/5

### 3. `manage_order_status`
- **Tác dụng:** Cập nhật trạng thái đơn hàng (Thành công, Hủy, Đã thanh toán...).
- **Ví dụ Telegram:** 
    - "Đánh dấu đơn #10 là thành công giúp mình."
    - "Sửa trạng thái đơn của khách 090xxxxxxx thành Đã thanh toán."
    - "Hủy đơn hàng mới nhất của chị Mai."
- **Độ ưu tiên:** 4/5

### 4. `update_product_inventory`
- **Tác dụng:** Điều chỉnh giá hoặc số lượng tồn kho sản phẩm.
- **Ví dụ Telegram:** 
    - "Chỉnh tồn kho váy LADY GRACE lên 50 cái."
    - "Hết hàng sản phẩm id 2 rồi, chỉnh tồn kho về 0."
    - "Giảm giá sản phẩm id 1 xuống còn 499,000đ."
- **Độ ưu tiên:** 4/5
