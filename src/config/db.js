const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "0108",
    database: process.env.DB_NAME || "cafe_db"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed");
        return;
    }
    console.log("MySQL Connected");
});

module.exports = db;