import sqlite3
import json

def read_brand_voice():
    conn = sqlite3.connect('my-brain/brain.db')
    cursor = conn.cursor()
    
    # Get table names first to be sure
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    
    if ('brand_voice',) in tables:
        cursor.execute("SELECT * FROM brand_voice")
        rows = cursor.fetchall()
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        result = []
        for row in rows:
            result.append(dict(zip(column_names, row)))
            
        with open('my-brain/scratch/db_dump.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print("Data dumped to my-brain/scratch/db_dump.json")
    else:
        print("Table 'brand_voice' not found.")
        
    conn.close()

if __name__ == "__main__":
    read_brand_voice()
