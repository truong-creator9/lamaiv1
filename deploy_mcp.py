import paramiko
import os
import sys

# VPS Connection Details
HOST = "103.97.127.35"
PORT = 2018
USER = "root"
PASSWORD = "T3oyy2CFDL"

# Paths
REMOTE_PROJECT_DIR = "/var/www/lamai-mcp"
LOCAL_SRC_PATH = r"d:\Claude 21 ngay\Ngay 2 - 02.04.2026 V2\mcp-server\src\index.ts"
LOCAL_PACKAGE_PATH = r"d:\Claude 21 ngay\Ngay 2 - 02.04.2026 V2\mcp-server\package.json"
LOCAL_TSCONFIG_PATH = r"d:\Claude 21 ngay\Ngay 2 - 02.04.2026 V2\mcp-server\tsconfig.json"

def deploy():
    print(f"Starting deployment to {HOST}:{PORT}...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, port=PORT, username=USER, password=PASSWORD)
        print("OK: Connected to VPS.")

        sftp = client.open_sftp()
        
        # 1. Upload files
        print("UPLOADING: Uploading files...")
        sftp.put(LOCAL_SRC_PATH, f"{REMOTE_PROJECT_DIR}/src/index.ts")
        sftp.put(LOCAL_PACKAGE_PATH, f"{REMOTE_PROJECT_DIR}/package.json")
        sftp.put(LOCAL_TSCONFIG_PATH, f"{REMOTE_PROJECT_DIR}/tsconfig.json")
        sftp.close()
        print("OK: Files uploaded.")

        # 2. Build and Restart
        print("BUILDING: Building and restarting service...")
        commands = [
            f"cd {REMOTE_PROJECT_DIR} && npm install",
            f"cd {REMOTE_PROJECT_DIR} && npm run build",
            "pm2 restart lamai-mcp || pm2 start dist/index.js --name lamai-mcp",
            "pm2 save"
        ]
        
        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                print(f"ERROR: Command failed with status {exit_status}")
                if out: print(f"STDOUT: {out}")
                if err: print(f"STDERR: {err}")
            else:
                print(f"OK: Success")
                if out: print(f"STDOUT: {out}")

        # 3. Final Health Check
        print("VERIFYING: Running final health check...")
        stdin, stdout, stderr = client.exec_command("curl -s http://localhost:3001/")
        print(f"Response: {stdout.read().decode().strip()}")

        client.close()
        print("\nDeployment complete! Please ask the user to test on Telegram.")

    except Exception as e:
        print(f"ERROR: Deployment failed: {e}")

if __name__ == "__main__":
    deploy()
