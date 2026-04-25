import paramiko

def check_sqlite3_version():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("sqlite3 --version")
        print(stdout.read().decode())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_sqlite3_version()
