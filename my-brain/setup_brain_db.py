import sqlite3
import os

def create_and_seed_db():
    print("Đang khởi tạo database...")
    # Kết nối tới database SQLite (file này sẽ tự được tạo nếu chưa tồn tại)
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()

    # Tạo bảng knowledge
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Tạo bảng business
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS business (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Tạo bảng brand_voice
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS brand_voice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Dữ liệu mẫu cho knowledge
    knowledge_data = [
        ('Sức mạnh của thói quen', 'Những thói quen nhỏ lặp đi lặp lại mỗi ngày sẽ tạo ra một kết quả lớn lao. Mọi thứ bắt đầu từ hành động nhỏ nhất.'),
        ('Nguyên lý 80/20', '80% kết quả đạt được thường đến từ 20% nỗ lực quan trọng nhất. Hãy tập trung vào những việc thực sự tạo ra giá trị.')
    ]

    # Dữ liệu mẫu cho business
    business_data = [
        ('Chân dung khách hàng', 'Phụ nữ từ 22-35 tuổi, yêu thích thời trang sang trọng, có việc làm ổn định và thường xuyên theo dõi xu hướng trên mạng xã hội.'),
        ('Sản phẩm chiến lược', 'Váy dự tiệc cao cấp, chất liệu đứng dáng sang trọng, giúp che khuyết điểm và tôn lên vẻ đẹp quyến rũ.')
    ]

    # Dữ liệu mẫu cho brand_voice
    brand_voice_data = [
        ('Tone giọng thân thiện', 'Luôn dùng xưng hô gần gũi, xưng "chân thành", "tâm huyết", tạo cảm giác như một người bạn thân thiết tư vấn cho khách.'),
        ('Phong cách chuyên nghiệp', 'Tuyệt đối không bắt lỗi khách hàng. Nhắn tin rõ ràng, rành mạch, đi thẳng vào trọng tâm quyền lợi của người mua.')
    ]

    # Thêm dữ liệu (kiểm tra trước để tránh thêm trùng nếu đã chạy rồi)
    cursor.execute("SELECT COUNT(*) FROM knowledge")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO knowledge (title, content) VALUES (?, ?)', knowledge_data)
        
    cursor.execute("SELECT COUNT(*) FROM business")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO business (title, content) VALUES (?, ?)', business_data)

    cursor.execute("SELECT COUNT(*) FROM brand_voice")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO brand_voice (title, content) VALUES (?, ?)', brand_voice_data)

    # Lưu tay và đóng kết nối
    conn.commit()
    conn.close()
    print("Đã tạo thành công cơ sở dữ liệu 'brain.db' và thêm 2 dòng dữ liệu mẫu vào cả 3 bảng!")

if __name__ == '__main__':
    create_and_seed_db()
