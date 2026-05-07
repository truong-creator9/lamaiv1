import os
import subprocess
import sys

def main():
    skill_dir = os.path.dirname(os.path.abspath(__file__))
    scripts_dir = os.path.join(skill_dir, "scripts")
    lib_dir = os.path.join(scripts_dir, "lib")
    
    print("--- FIXING LOCAL ENVIRONMENT (WINDOWS) ---")
    
    # 1. Check for Linux binaries in lib
    has_linux_bins = False
    if os.path.exists(lib_dir):
        for f in os.listdir(lib_dir):
            if f.endswith(".so"):
                has_linux_bins = True
                break
    
    if has_linux_bins:
        print("[!] Found Linux binary files (.so) in the 'lib' folder.")
        print("[!] These files were synced from the VPS but will NOT work on Windows.")
        
        # We don't delete them (to keep "sync"), but we should tell Python to ignore them
        # or install Windows equivalents.
    
    # 2. Create virtual environment
    venv_dir = os.path.join(skill_dir, "venv")
    if not os.path.exists(venv_dir):
        print(f"Creating virtual environment in {venv_dir}...")
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
    
    # 3. Install dependencies
    pip_exe = os.path.join(venv_dir, "Scripts", "pip.exe") if os.name == "nt" else os.path.join(venv_dir, "bin", "pip")
    
    dependencies = [
        "openai",
        "python-dotenv",
        "requests",
        "pydantic",
        "tqdm"
    ]
    
    print(f"Installing dependencies for Windows: {', '.join(dependencies)}...")
    subprocess.run([pip_exe, "install"] + dependencies, check=True)
    
    print("\n--- SUCCESS ---")
    print("Hệ thống đã được 'chuẩn hóa' cho Windows.")
    print("Để chạy skill locally mà không bị lỗi Python, hãy dùng môi trường ảo này.")
    print(f"Lệnh chạy test: {os.path.join(venv_dir, 'Scripts', 'python.exe')} scripts/main.py --mode prepare")

if __name__ == "__main__":
    main()
