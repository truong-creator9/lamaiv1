import paramiko

def check_sse_content():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        # Capture the first 500 bytes of the SSE stream
        cmd = "curl -N -s https://mcp.lamai.vn/sse | head -c 500"
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_sse_content()
