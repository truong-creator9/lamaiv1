import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

def check_goclaw_logs():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("docker logs --tail 500 agent-goclaw-1")
        logs = stdout.read().decode('utf-8', errors='replace')
        lines = logs.split('\n')
        print("--- GOCLAW 500 ERRORS ---")
        for line in lines:
            if '500' in line:
                print(line)
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_goclaw_logs()
