const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('brain.db');

db.serialize(() => {
    // Add columns to customers
    const cCols = ['email', 'address', 'size_preference', 'pain_points', 'priorities'];
    cCols.forEach(col => {
        db.run(`ALTER TABLE customers ADD COLUMN ${col} TEXT`, (err) => {
            if (err) console.log(`Column ${col} might already exist in customers`);
            else console.log(`Added ${col} to customers`);
        });
    });

    // Add columns to orders
    const oCols = ['address', 'size'];
    oCols.forEach(col => {
        db.run(`ALTER TABLE orders ADD COLUMN ${col} TEXT`, (err) => {
            if (err) console.log(`Column ${col} might already exist in orders`);
            else console.log(`Added ${col} to orders`);
        });
    });
});

db.close(() => {
    console.log("Migration finished.");
});
