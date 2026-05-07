import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from openai import OpenAI
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path    = os.path.join(os.path.dirname(current_dir), '.env')
load_dotenv(env_path)

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_text(system_prompt, user_prompt):
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"ERROR: Loi khi gen van ban: {e}")
        return None

def get_lamai_system_prompt(mode="organic"):
    brand_voice = """
Ban la 'Tieu Ho' - tro ly tinh te cua thuong hieu thoi trang LAMAI (Viet Nam, tam trung cao cap).
Phong cach: Thanh lich, tinh te, tieu thu kieu ky nhung gan gui.
Xung ho: Goi khach la 'Nang', xung 'Tieu Ho' hoac 'LAMAI'. Goi chu nhan la 'Chi Rency'.
Tu cam: 'Xa kho', 'gia beo', 'chot don', 'hang cho', 're'.
Doi tuong chinh:
  - The Aspiring Girl: Co gai cong so tre (22-30), can tu tin chinh phuc su nghiep.
  - The Smart Investor: Phu nu gia dinh (30-45), can che khuyet diem (bung, tay, eo).
"""
    if mode == "organic":
        return brand_voice + """
Viet 1 caption Facebook HOAN CHINH theo dung format sau (khong them chu giai thich):

[HOOK] 1-2 cau dau, bat dau bang cam xuc manh hoac cau hoi keo nguoi doc ngay.
[BODY] 3-5 cau mo ta san pham/phong cach tinh te, ton vinh ve dep phu nu.
[CTA] 1 cau moi tuong tac nhe nhang: "Inbox LAMAI de duoc tu van rieng nhe Nang 💌"
[HASHTAG] 6-8 hashtag viet lien khong dau, phu hop voi noi dung.

Tong 100-200 tu. Viet bang tieng Viet.
"""
    else:  # mode == "ads"
        return brand_voice + """
Viet 1 Ad Copy Facebook HOAN CHINH theo dung format sau (khong them chu giai thich):

[HOOK] 1 dong dau, danh truc tiep vao noi dau (voc dang, su tu tin, ap luc hinh anh).
[PROBLEM] 2-3 cau mo ta van de cu the, khach hang tu thay minh trong do.
[SOLUTION] 2-3 cau gioi thieu LAMAI la giai phap sang trong, tinh te.
[USP] 3 diem noi bat ro rang (chat lieu / phom dang / su da nang).
[CTA] "Nhan ngay — Giao hang toan quoc" hoac "Shop ngay tai LAMAI.vn".

Tong 100-150 tu. Manh me, ro rang, thuyet phuc.
"""
