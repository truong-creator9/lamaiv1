import sqlite3

conn = sqlite3.connect('brain.db')
cursor = conn.cursor()
cursor.execute("SELECT title, content FROM brand_voice;")
rows = cursor.fetchall()

with open('dump.txt', 'w', encoding='utf-8') as f:
    for row in rows:
        f.write(f"TITLE: {row[0]}\nCONTENT:\n{row[1]}\n---\n")

conn.close()
