import paramiko

HOST = '103.97.127.35'
PORT = 2018
USER = 'root'
PASS = 'T3oyy2CFDL'

def run(cmd, timeout=30):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    _, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'ignore')
    err = stderr.read().decode('utf-8', 'ignore')
    c.close()
    return out + err

print("\n=== RUNNING MAIN.PY IDEAS MODE ===")
out = run("docker exec agent-goclaw-1 python3 /app/data/skills-store/tao-creative-fb/7/scripts/main.py --mode ideas --topic 'Vay lamai xinh'")
print(out.encode('ascii', 'backslashreplace').decode('ascii'))
