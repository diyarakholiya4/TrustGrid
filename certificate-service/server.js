
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3002;

app.use(express.json());

// Connect to MongoDB
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

// Certificate schema
const certificateSchema = new mongoose.Schema({
    certificateId: {
        type: String,
        required: true,
        unique: true
    },
    studentName: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    college: {
        type: String,
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: "VALID"
    }
});

const Certificate = mongoose.model("Certificate", certificateSchema);

// Home route
app.get("/", (req, res) => {
    res.send("TrustGrid Certificate Service is running!");
});

// Create a certificate
app.post("/certificates", async (req, res) => {
    try {
        const { studentName, course, college } = req.body;

        if (!studentName || !course || !college) {
            return res.status(400).json({
                message: "Please provide studentName, course and college"
            });
        }

        // Wait for MongoDB before saving
        await mongoose.connection.asPromise();

        const certificate = await Certificate.create({
            certificateId: `TG${Date.now()}${Math.floor(100 + Math.random() * 900)}`,
            studentName,
            course,
            college
        });

        res.status(201).json({
            message: "Certificate created successfully",
            certificate
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to create certificate",
            error: error.message
        });
    }
});

// Get all certificates
app.get("/certificates", async (req, res) => {
    try {
        await mongoose.connection.asPromise();

        const certificates = await Certificate.find();
        res.json(certificates);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch certificates",
            error: error.message
        });
    }
});

// Get one certificate by ID
app.get("/certificates/:id", async (req, res) => {
    try {
        await mongoose.connection.asPromise();

        const certificate = await Certificate.findOne({
            certificateId: req.params.id
        });

        if (!certificate) {
            return res.status(404).json({
                message: "Certificate not found"
            });
        }

        res.json(certificate);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch certificate",
            error: error.message
        });
    }
});

app.delete("/certificates/:id", async (req, res) => {
    try {
        await mongoose.connection.asPromise();

        const certificate = await Certificate.findOneAndDelete({
            certificateId: req.params.id
        });

        if (!certificate) {
            return res.status(404).json({
                message: "Certificate not found"
            });
        }

        res.json({
            message: "Certificate deleted successfully",
            certificateId: certificate.certificateId
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete certificate",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Certificate Service running on port ${PORT}`);
});
