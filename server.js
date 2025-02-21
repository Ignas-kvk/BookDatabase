const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // JSON support
app.use("/images", express.static(path.join(__dirname, "public/images"))); // Serve images

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Change if needed
  password: "", // Change if needed
  database: "book",
  charset: "utf8mb4", // Supports Lithuanian characters
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL Database");
});

// 📌 Get all books with genre and cover image
app.get("/books", (req, res) => {
  const query = `
    SELECT book.id, book.title, book.author, genre.name AS genre, 
           book.published_date, book.availability, book.image_url
    FROM book 
    JOIN genre ON book.genre = genre.id
    LIMIT 20;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching books:", err.sqlMessage || err);
      return res.status(500).json({ error: err.sqlMessage || "Database error" });
    }

    // Append full image URL for each book
    results = results.map(book => ({
      ...book,
      image_url: book.image_url ? `http://localhost:${PORT}/images/${book.image_url}` : null,
    }));

    res.json(results);
  });
});


// 📌 Get all genres
app.get("/genres", (req, res) => {
  db.query("SELECT * FROM genre", (err, results) => {
    if (err) {
      console.error("❌ Error fetching genres:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// 📌 Get all users
app.get("/users", (req, res) => {
  db.query("SELECT id, email, name FROM user", (err, results) => {
    if (err) {
      console.error("❌ Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// 📌 Borrow a book
app.post("/borrow", (req, res) => {
  const { user_id, book_id } = req.body;
  const borrowDate = new Date().toISOString().split("T")[0]; // Current date

  const query = `
    INSERT INTO borrowing (user_id, book_id, borrow_date) 
    VALUES (?, ?, ?);
  `;

  db.query(query, [user_id, book_id, borrowDate], (err, result) => {
    if (err) {
      console.error("❌ Error borrowing book:", err);
      return res.status(500).json({ error: "Failed to borrow book" });
    }
    res.json({ message: "Book borrowed successfully!" });
  });
});

// 📌 Get borrowed books for a user
app.get("/borrowed/:user_id", (req, res) => {
  const { user_id } = req.params;

  const query = `
    SELECT book.id, book.title, book.author, borrowing.borrow_date, 
           borrowing.return_date, book.cover_image
    FROM borrowing 
    JOIN book ON borrowing.book_id = book.id 
    WHERE borrowing.user_id = ?;
  `;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching borrowed books:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Append full image path
    results = results.map(book => ({
      ...book,
      cover_image: book.cover_image ? `http://localhost:${PORT}/images/${book.cover_image}` : null,
    }));

    res.json(results);
  });
});

// 📌 Return a book
app.post("/return", (req, res) => {
  const { user_id, book_id } = req.body;
  const returnDate = new Date().toISOString().split("T")[0];

  const query = `
    UPDATE borrowing 
    SET return_date = ? 
    WHERE user_id = ? AND book_id = ? AND return_date IS NULL;
  `;

  db.query(query, [returnDate, user_id, book_id], (err, result) => {
    if (err) {
      console.error("❌ Error returning book:", err);
      return res.status(500).json({ error: "Failed to return book" });
    }
    res.json({ message: "Book returned successfully!" });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
