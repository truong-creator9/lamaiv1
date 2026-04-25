import paramiko

def final_verify():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("curl -s http://localhost:3001/")
        print(f"Local check: {stdout.read().decode()}")
        
        stdin, stdout, stderr = client.exec_command("curl -s -i https://mcp.lamai.vn/sse --max-time 2")
        print(f"Public check (headers):\n{stdout.read().decode()}")
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    final_verify()
