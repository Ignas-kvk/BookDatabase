const request = require("supertest");
const { app, server, dbInstance } = require("../server");
const assert = require("assert");
const jwt = require("jsonwebtoken");

let testServer;
let token;

describe("Books API Tests", () => {
    beforeAll(async () => {
        console.log("🔄 Setting up test server and database...");
        testServer = app.listen(0); // Start server on a dynamic port

        // Generate a valid token
        token = jwt.sign({ id: 1, email: "test@example.com", name: "Test User" }, "your_secret_key", { expiresIn: "1h" });

        console.log("✅ Test setup complete.");
    });

    beforeEach(() => {
        console.log("🔄 Running setup before each test...");
        // Add any setup logic needed before each test
    });

    afterEach(() => {
        console.log("🔄 Cleaning up after each test...");
        // Add any cleanup logic needed after each test
    });

    afterAll(async () => {
        console.log("🔄 Tearing down test server and database...");
        testServer.close(); // Close the server after tests
        dbInstance.closeConnection(); // Close the database connection
        console.log("✅ Test teardown complete.");
    });

    test("Should fetch books", async () => {
        const response = await request(testServer).get("/books").set("Authorization", `Bearer ${token}`);
        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.body));
    });

    test("Should fetch books with correct structure", async () => {
        const response = await request(testServer).get("/books").set("Authorization", `Bearer ${token}`);
        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.body));
        assert.deepStrictEqual(Object.keys(response.body[0]), [
            "id",
            "title",
            "author",
            "genre",
            "publishedDate",
            "isAvailable",
            "copies",
            "imageUrl",
            "description",
            "publisher",
            "averageRating",
            "reviewCount"
        ]); // New assert method
    });

    test("Should borrow a book", async () => {
        const response = await request(testServer)
            .post("/borrow")
            .send({ bookId: 1 })
            .set("Authorization", `Bearer ${token}`);

        assert.equal(response.status, 400);
        assert.ok(response.body.error.includes("No copies available"));
    });

    test("Should not borrow the same book twice", async () => {
        const response = await request(testServer)
            .post("/borrow")
            .send({ bookId: 1 })
            .set("Authorization", `Bearer ${token}`);

        assert.equal(response.status, 400);
        assert.ok(response.body.error.includes("You are already borrowing this book"));
    });
});
