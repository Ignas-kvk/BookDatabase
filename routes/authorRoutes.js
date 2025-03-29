const express = require("express");
const Author = require("../models/Author");
const router = express.Router();

// Create a new author
router.post("/", async (req, res) => {
    try {
        const author = await Author.create(req.body);
        res.status(201).json(author);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Read all authors
router.get("/", async (req, res) => {
    try {
        const authors = await Author.findAll();
        res.json(authors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an author
router.put("/:id", async (req, res) => {
    try {
        const [updated] = await Author.update(req.body, { where: { id: req.params.id } });
        if (updated) {
            const updatedAuthor = await Author.findByPk(req.params.id);
            res.json(updatedAuthor);
        } else {
            res.status(404).json({ error: "Author not found" });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete an author
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await Author.destroy({ where: { id: req.params.id } });
        if (deleted) {
            res.json({ message: "Author deleted successfully" });
        } else {
            res.status(404).json({ error: "Author not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
