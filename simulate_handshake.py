import paramiko

def simulate_handshake():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        
        # Step 1: Connect to SSE and get session ID
        # We use curl with a timeout to capture the first few lines
        cmd = "curl -N -s https://mcp.lamai.vn/sse | grep -m 1 'sessionId=' | sed 's/.*sessionId=\\([^&\\n]*\\).*/\\1/'"
        stdin, stdout, stderr = client.exec_command(cmd)
        session_id = stdout.read().decode().strip()
        print(f"Captured Session ID: {session_id}")
        
        if session_id:
            # Step 2: Immediately POST to /messages with that session ID
            # This simulates the race condition
            post_cmd = f"curl -X POST 'https://mcp.lamai.vn/messages?sessionId={session_id}' -H 'Content-Type: application/json' -d '{{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"list_tools\",\"params\":{{}}}}'"
            stdin, stdout, stderr = client.exec_command(post_cmd)
            print(f"POST Response: {stdout.read().decode()}")
            
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    simulate_handshake()
