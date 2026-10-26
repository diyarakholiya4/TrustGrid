
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(express.json());

// Service base URLs - use Docker service names for internal communication
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";
const CERT_SERVICE = process.env.CERT_SERVICE_URL || "http://certificate-service:3002";
const VERIFY_SERVICE = process.env.VERIFY_SERVICE_URL || "http://verification-service:3003";
const REVOKE_SERVICE = process.env.REVOKE_SERVICE_URL || "http://revocation-service:3004";
const AUDIT_SERVICE = process.env.AUDIT_SERVICE_URL || "http://audit-service:3005";

async function forwardRequest(res, serviceUrl, servicePath, req, auditAction) {
    try {
        const response = await axios({
            method: req.method,
            url: `${serviceUrl}${servicePath}${req.url}`,
            data: req.body,
            headers: { "Content-Type": "application/json" },
            timeout: 5000
        });

        const certificateId = response.data?.certificate?.certificateId ||
            response.data?.certificateId;
        const completedRevocation = auditAction !== "CERTIFICATE_REVOKED" ||
            response.data?.message === "Certificate revoked successfully";
        if (auditAction && certificateId && completedRevocation) {
            try {
                await axios.post(`${AUDIT_SERVICE}/logs`, {
                    action: auditAction,
                    certificateId,
                    user: req.body?.user || "admin"
                }, { timeout: 2000 });
            } catch (auditError) {
                console.error("Could not save audit log:", auditError.message);
            }
        }

        res.status(response.status).send(response.data);
    } catch (error) {
        res.status(error.response?.status || 502)
            .send(error.response?.data || { message: "The requested service is unavailable" });
    }
}

app.get("/", (req, res) => {
    res.send("TrustGrid API Gateway is running!");
});

// Auth Service
app.use("/auth", async (req, res) => {
    await forwardRequest(res, AUTH_SERVICE, "", req);
});

// Certificate Service - routes /certificates/* to certificate-service /certificates/*
app.use("/certificates", async (req, res) => {
    const auditAction = req.method === "POST" ? "CERTIFICATE_CREATED" :
        req.method === "DELETE" ? "CERTIFICATE_DELETED" : undefined;
    await forwardRequest(res, CERT_SERVICE, "/certificates", req, auditAction);
});

// Verification Service - routes /verify/* to verification-service /verify/*
app.use("/verify", async (req, res) => {
    await forwardRequest(res, VERIFY_SERVICE, "/verify", req);
});

// Revocation Service - routes /revoke/* to revocation-service /revoke/*
app.use("/revoke", async (req, res) => {
    const auditAction = req.method === "POST" ? "CERTIFICATE_REVOKED" : undefined;
    await forwardRequest(res, REVOKE_SERVICE, "/revoke", req, auditAction);
});

// Audit Service - routes /logs/* to audit-service /logs/*
app.use("/logs", async (req, res) => {
    await forwardRequest(res, AUDIT_SERVICE, "/logs", req);
});

app.listen(PORT, () => {
    console.log(`TrustGrid API Gateway running on port ${PORT}`);
    console.log(`Auth Service: ${AUTH_SERVICE}`);
    console.log(`Certificate Service: ${CERT_SERVICE}`);
    console.log(`Verification Service: ${VERIFY_SERVICE}`);
    console.log(`Revocation Service: ${REVOKE_SERVICE}`);
    console.log(`Audit Service: ${AUDIT_SERVICE}`);
});
