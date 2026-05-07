import os
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from gen_image import generate_image
from gen_caption import generate_text, get_lamai_system_prompt
from post_facebook import post_to_facebook

def test_mode_1():
    print("--- Bat dau TEST Mode 1: CONTENT ORGANIC (DRY RUN) ---\n")
    
    # Tao thu muc output neu chua co (Su dung duong dan tuyet doi)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(current_dir), 'output')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # BUOC A: Gen 3 y tuong
    print("STEP A: Dang gen 3 y tuong noi dung...")
    sys_prompt = "Ban la chuyen gia noi dung cho LAMAI. Hay de xuat 3 y tuong bai dang Page (moi y gom: Tieu de + Angle ngan). Tra ve dang danh sach 1, 2, 3."
    user_prompt = "De xuat noi dung cho tuan moi de thu hut cac 'Nang thơ cong so'."
    ideas = generate_text(sys_prompt, user_prompt)
    print(f"Y tuong de xuat:\n{ideas}\n")
    
    # BUOC B: Chon 1 y tuong (Mo phong user chon y 1)
    print("STEP B: Mo phong Nang chon y tuong #1...")
    selected_angle = "Bai dang ve vay thiet ke lua cao cap, ton vinh ve dep thanh lich cua quy co cong so hien dai."
    
    # Gen Full Content
    sys_p_caption = get_lamai_system_prompt(mode="organic")
    caption = generate_text(sys_p_caption, f"Viet caption cho: {selected_angle}")
    
    # Luu caption
    with open(f"{output_dir}/organic_caption.txt", "w", encoding="utf-8") as f:
        f.write(caption)
    print(f"INFO: Caption da luu vao {output_dir}/organic_caption.txt")
    
    image_sys_prompt = "Dua vao caption nay, hay viet 1 prompt ngan gon (tieng Anh) de DALL-E 3 tao ra mot buc anh thoi trang cao cap sang chanh. Chỉ tra ve prompt."
    img_prompt = generate_text(image_sys_prompt, caption)
    
    save_path = f"{output_dir}/organic_image.png"
    img_result = generate_image(img_prompt, quality="standard", save_path=save_path)
    
    if img_result:
        print(f"INFO: Anh da luu vao {save_path}")
    
    # BUOC C & D: Post Facebook (DRY RUN)
    print("STEP C & D: Dang chay thu dang bai (DRY RUN)...")
    post_to_facebook(save_path, caption)
    
    print(f"DONE! Hoan tat test Mode 1. Kiem tra {output_dir}")

if __name__ == "__main__":
    test_mode_1()
