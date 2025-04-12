const request = require("supertest");
const { app, server } = require("../server");
const assert = require("assert");

let testServer;

describe("Performance Tests", () => {
    beforeAll(async () => {
        testServer = app.listen(0); // Start server on a dynamic port
    });

    afterAll(async () => {
        testServer.close(); // Close the server after tests
    });

    test("Books API should respond within 200ms", async () => {
        const start = Date.now();
        const response = await request(testServer).get("/books");
        const duration = Date.now() - start;

        assert.equal(response.status, 200);
        assert.ok(duration < 200, `Response took too long: ${duration}ms`);
    });
});

describe("Performance Tests", () => {
    test("Should respond within 200ms for /books endpoint", async () => {
        const start = Date.now();
        const response = await request(app).get("/books");
        const duration = Date.now() - start;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(200); // Performance assertion
    });
});
