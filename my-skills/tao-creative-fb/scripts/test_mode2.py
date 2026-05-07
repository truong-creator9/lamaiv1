import os
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
from gen_image import generate_image
from gen_caption import generate_text, get_lamai_system_prompt

def test_mode_2():
    print("--- Bat dau TEST Mode 2: CREATIVE ADS GENERATION ---\n")
    
    # Tao thu muc output neu chua co (Su dung duong dan tuyet doi)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(current_dir), 'output')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"INFO: Da tao thu muc {output_dir}")

    angles = [
        {"type": "Pain Point", "desc": "Tap trung vao noi dau che bung mo sau sinh cho quy co Smart Investor."},
        {"type": "Solution", "desc": "Tap trung vao tinh da nang 3-in-1: Di lam - Di tiec - Di cho cho nang Aspiring Girl."},
        {"type": "Social Proof/Status", "desc": "Tap trung vao cam giac sang chanh, kieu ky nhu mot tieu thu thuc thu."}
    ]
    
    for i, angle in enumerate(angles, 1):
        print(f"--- BO CREATIVE #{i} ({angle['type']}) ---")
        
        # 1. Gen Ad Copy
        sys_prompt = get_lamai_system_prompt(mode="ads")
        user_prompt = f"Viet Ad Copy cho goc do: {angle['desc']}. San pham la vay thiet ke cao cap cua LAMAI."
        copy = generate_text(sys_prompt, user_prompt)
        
        # Luu copy vao file
        with open(f"{output_dir}/set{i}.txt", "w", encoding="utf-8") as f:
            f.write(copy)
        print(f"SUCCESS: Da luu Ad Copy vao {output_dir}/set{i}.txt")
        
        # 2. Gen Image Prompt & Image
        image_sys_prompt = "Dua vao Ad Copy nay, hay viet 1 prompt ngan gon (tieng Anh) de DALL-E 3 tao ra mot buc anh thoi trang cao cap phu hop. Chi tra ve prompt, khong giai thich."
        img_prompt = generate_text(image_sys_prompt, copy)
        
        save_path = f"{output_dir}/set{i}.png"
        img_result = generate_image(img_prompt, quality="hd", save_path=save_path)
        
        if img_result:
            print(f"SUCCESS: Da luu anh vao {save_path}")
        
        print("-" * 50 + "\n")

    print(f"DONE! HOAN TAT! Nang hay kiem tra thu muc {os.path.abspath(output_dir)} nhe!")

if __name__ == "__main__":
    test_mode_2()
