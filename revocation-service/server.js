const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3004;

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

const certificateSchema = new mongoose.Schema({
    certificateId: String,
    studentName: String,
    course: String,
    college: String,
    issueDate: Date,
    status: String
});

const Certificate = mongoose.model(
    "Certificate",
    certificateSchema,
    "certificates"
);

app.get("/", (req, res) => {
    res.send("TrustGrid Revocation Service is running!");
});

app.post("/revoke/:id", async (req, res) => {
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

        if (certificate.status === "REVOKED") {
            return res.json({
                message: "Certificate is already revoked",
                certificateId: certificate.certificateId,
                status: certificate.status
            });
        }

        certificate.status = "REVOKED";
        await certificate.save();

        res.json({
            message: "Certificate revoked successfully",
            certificateId: certificate.certificateId,
            studentName: certificate.studentName,
            status: certificate.status
        });
    } catch (error) {
        res.status(500).json({
            message: "Revocation failed",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Revocation Service running on port ${PORT}`);
});