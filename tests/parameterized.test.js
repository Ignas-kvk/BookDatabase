const request = require("supertest");
const { app, server, dbInstance } = require("../server");
const jwt = require("jsonwebtoken");

let testServer;
let token;

describe("Parameterized Tests", () => {
    beforeAll(async () => {
        console.log("🔄 Setting up test server and database...");
        testServer = app.listen(0); // Start server on a dynamic port

        // Generate a valid token
        token = jwt.sign({ id: 1, email: "test@example.com", name: "Test User" }, "your_secret_key", { expiresIn: "1h" });
    });

    afterAll(async () => {
        console.log("🔄 Tearing down test server and database...");
        testServer.close(); // Close the server after tests
        dbInstance.closeConnection(); // Close the database connection
        console.log("✅ Test teardown complete.");
    });

    const testCases = [
        { bookId: 1, expectedStatus: 400, expectedMessage: "No copies available" },
        { bookId: 2, expectedStatus: 200, expectedMessage: "Book borrowed successfully!" },
    ];

    testCases.forEach(({ bookId, expectedStatus, expectedMessage }) => {
        test(`Should handle borrowing for bookId=${bookId}`, async () => {
            const response = await request(testServer)
                .post("/borrow")
                .set("Authorization", `Bearer ${token}`)
                .send({ bookId });

            expect(response.status).toBe(expectedStatus);
            expect(response.body.message || response.body.error).toContain(expectedMessage);
        });
    });
});
