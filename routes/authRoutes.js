const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials!" });
        }

        const token = jwt.sign({ email: user.email, roles: user.roles }, "MySuperSecretKey", { expiresIn: "1d" });
        res.json({ token, email: user.email, roles: user.roles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;