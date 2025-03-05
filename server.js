const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "book",
  charset: "utf8mb4",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL Database");
});

// ✅ Object-Oriented Classes
class Author {
  constructor(id, name, bio) {
    this.id = id;
    this.name = name;
    this.bio = bio;
  }
}

class Publisher {
  constructor(id, name, location) {
    this.id = id;
    this.name = name;
    this.location = location;
  }
}

class Book {
  constructor(id, title, author, genre, published_date, availability, image_url, description, publisher) {
    this.id = id;
    this.title = title;
    this.author = author; // Author object
    this.genre = genre;
    this.published_date = published_date;
    this.availability = availability;
    this.image_url = `http://localhost:3000/images/${path.basename(image_url)}`;
    this.description = description;
    this.publisher = publisher; // Publisher object
  }
}

// 📌 User Authentication (Signup & Login)
// ✅ Serve Signup Page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// ✅ Serve Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ✅ Sign Up (Register User)
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  db.query("SELECT * FROM user WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    
    if (result.length > 0) {
      return res.status(400).json({ error: "User already exists!" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query("INSERT INTO user (name, email, password) VALUES (?, ?, ?)", 
        [name, email, hashedPassword], 
        (err) => {
          if (err) return res.status(500).json({ error: "Database error" });
          res.json({ message: "User registered successfully!" });
        }
      );
    } catch {
      res.status(500).json({ error: "Error processing request" });
    }
  });
});

// ✅ Login (Authenticate User)
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM user WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (result.length === 0) {
      return res.status(400).json({ error: "Invalid email or password!" });
    }

    try {
      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid email or password!" });

      const token = jwt.sign({ id: user.id, email: user.email }, "your_secret_key", { expiresIn: "1h" });
      res.json({ message: "Login successful!", token });
    } catch {
      res.status(500).json({ error: "Error processing request" });
    }
  });
});

// 📌 Fetch Books with OOP Approach
app.get("/books", (req, res) => {
  const query = `
      SELECT book.id, book.title, 
       DATE_FORMAT(book.published_date, '%Y-%m-%d') AS published_date, 
       book.copies, book.image_url, book.description, 
       genre.name AS genre, 
       author.id AS author_id, author.name AS author_name, author.bio AS author_bio,
       publisher.id AS publisher_id, publisher.name AS publisher_name, publisher.location AS publisher_location
FROM book
JOIN genre ON book.genre = genre.id
JOIN author ON book.author_id = author.id
LEFT JOIN publisher ON book.publisher_id = publisher.id
LIMIT 20;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const books = results.map(row => {
      return {
        id: row.id,
        title: row.title,
        author: row.author_name,
        genre: row.genre,
        published_date: row.published_date,
        copies: row.copies,
        image_url: `http://localhost:3000/images/${path.basename(row.image_url)}`,
        description: row.description,
        publisher: row.publisher_name || "Unknown Publisher"  // ✅ Ensure a valid publisher name
      };
    });

    res.json(books);
  });
});



// 📌 Fetch Authors
app.get("/authors", (req, res) => {
  db.query("SELECT * FROM author", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results.map(row => new Author(row.id, row.name, row.bio)));
  });
});

// 📌 Fetch Reviews for a Book
app.get("/reviews/:bookId", async (req, res) => {
  const { bookId } = req.params;

  db.query(`
      SELECT u.name AS user_name, r.rating, r.comment 
      FROM review r 
      JOIN user u ON r.user_id = u.id 
      WHERE r.book_id = ?;
  `, [bookId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// 📌 Add a Review
app.post("/reviews", (req, res) => {
  const { user_id, book_id, rating, comment } = req.body;

  if (!user_id || !book_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid review data" });
  }

  db.query("INSERT INTO review (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)", 
    [user_id, book_id, rating, comment], 
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Review added successfully!" });
    }
  );
});

// ✅ Middleware to get logged-in user ID from token
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
      const decoded = jwt.verify(token, "your_secret_key");
      req.userId = decoded.id;
      next();
  } catch {
      res.status(401).json({ error: "Invalid token" });
  }
};


// ✅ Borrow a Book
app.post("/borrow", authenticateUser, (req, res) => {
  const userId = req.userId;
  const { bookId } = req.body;

  if (!bookId) return res.status(400).json({ error: "Book ID is required" });

  // Check if user has already borrowed this book and not returned it
  const checkExistingBorrowQuery = `
      SELECT * FROM borrowing 
      WHERE user_id = ? AND book_id = ? AND return_date IS NULL
  `;

  db.query(checkExistingBorrowQuery, [userId, bookId], (err, existingLoans) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (existingLoans.length > 0) {
      return res.status(400).json({ error: "You already have a borrowed copy of this book!" });
    }

    // Check if copies are available
    const checkCopiesQuery = `SELECT copies FROM book WHERE id = ?`;

    db.query(checkCopiesQuery, [bookId], (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (results.length === 0) return res.status(404).json({ error: "Book not found" });

      const availableCopies = results[0].copies;
      if (availableCopies <= 0) return res.status(400).json({ error: "No copies available" });

      // Insert into borrowing table
      const borrowQuery = `
          INSERT INTO borrowing (user_id, book_id, borrow_date) 
          VALUES (?, ?, CURDATE());
      `;

      const updateCopiesQuery = `UPDATE book SET copies = copies - 1 WHERE id = ? AND copies > 0`;

      db.query(borrowQuery, [userId, bookId], (err) => {
        if (err) return res.status(500).json({ error: "Database error" });

        db.query(updateCopiesQuery, [bookId], (err) => {
          if (err) return res.status(500).json({ error: "Database error" });

          res.json({ message: "Book borrowed successfully!" });
        });
      });
    });
  });
});


// ✅ Return a Borrowed Book
app.post("/return", authenticateUser, (req, res) => {
  const userId = req.userId;
  const { bookId } = req.body;

  if (!bookId) return res.status(400).json({ error: "Book ID is required" });

  // Check if the user has borrowed this book
  const checkBorrowedQuery = `
      SELECT * FROM borrowing 
      WHERE user_id = ? AND book_id = ? AND return_date IS NULL
  `;

  db.query(checkBorrowedQuery, [userId, bookId], (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (results.length === 0) return res.status(400).json({ error: "You haven't borrowed this book or it's already returned" });

      // Update return date
      const returnBookQuery = `
          UPDATE borrowing SET return_date = CURDATE() 
          WHERE user_id = ? AND book_id = ? AND return_date IS NULL
      `;

      const updateCopiesQuery = `UPDATE book SET copies = copies + 1 WHERE id = ?`;


      db.query(returnBookQuery, [userId, bookId], (err) => {
          if (err) return res.status(500).json({ error: "Database error" });

          db.query(updateCopiesQuery, [bookId], (err) => {
              if (err) return res.status(500).json({ error: "Database error" });

              res.json({ message: "Book returned successfully!" });
          });
      });
  });
});





// ✅ Get user's borrowed books (both current and past) & reviews
app.get("/profile", authenticateUser, (req, res) => {
  const userId = req.userId;

  const borrowedBooksQuery = `
      SELECT 
    b.id AS book_id, 
    b.title, 
    DATE_FORMAT(br.borrow_date, '%Y-%m-%d') AS borrow_date, 
    DATE_FORMAT(br.return_date, '%Y-%m-%d') AS return_date
FROM borrowing br 
JOIN book b ON br.book_id = b.id 
WHERE br.user_id = ?
ORDER BY br.borrow_date DESC;

  `;

  const reviewsQuery = `
      SELECT r.rating, r.comment, b.title AS bookTitle 
      FROM review r 
      JOIN book b ON r.book_id = b.id 
      WHERE r.user_id = ?
  `;

  db.query(borrowedBooksQuery, [userId], (err, borrowedBooks) => {
      if (err) return res.status(500).json({ error: "Database error" });

      db.query(reviewsQuery, [userId], (err, reviews) => {
          if (err) return res.status(500).json({ error: "Database error" });

          console.log("Borrowed Books Response:", borrowedBooks); // ✅ Debugging log
          res.json({ borrowedBooks, reviews });
      });
  });
});



// ✅ Change Password
app.post("/change-password", authenticateUser, async (req, res) => {
  const userId = req.userId;
  const { oldPassword, newPassword } = req.body;

  db.query("SELECT password FROM user WHERE id = ?", [userId], async (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (result.length === 0) return res.status(404).json({ error: "User not found" });

      const isMatch = await bcrypt.compare(oldPassword, result[0].password);
      if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query("UPDATE user SET password = ? WHERE id = ?", [hashedPassword, userId], (err) => {
          if (err) return res.status(500).json({ error: "Database error" });

          res.json({ message: "Password changed successfully!" });
      });
  });
});


// 📌 Middleware: Serve images with CORS headers
app.use("/images", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
}, express.static(path.join(__dirname, "public/images")));

// 📌 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
