import os
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from gen_image import generate_image
from gen_caption import generate_text, get_lamai_system_prompt

def exec_organic_ai():
    print("--- DANG GEN FULL CONTENT CHO TOPIC: AI AGENT (Y TUONG 3) ---")
    
    output_dir = "../output/organic"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    selected_idea = {
        "title": "Đặc quyền của quý cô thông thái",
        "angle": "Nang chon lam viec cham chi, hay lam viec thong minh? Khang dinh dung AI Agent la mot 'dac quyen' cua nhung phu nu lam chu cong nghe. Chia se kinh nghiem thuc te khi AI thay the cac cong viec lap di lap lai, de nang tap trung vao nhung quyet dinh mang tinh chien luoc."
    }

    # 1. Gen Caption
    sys_p = get_lamai_system_prompt(mode="organic")
    user_p = f"Viet caption cho bai dang Page. Tieu de: {selected_idea['title']}. Noi dung: {selected_idea['angle']}. Phong cach: Tam tinh, truyen cam hung, thanh lich."
    caption = generate_text(sys_p, user_p)
    
    with open(f"{output_dir}/ai_agent_caption.txt", "w", encoding="utf-8") as f:
        f.write(caption)
    print(f"SUCCESS: Da luu Caption vao {output_dir}/ai_agent_caption.txt")

    # 2. Gen Image
    # Mo ta anh: Mot quy co sang chanh mac vay lua, ngoi trong phong lam viec art deco, tay cam ipad, bối cảnh hitech nhưng nghệ thuật.
    image_sys_prompt = "Viet 1 prompt tieng Anh cho DALL-E 3: Mot quy co thanh lich, sang trong dang ngoi trong mot khong gian lam viec phong cach Art Deco cao cap. Co ay dang su dung mot chiec tablet hien dai, anh sang chieu qua cua so lon. Bau khong khi tri tue, quyen luc nhung van nu tinh va kieu sa. Phong cach Vogue thoi trang. Chỉ tra ve prompt."
    img_prompt = generate_text(image_sys_prompt, caption)
    
    save_path = f"{output_dir}/ai_agent_image.png"
    generate_image(img_prompt, quality="standard", save_path=save_path)
    print(f"SUCCESS: Da luu Anh vao {save_path}")

    print(f"\n✨ PREVIEW CHO NANG:\n")
    print(f"✍️ CAPTION:\n{caption}\n")
    print(f"🖼 ANH DA LUU TAI: {os.path.abspath(save_path)}")

if __name__ == "__main__":
    exec_organic_ai()
