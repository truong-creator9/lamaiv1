import paramiko

def install_sqlite3():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        print("Installing sqlite3...")
        stdin, stdout, stderr = client.exec_command("apt-get update && apt-get install -y sqlite3")
        print(stdout.read().decode())
        print(stderr.read().decode())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    install_sqlite3()
