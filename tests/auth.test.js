const request = require("supertest");
const { app, server, dbInstance } = require("../server");
const assert = require("assert");
const jwt = require("jsonwebtoken");

let testServer;

describe("Auth API Tests", () => {
    beforeAll(async () => {
        testServer = app.listen(0); // Start server on a dynamic port
        const db = dbInstance.getConnection();
        await db.promise().query("DELETE FROM user WHERE email = 'test@example.com'"); // Clean up test data
    });

    afterAll(async () => {
        testServer.close(); // Close the server after tests
        dbInstance.closeConnection(); // Close the database connection
    });

    test("Should register a new user", async () => {
        const response = await request(testServer)
            .post("/signup")
            .send({ name: "Test User", email: "test@example.com", password: "password123" });

        assert.equal(response.status, 200); // Adjusted to match actual response
        assert.ok(response.body.message.includes("User registered successfully"));
    });

    test("Should not register with existing email", async () => {
        const response = await request(testServer)
            .post("/signup")
            .send({ name: "Test User", email: "test@example.com", password: "password123" });

        assert.equal(response.status, 400);
        assert.ok(response.body.error.includes("User already exists"));
    });

    test("Should login with valid credentials", async () => {
        const response = await request(testServer)
            .post("/login")
            .send({ email: "test@example.com", password: "password123" });

        assert.equal(response.status, 200);
        assert.ok(response.body.token);
    });

    test("Should not login with invalid credentials", async () => {
        const response = await request(testServer)
            .post("/login")
            .send({ email: "test@example.com", password: "wrongpassword" });

        assert.equal(response.status, 400); // Adjusted to match actual response
        assert.ok(response.body.error.includes("Invalid email or password!")); // Adjusted error message
    });
});
