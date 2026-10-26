
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3003;

app.use(express.json());

// Connect to the same MongoDB database
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongodb:27017/trustgrid";
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully to:", MONGO_URI);
        console.log("Connected database:", mongoose.connection.name);
    })
    .catch(err => {
        console.log("MongoDB connection error:", err.message);
        process.exit(1);
    });

// Certificate schema must match Certificate Service
const certificateSchema = new mongoose.Schema({
    certificateId: String,
    studentName: String,
    course: String,
    college: String,
    issueDate: Date,
    status: String
});

// Use the existing "certificates" collection
const Certificate = mongoose.model(
    "Certificate",
    certificateSchema,
    "certificates"
);

// Home route
app.get("/", (req, res) => {
    res.send("TrustGrid Verification Service is running!");
});

// Verify a certificate using its ID
app.get("/verify/:id", async (req, res) => {
    try {
        await mongoose.connection.asPromise();

        const certificate = await Certificate.findOne({
            certificateId: req.params.id
        });

        if (!certificate) {
            return res.status(404).json({
                status: "NOT FOUND",
                message: "Certificate does not exist"
            });
        }

        res.json({
            certificateId: certificate.certificateId,
            studentName: certificate.studentName,
            course: certificate.course,
            college: certificate.college,
            issueDate: certificate.issueDate,
            status: certificate.status
        });
    } catch (error) {
        res.status(500).json({
            message: "Verification failed",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Verification Service running on port ${PORT}`);
});
