
const express = require("express");

const app = express();
const PORT = 3001;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("TrustGrid Auth Service is running!");
});

app.get("/health", (req, res) => {
    res.json({
        service: "Auth Service",
        status: "healthy"
    });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const expectedUsername = process.env.DEMO_USERNAME || "admin";
    const expectedPassword = process.env.DEMO_PASSWORD || "admin123";

    if (username !== expectedUsername || password !== expectedPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    res.json({
        message: "Login successful",
        user: { username },
        token: `trustgrid-demo-${Date.now()}`
    });
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
