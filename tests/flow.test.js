const test = require("node:test");
const assert = require("node:assert/strict");

const API = process.env.API_URL || "http://localhost:3000";

async function call(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test("TrustGrid certificate lifecycle and audit trail", async () => {
  const invalidLogin = await call("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "wrong" })
  });
  assert.equal(invalidLogin.response.status, 401);

  const login = await call("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "admin123" })
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.username, "admin");

  const missingFields = await call("/certificates", {
    method: "POST",
    body: JSON.stringify({ studentName: "Test Student" })
  });
  assert.equal(missingFields.response.status, 400);

  const created = await call("/certificates", {
    method: "POST",
    body: JSON.stringify({
      studentName: "TrustGrid Flow Test",
      course: "Computer Engineering",
      college: "ABC College",
      user: "admin"
    })
  });
  assert.equal(created.response.status, 201);
  const certificate = created.data.certificate;
  assert.match(certificate.certificateId, /^TG\d+$/);
  assert.equal(certificate.status, "VALID");

  const missingCertificate = await call("/verify/does-not-exist");
  assert.equal(missingCertificate.response.status, 404);

  const valid = await call(`/verify/${certificate.certificateId}`);
  assert.equal(valid.response.status, 200);
  assert.equal(valid.data.status, "VALID");

  const revoked = await call(`/revoke/${certificate.certificateId}`, {
    method: "POST",
    body: JSON.stringify({ user: "admin" })
  });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.data.status, "REVOKED");

  const revokedVerification = await call(`/verify/${certificate.certificateId}`);
  assert.equal(revokedVerification.response.status, 200);
  assert.equal(revokedVerification.data.status, "REVOKED");

  const logsBeforeRepeat = await call("/logs");
  const repeatedRevocation = await call(`/revoke/${certificate.certificateId}`, {
    method: "POST",
    body: JSON.stringify({ user: "admin" })
  });
  assert.equal(repeatedRevocation.response.status, 200);
  assert.match(repeatedRevocation.data.message, /already revoked/i);

  const logsAfterRepeat = await call("/logs");
  assert.equal(logsAfterRepeat.data.length, logsBeforeRepeat.data.length);
  const lifecycleEvents = logsAfterRepeat.data.filter((log) => log.certificateId === certificate.certificateId);
  assert.deepEqual(lifecycleEvents.map((log) => log.action).sort(), ["CERTIFICATE_CREATED", "CERTIFICATE_REVOKED"]);

  const invalidAudit = await call("/logs", {
    method: "POST",
    body: JSON.stringify({ action: "TEST" })
  });
  assert.equal(invalidAudit.response.status, 400);

  const audit = await call("/logs");
  assert.equal(audit.response.status, 200);
  assert.ok(audit.data.some((log) => log.certificateId === certificate.certificateId));

  const deletionTarget = await call("/certificates", {
    method: "POST",
    body: JSON.stringify({
      studentName: "Temporary Delete Test",
      course: "Test Course",
      college: "TrustGrid Test College",
      user: "admin"
    })
  });
  assert.equal(deletionTarget.response.status, 201);
  const deleteId = deletionTarget.data.certificate.certificateId;

  const beforeDelete = await call(`/certificates/${deleteId}`);
  assert.equal(beforeDelete.response.status, 200);
  assert.equal(beforeDelete.data.studentName, "Temporary Delete Test");

  const deleted = await call(`/certificates/${deleteId}`, {
    method: "DELETE",
    body: JSON.stringify({ user: "admin" })
  });
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.data.certificateId, deleteId);

  const afterDelete = await call(`/certificates/${deleteId}`);
  assert.equal(afterDelete.response.status, 404);
  const certificateList = await call("/certificates");
  assert.ok(certificateList.data.every((item) => item.certificateId !== deleteId));

  const repeatedDelete = await call(`/certificates/${deleteId}`, { method: "DELETE" });
  assert.equal(repeatedDelete.response.status, 404);

  const deletionAudit = await call("/logs");
  const deletionEvents = deletionAudit.data
    .filter((log) => log.certificateId === deleteId)
    .map((log) => log.action)
    .sort();
  assert.deepEqual(deletionEvents, ["CERTIFICATE_CREATED", "CERTIFICATE_DELETED"]);
});
