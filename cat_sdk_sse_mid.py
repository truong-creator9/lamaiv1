import paramiko

def cat_sdk_sse_mid():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("103.97.127.35", port=2018, username="root", password="T3oyy2CFDL")
        stdin, stdout, stderr = client.exec_command("sed -n '50,150p' /var/www/lamai-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/sse.js")
        print(stdout.read().decode())
        client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    cat_sdk_sse_mid()
