
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3005;

app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://mongodb:27017/trustgrid";
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully to:", MONGO_URI);
    })
    .catch(err => {
        console.log("MongoDB connection error:", err.message);
        process.exit(1);
    });

const auditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    certificateId: { type: String, required: true },
    user: { type: String, default: "system" },
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model("AuditLog", auditSchema);

app.get("/", (req, res) => {
    res.send("TrustGrid Audit Service is running!");
});

app.post("/logs", async (req, res) => {
    try {
        await mongoose.connection.asPromise();

        const { action, certificateId, user } = req.body;

        if (!action || !certificateId) {
            return res.status(400).json({
                message: "Please provide action and certificateId"
            });
        }

        const log = await AuditLog.create({
            action,
            certificateId,
            user
        });

        res.status(201).json({
            message: "Audit log saved successfully",
            log
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to save audit log",
            error: error.message
        });
    }
});

app.get("/logs", async (req, res) => {
    try {
        await mongoose.connection.asPromise();

        const logs = await AuditLog.find().sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch audit logs",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Audit Service running on port ${PORT}`);
});
