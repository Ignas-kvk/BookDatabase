const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(403).json({ error: "Access denied" });

    try {
        const verified = jwt.verify(token, "MySuperSecretKey");
        req.user = verified; // Attach user info to request
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
};
