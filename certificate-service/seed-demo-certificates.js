const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  course: { type: String, required: true },
  college: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  status: { type: String, default: "VALID" }
});

const Certificate = mongoose.model("Certificate", certificateSchema);
const certificates = [
  ["Aarav Patel", "B.Tech Computer Science", "Gujarat Technical University", "2024-06-12", "VALID"],
  ["Riya Shah", "Data Science", "Ahmedabad Institute of Technology", "2024-07-08", "VALID"],
  ["Krish Mehta", "Cloud Computing", "Gujarat University", "2024-08-21", "REVOKED"],
  ["Ananya Patel", "Cyber Security", "Sunrise College", "2024-09-16", "VALID"],
  ["Rahul Joshi", "Web Development", "Western Institute of Technology", "2024-10-04", "VALID"],
  ["Neha Shah", "Artificial Intelligence", "Gujarat Technical University", "2024-11-19", "REVOKED"],
  ["Yash Mehta", "DevOps Engineering", "Ahmedabad Institute of Technology", "2025-01-14", "VALID"],
  ["Kavya Patel", "Python Programming", "Gujarat University", "2025-02-27", "VALID"],
  ["Harsh Shah", "Database Management", "Sunrise College", "2025-03-11", "VALID"],
  ["Meera Joshi", "Machine Learning", "Western Institute of Technology", "2025-04-23", "REVOKED"],
  ["Dhruv Patel", "Full Stack Development", "Gujarat Technical University", "2025-06-05", "VALID"],
  ["Ishita Mehta", "Software Engineering", "Ahmedabad Institute of Technology", "2025-08-18", "VALID"],
  ["Dev Shah", "Kubernetes & Cloud", "Gujarat University", "2025-10-02", "REVOKED"],
  ["Pooja Patel", "Java Programming", "Sunrise College", "2026-01-20", "VALID"],
  ["Manav Joshi", "Computer Networks", "Western Institute of Technology", "2026-03-09", "REVOKED"]
].map(([studentName, course, college, issueDate, status], index) => ({
  certificateId: `TG-DEMO-${String(index + 1).padStart(3, "0")}`,
  studentName,
  course,
  college,
  issueDate: new Date(`${issueDate}T00:00:00.000Z`),
  status
}));

async function seedDemoCertificates() {
  const mongoUri = process.env.MONGO_URI || "mongodb://mongodb:27017/trustgrid";
  await mongoose.connect(mongoUri);

  const result = await Certificate.bulkWrite(certificates.map((certificate) => ({
    updateOne: {
      filter: { certificateId: certificate.certificateId },
      update: { $setOnInsert: certificate },
      upsert: true
    }
  })), { ordered: false });

  console.log(`Demo certificates in ${mongoose.connection.name}: ${certificates.length}`);
  console.log(`Inserted: ${result.upsertedCount}; already present: ${result.matchedCount}`);
  await mongoose.disconnect();
}

seedDemoCertificates().catch(async (error) => {
  console.error("Could not seed demo certificates:", error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
