import paramiko

def restart_goclaw():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        print("Restarting GoClaw...")
        stdin, stdout, stderr = client.exec_command("docker restart agent-goclaw-1")
        print(stdout.read().decode())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    restart_goclaw()
