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


// MySQL Connection
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

// 📌 Serve Signup Page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// 📌 Serve Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 📌 Sign Up (Register User)
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  db.query("SELECT * FROM user WHERE email = ?", [email], async (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (result.length > 0) {
      return res.status(400).json({ error: "User already exists!" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = "INSERT INTO user (name, email, password) VALUES (?, ?, ?)";
      db.query(query, [name, email, hashedPassword], (err) => {
        if (err) {
          console.error("❌ Error signing up:", err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "User registered successfully!" });
      });
    } catch (error) {
      console.error("❌ Error hashing password:", error);
      return res.status(500).json({ error: "Error processing request" });
    }
  });
});

// 📌 Login (Authenticate User)
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM user WHERE email = ?", [email], async (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length === 0) {
      return res.status(400).json({ error: "Invalid email or password!" });
    }

    try {
      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password!" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        "your_secret_key",
        { expiresIn: "1h" }
      );

      res.json({ message: "Login successful!", token });
    } catch (error) {
      console.error("❌ Error during login:", error);
      return res.status(500).json({ error: "Error processing request" });
    }
  });
});
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM user WHERE email = ?", [email], async (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length === 0) {
      return res.status(400).json({ error: "Invalid email or password!" });
    }

    try {
      // Compare Password
      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password!" });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        "your_secret_key",
        { expiresIn: "1h" }
      );

      res.json({ message: "Login successful!", token });
    } catch (error) {
      console.error("❌ Error during login:", error);
      return res.status(500).json({ error: "Error processing request" });
    }
  });
});
app.get("/books", (req, res) => {
  const query = `
      SELECT book.id, book.title, book.author, genre.name AS genre, 
             book.published_date, book.availability, book.image_url, book.description
      FROM book 
      JOIN genre ON book.genre = genre.id
      LIMIT 20;
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("❌ Error fetching books:", err.sqlMessage || err);
          return res.status(500).json({ error: err.sqlMessage || "Database error" });
      }

      // ✅ Ensure correct image URL format
      results = results.map(book => ({
          ...book,
          image_url: `http://localhost:3000/images/${path.basename(book.image_url)}` // Fix URL
      }));

      res.json(results);
  });
});

// Middleware: Serve images with CORS headers
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
