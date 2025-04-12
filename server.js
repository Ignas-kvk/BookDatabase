const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { Sequelize } = require("sequelize"); // ✅ Import Sequelize

const sequelize = new Sequelize("book", "root", "", {
    host: "localhost",
    dialect: "mysql",
    logging: false, // Disable SQL query logging
    dialectOptions: {
        charset: "utf8mb4_general_ci" // ✅ Fix encoding issue
    }
});
const authorRoutes = require("./routes/authorRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Test database connection
(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connected to the database");
        await sequelize.sync({ alter: true }); // Use `alter: true` to auto-update schema
        console.log("✅ Database synchronized");
    } catch (err) {
        console.error("❌ Unable to connect to the database or synchronize:", err);
        if (process.env.NODE_ENV === "test") {
            throw new Error("Database connection failed during tests"); // Throw error instead of exiting
        }
    }
})();

// ✅ Singleton for MySQL Connection
class Database {
    constructor() {
        if (!Database.instance) {
            this.connection = mysql.createConnection({
                host: "localhost",
                user: "root",
                password: "",
                database: "book",
                charset: "utf8mb4", // Fix encoding issue
            });

            this.connection.connect((err) => {
                if (err) {
                    console.error("❌ Database connection failed:", err);
                    if (process.env.NODE_ENV === "test") {
                        throw new Error("MySQL connection failed during tests"); // Throw error instead of exiting
                    }
                } else {
                    console.log("✅ Connected to MySQL Database");
                }
            });

            Database.instance = this;
        }
        return Database.instance;
    }

    getConnection() {
        return this.connection;
    }

    closeConnection() {
        if (this.connection && this.connection.state === "authenticated") {
            this.connection.end((err) => {
                if (err) console.error("❌ Error closing MySQL connection:", err);
                else console.log("✅ MySQL connection closed.");
            });
        } else {
            console.log("⚠️ MySQL connection is already closed or not authenticated.");
        }
    }
}

// Replace direct `db` usage with the Singleton instance
const dbInstance = new Database();
const db = dbInstance.getConnection();

// ✅ Factory Class for Object Creation
class EntityFactory {
  static createEntity(type, data) {
    switch (type) {
      case "Author":
        return new Author(data.id, data.name, data.bio);
      case "Publisher":
        return new Publisher(data.id, data.name, data.location);
      case "Book":
        return new Book(
          data.id,
          data.title,
          data.author_name,
          data.genre,
          data.published_date,
          data.copies > 0,
          data.image_url,
          data.description,
          data.publisher_name
        );
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }

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

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, "your_secret_key", { expiresIn: "1h" });
      res.json({ message: "Login successful!", token });
    } catch {
      res.status(500).json({ error: "Error processing request" });
    }
  });
});

// ✅ Decorator for Book Object
function FeaturedBookDecorator(book) {
  return {
    ...book,
    isFeatured: book.avg_rating >= 4.5, // Add a "featured" flag based on average rating
    formattedDescription: book.description
      ? `${book.description.substring(0, 100)}...` // Truncate description to 100 characters
      : "No description available.",
  };
}

// ✅ Strategy Pattern for Sorting
class SortStrategy {
  static getStrategy(sortBy, order) {
    const sortOrder = order === "desc" ? "DESC" : "ASC";
    switch (sortBy) {
      case "avg_rating":
        return `AVG(review.rating) ${sortOrder}`;
      case "title":
        return `book.title ${sortOrder}`;
      case "published_date":
        return `book.published_date ${sortOrder}`;
      default:
        return `book.title ${sortOrder}`; // Default sorting by title
    }
  }
}

// ✅ Adapter for Book Data
class BookAdapter {
  static adapt(book) {
    return {
      id: book.id,
      title: book.title,
      author: book.author_name,
      genre: book.genre,
      publishedDate: book.published_date, // Adapted field name
      isAvailable: book.copies > 0, // Adapted availability
      copies: book.copies, // Include copies field
      imageUrl: `http://localhost:3000/images/${path.basename(book.image_url || "default.jpg")}`, // Ensure correct image path
      description: book.description,
      publisher: book.publisher_name || "Unknown Publisher",
      averageRating: parseFloat(book.avg_rating).toFixed(1), // Adapted field name
      reviewCount: book.review_count,
    };
  }
}

// ✅ Fix avg_rating parsing in `/books` endpoint
app.get("/books", (req, res) => {
  const { sortBy = "title", order = "asc", title, author, genre, publisher } = req.query;


  let query = `
      SELECT book.id, book.title, 
             DATE_FORMAT(book.published_date, '%Y-%m-%d') AS published_date, 
             book.copies, book.image_url, book.description, 
             genre.name AS genre, 
             author.name AS author_name,
             publisher.name AS publisher_name,
             IFNULL(AVG(review.rating), 0) AS avg_rating, COUNT(review.id) AS review_count
      FROM book
      JOIN genre ON book.genre = genre.id
      JOIN author ON book.author_id = author.id
      LEFT JOIN publisher ON book.publisher_id = publisher.id
      LEFT JOIN review ON book.id = review.book_id
  `;

  let conditions = [];
  let params = [];

  if (title) {
      conditions.push("book.title LIKE ?");
      params.push(`%${title}%`);
  }
  if (author) {
      conditions.push("author.name LIKE ?");
      params.push(`%${author}%`);
  }
  if (genre) {
      conditions.push("genre.name = ?");
      params.push(genre);
  }
  if (publisher) {
      conditions.push("publisher.name LIKE ?");
      params.push(`%${publisher}%`);
  }

  if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
  }

  const sortClause = SortStrategy.getStrategy(sortBy, order);

  query += `
      GROUP BY book.id, book.title, book.published_date, book.copies, book.image_url, 
               book.description, genre.name, author.name, publisher.name
      ORDER BY ${sortClause};

  `;

  db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const books = results.map(row => BookAdapter.adapt({
          ...row,
          avg_rating: parseFloat(row.avg_rating).toFixed(1) // Ensure avg_rating is parsed as a float
      }));
      res.json(books);
  });
});


app.get("/genres", (req, res) => {
  const query = "SELECT DISTINCT name FROM genre ORDER BY name ASC";

  db.query(query, (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const genres = results.map(row => row.name);
      res.json(genres);
  });
});




// 📌 Fetch Authors
// Refactor `/authors` endpoint to use the Factory
app.get("/authors", (req, res) => {
  db.query("SELECT * FROM author", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results.map(row => EntityFactory.createEntity("Author", row)));

  });
});
// ✅ Check if the user can rate a book (only if they have borrowed or are reading it)
app.get("/can-rate/:bookId", authenticateUser, (req, res) => {
  const userId = req.userId;
  const { bookId } = req.params;

  const checkOwnershipQuery = `
      SELECT * FROM borrowing 
      WHERE user_id = ? AND book_id = ? 
      AND (return_date IS NULL OR borrow_date IS NOT NULL);
  `;

  const checkReviewQuery = `SELECT * FROM review WHERE user_id = ? AND book_id = ?;`;

  db.query(checkOwnershipQuery, [userId, bookId], (err, borrowedResults) => {
    if (err) {
      console.error("❌ Database error checking ownership:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (borrowedResults.length === 0) {
      return res.json({ canRate: false, hasRated: false }); // ❌ User never borrowed
    }

    db.query(checkReviewQuery, [userId, bookId], (err, reviewResults) => {
      if (err) {
        console.error("❌ Database error checking review:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const hasRated = reviewResults.length > 0; // ✅ Check if user already rated
      res.json({ canRate: !hasRated, hasRated });
    });
  });
});

app.post("/review", authenticateUser, (req, res) => {
    const userId = req.userId; // Derived from the token
    const { bookId, rating, comment } = req.body;

    console.log("Received review data:", { userId, bookId, rating, comment }); // Debugging log

    if (!bookId || !rating || rating < 1 || rating > 5 || !comment.trim()) {
        console.log("❌ Invalid review data. Rejecting request."); // Debugging log
        return res.status(400).json({ error: "Invalid review data. Make sure all fields are filled correctly." });
    }

    // Check if the user already reviewed this book
    const checkReviewQuery = `SELECT * FROM review WHERE user_id = ? AND book_id = ?`;

    db.query(checkReviewQuery, [userId, bookId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (results.length > 0) {
            // ✅ Update existing review
            const updateReviewQuery = `UPDATE review SET rating = ?, comment = ? WHERE user_id = ? AND book_id = ?`;
            db.query(updateReviewQuery, [rating, comment, userId, bookId], (err) => {
                if (err) return res.status(500).json({ error: "Database error" });
                res.json({ message: "Review updated successfully!" });
            });
        } else {
            // ✅ Insert new review if not exists
            const insertReviewQuery = `INSERT INTO review (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)`;
            db.query(insertReviewQuery, [userId, bookId, rating, comment], (err) => {
                if (err) return res.status(500).json({ error: "Database error" });
                res.json({ message: "Review submitted successfully!" });
            });
        }
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



// ✅ Command Pattern for Borrowing and Returning Books
class Command {
  execute() {
    throw new Error("Execute method must be implemented");
  }
}

class BorrowBookCommand extends Command {
    constructor(userId, bookId) {
        super();
        this.userId = userId;
        this.bookId = bookId;
    }

    execute() {
        return new Promise((resolve, reject) => {
            // ✅ Check if the user is already borrowing the book
            const checkExistingBorrowQuery = `
                SELECT * FROM borrowing 
                WHERE user_id = ? AND book_id = ? AND return_date IS NULL
            `;
            db.query(checkExistingBorrowQuery, [this.userId, this.bookId], (err, results) => {
                if (err) return reject("Database error");
                if (results.length > 0) return reject("You are already borrowing this book!");

                // ✅ Check if copies are available
                const checkCopiesQuery = `SELECT copies FROM book WHERE id = ?`;
                db.query(checkCopiesQuery, [this.bookId], (err, results) => {
                    if (err) return reject("Database error");
                    if (results.length === 0) return reject("Book not found");
                    if (results[0].copies <= 0) return reject("No copies available");

                    // ✅ Borrow the book
                    const borrowQuery = `
                        INSERT INTO borrowing (user_id, book_id, borrow_date) 
                        VALUES (?, ?, CURDATE());
                    `;
                    const updateCopiesQuery = `UPDATE book SET copies = copies - 1 WHERE id = ? AND copies > 0`;

                    db.query(borrowQuery, [this.userId, this.bookId], (err) => {
                        if (err) return reject("Database error");
                        db.query(updateCopiesQuery, [this.bookId], (err) => {
                            if (err) return reject("Database error");
                            resolve("Book borrowed successfully!");
                        });
                    });
                });
            });
        });
    }
}

class ReturnBookCommand extends Command {
  constructor(userId, bookId) {
    super();
    this.userId = userId;
    this.bookId = bookId;
  }

  execute() {
    return new Promise((resolve, reject) => {
      const checkBorrowedQuery = `
        SELECT * FROM borrowing 
        WHERE user_id = ? AND book_id = ? AND return_date IS NULL
      `;
      db.query(checkBorrowedQuery, [this.userId, this.bookId], (err, results) => {
        if (err) return reject("Database error");
        if (results.length === 0) return reject("You haven't borrowed this book or it's already returned");

        const returnBookQuery = `
          UPDATE borrowing SET return_date = CURDATE() 
          WHERE user_id = ? AND book_id = ? AND return_date IS NULL
        `;
        const updateCopiesQuery = `UPDATE book SET copies = copies + 1 WHERE id = ?`;

        db.query(returnBookQuery, [this.userId, this.bookId], (err) => {
          if (err) return reject("Database error");
          db.query(updateCopiesQuery, [this.bookId], (err) => {
            if (err) return reject("Database error");
            resolve("Book returned successfully!");
          });
        });
      });
    });
  }
}

// Refactor `/borrow` endpoint to use the Command Pattern
app.post("/borrow", authenticateUser, async (req, res) => {
    const userId = req.userId; // Derived from the token
    const { bookId } = req.body;

    if (!bookId) return res.status(400).json({ error: "Book ID is required" });

    const borrowCommand = new BorrowBookCommand(userId, bookId);
    try {
        const message = await borrowCommand.execute();
        res.json({ message });
    } catch (error) {
        res.status(400).json({ error });
    }
});

// Refactor `/return` endpoint to use the Command Pattern
app.post("/return", authenticateUser, async (req, res) => {
  const userId = req.userId;
  const { bookId } = req.body;

  if (!bookId) return res.status(400).json({ error: "Book ID is required" });

  const returnCommand = new ReturnBookCommand(userId, bookId);
  try {
    const message = await returnCommand.execute();
    res.json({ message });
  } catch (error) {
    res.status(400).json({ error });
  }
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
}, express.static(path.join(__dirname, "public/images"))); // Ensure this path is correct

// ✅ Create a new Author
app.post("/authors", async (req, res) => {
    try {
        const author = new Author(req.body);
        await author.save();
        res.status(201).json(author);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ✅ Create a new Publisher
app.post("/publishers", async (req, res) => {
    try {
        const publisher = new Publisher(req.body);
        await publisher.save();
        res.status(201).json(publisher);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ✅ Create a new Book
app.post("/books", async (req, res) => {
    try {
        const book = new Book(req.body);
        await book.save();

        // Notify subscribers about the new book
        bookObserver.notify(book);

        res.status(201).json(book);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ✅ Observer Pattern Implementation
class Observer {
    constructor() {
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify(data) {
        this.subscribers.forEach(callback => callback(data));
    }
}

// Create an instance of the Observer
const bookObserver = new Observer();

// Subscribe to book addition notifications
bookObserver.subscribe((newBook) => {
    console.log(`📢 Notification: A new book titled "${newBook.title}" has been added!`);
    // Additional logic for notifying users (e.g., sending emails) can be added here.
});

// Routes
app.use("/authors", authorRoutes);

// Graceful shutdown for Sequelize and MySQL connection
process.on("SIGINT", async () => {
    try {
        if (sequelize) {
            await sequelize.close(); // Close Sequelize connection
            console.log("✅ Sequelize connection closed.");
        }
        dbInstance.closeConnection(); // Close MySQL connection
        process.exit(0);
    } catch (err) {
        console.error("❌ Error during shutdown:", err);
        process.exit(1);
    }
});

// Ensure database connection is closed during tests
if (process.env.NODE_ENV === "test") {
    afterAll(async () => {
        console.log("🔄 Closing database connections after tests...");
        if (sequelize) {
            await sequelize.close();
            console.log("✅ Sequelize connection closed after tests.");
        }
        dbInstance.closeConnection();
        console.log("✅ MySQL connection closed after tests.");
    });
}

let server; // Declare server variable

// 📌 Start Server
if (process.env.NODE_ENV !== "test") { // Only start the server if not in test mode
    server = app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

module.exports = { app, server, dbInstance }; // Export server for testing
