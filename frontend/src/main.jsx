import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, ArrowRight, BadgeCheck, BookOpenText, Check, CircleHelp, ClipboardCheck, FileBadge2, FilePlus2, Fingerprint, LayoutDashboard, LoaderCircle, LogOut, Search, ShieldCheck, ShieldX, Stamp, Trash2, X } from "lucide-react";
import "./styles.css";

const routes = [
  ["overview", "Overview", LayoutDashboard],
  ["create", "Issue certificate", FilePlus2],
  ["verify", "Verify a record", Search],
  ["revoke", "Revoke certificate", ShieldX],
  ["activity", "Audit activity", Activity]
];
const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
};

function App() {
  const [user, setUser] = useState(() => localStorage.getItem("trustgrid-user"));
  const [page, setPage] = useState("overview");
  const [certificates, setCertificates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [items, events] = await Promise.all([api("/certificates"), api("/logs")]);
      setCertificates(items);
      setLogs(events);
    } catch (error) { setNotice({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (user) refresh(); }, [user]);
  async function run(action, message) {
    try { const result = await action(); setNotice({ type: "success", text: message }); await refresh(); return result; }
    catch (error) { setNotice({ type: "error", text: error.message }); throw error; }
  }
  function login(name) { localStorage.setItem("trustgrid-user", name); setUser(name); setNotice({ type: "success", text: `Welcome back, ${name}.` }); }
  function logout() { localStorage.removeItem("trustgrid-user"); setUser(null); setPage("overview"); setNotice(null); }
  if (!user) return <Login onLogin={login} />;
  const title = routes.find(([id]) => id === page)?.[1] || "Overview";

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => setPage("overview")}><span className="brand-icon"><Fingerprint size={22} /></span><span className="brand-title">trust<span>grid</span><small>REGISTRY CONSOLE</small></span></a>
      <div className="nav-label">WORKSPACE</div><nav>{routes.map(([id, label, Icon]) => <button key={id} className={`nav-link ${page === id ? "selected" : ""}`} onClick={() => { setPage(id); setNotice(null); }}><Icon size={17} /><span>{label}</span>{id === "activity" && <i>{logs.length}</i>}</button>)}</nav>
      <div className="side-bottom"><div className="online"><i /> Registry online</div><div className="user-row"><span className="avatar">{user.slice(0, 1).toUpperCase()}</span><span className="user-info"><b>{user}</b><small>Administrator</small></span><button title="Log out" aria-label="Log out" className="icon-button" onClick={logout}><LogOut size={16} /></button></div><small className="side-caption">TRUSTGRID · ACADEMIC CREDENTIALS</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Workspace <ArrowRight size={13} /> <b>{title}</b></div><div className="top-actions"><span>DIGITAL CREDENTIALS</span><i /><button className="icon-button" title="Help" aria-label="Help"><CircleHelp size={18} /></button></div></header>
      <div className="content">
        {notice && <div className={`notice ${notice.type}`} role="status">{notice.type === "success" ? <Check size={16} /> : <X size={16} />}{notice.text}<button className="icon-button" aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}
        {page === "overview" && <Dashboard certificates={certificates} logs={logs} loading={loading} refresh={refresh} navigate={setPage} deleteCertificate={(cert) => run(() => api(`/certificates/${encodeURIComponent(cert.certificateId)}`, { method: "DELETE", body: JSON.stringify({ user }) }), "Certificate deleted and recorded in the audit log.")} />}
        {page === "create" && <Create onCreate={(fields) => run(() => api("/certificates", { method: "POST", body: JSON.stringify({ ...fields, user }) }), "Certificate issued and recorded in the audit log.")} />}
        {page === "verify" && <Verify />}
        {page === "revoke" && <Revoke user={user} onRevoke={(id) => run(() => api(`/revoke/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ user }) }), "Certificate status updated and recorded in the audit log.")} />}
        {page === "activity" && <Audit logs={logs} loading={loading} refresh={refresh} />}
      </div>
    </main>
  </div>;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("admin"), [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await api("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }); onLogin(result.user.username); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <main className="login-layout"><section className="login-aside"><a className="brand" href="#"><span className="brand-icon"><Fingerprint size={22} /></span><span className="brand-title">trust<span>grid</span><small>REGISTRY CONSOLE</small></span></a><div className="editorial"><div className="eyebrow"><i /> CREDENTIALS, WITH CONFIDENCE</div><h1>Proof that<br />travels with <em>you.</em></h1><p>A clear, reliable home for academic credentials. Issue, verify, and protect every certificate in one place.</p></div><div className="aside-foot"><ShieldCheck size={16} /> Secure Digital Certificate Verification <span>· TrustGrid</span></div></section><section className="login-main"><form className="login-form" onSubmit={submit}><span className="login-mark"><Stamp size={21} /></span><div className="eyebrow">ADMIN ACCESS</div><h2>Welcome back</h2><p>Sign in to manage your certificate registry.</p><label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>{error && <div className="error-box" role="alert">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}{busy ? "Signing in..." : "Sign in"}</button><div className="demo-hint">Demo access: <b>admin</b> / <b>admin123</b></div></form><small className="login-caption">TRUSTGRID · SECURE DIGITAL CERTIFICATES</small></section></main>;
}

function Heading({ eyebrow, title, description, action }) { return <div className="heading"><div><div className="eyebrow"><i /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function Dashboard({ certificates, logs, loading, refresh, navigate, deleteCertificate }) {
  const metrics = [[FileBadge2, "Total certificates", certificates.length, "All credentials in registry", "mint"], [BadgeCheck, "Valid certificates", certificates.filter(c => c.status === "VALID").length, "Currently verifiable", "green"], [ShieldX, "Revoked certificates", certificates.filter(c => c.status === "REVOKED").length, "No longer active", "coral"], [Activity, "Audit events", logs.length, "Actions recorded", "gold"]];
  return <><Heading eyebrow="REGISTRY OVERVIEW" title="Good work starts with trust." description="A live view of issued credentials and recent registry activity." action={<button className="secondary" onClick={refresh}><LoaderCircle size={15} className={loading ? "spin" : ""} /> Refresh</button>} /><div className="metrics">{metrics.map(([Icon, label, value, detail, tone]) => <section key={label} className={`metric ${tone}`}><div><Icon size={17} /><span>{label}</span></div><strong>{value}</strong><small>{detail}</small></section>)}</div><div className="dash-grid"><section className="panel"><PanelHead kicker="REGISTRY" title="Recent certificates" action={<button className="text-action" onClick={() => navigate("verify")}>Verify a record <ArrowRight size={14} /></button>} />{certificates.length ? <div className="cert-list">{certificates.slice(0, 6).map(cert => <CertificateRow key={cert.certificateId} cert={cert} onDelete={deleteCertificate} />)}</div> : <Empty icon={FileBadge2} title="No certificates yet" text="New credentials will appear here." action={() => navigate("create")} actionText="Issue first certificate" />}</section><section className="panel"><PanelHead kicker="AUDIT TRAIL" title="Recent activity" action={<button className="icon-button" aria-label="View activity" onClick={() => navigate("activity")}><ArrowRight size={16} /></button>} />{logs.length ? <div className="event-list">{logs.slice(0, 5).map(log => <Event key={log._id} log={log} />)}</div> : <Empty icon={Activity} title="No activity recorded" text="Certificate actions will be logged automatically." />}</section></div><div className="quick-actions"><div><small>GET STARTED</small><b>What would you like to do?</b></div><button onClick={() => navigate("create")}><FilePlus2 size={16} /> Issue certificate <ArrowRight size={14} /></button><button onClick={() => navigate("verify")}><ClipboardCheck size={16} /> Verify a certificate <ArrowRight size={14} /></button><button onClick={() => navigate("revoke")}><ShieldX size={16} /> Revoke a certificate <ArrowRight size={14} /></button></div></>;
}
function PanelHead({ kicker, title, action }) { return <div className="panel-head"><div><small>{kicker}</small><h2>{title}</h2></div>{action}</div>; }
function CertificateRow({ cert, onDelete }) {
  function confirmDelete() {
    if (!window.confirm(`Delete ${cert.studentName}'s certificate ${cert.certificateId}? This cannot be undone.`)) return;
    onDelete(cert).catch(() => {});
  }
  return <div className="cert-row"><span className="cert-icon"><FileBadge2 size={16} /></span><span className="cert-copy"><b>{cert.studentName}</b><small>{cert.course} · {cert.college}</small></span><code>{cert.certificateId}</code><Status value={cert.status} /><time>{new Date(cert.issueDate).toLocaleDateString()}</time><button className="delete-button" type="button" title="Delete certificate" aria-label={`Delete ${cert.studentName}'s certificate`} onClick={confirmDelete}><Trash2 size={14} /></button></div>;
}
function Event({ log }) { return <div className="event-row"><span className={`event-icon ${log.action === "CERTIFICATE_CREATED" ? "created" : "revoked"}`}>{log.action === "CERTIFICATE_CREATED" ? <FilePlus2 size={14} /> : <ShieldX size={14} />}</span><span><b>{log.action.replaceAll("_", " ").toLowerCase()}</b><small>{log.certificateId} · {log.user || "system"}</small></span><time>{new Date(log.timestamp).toLocaleDateString()}</time></div>; }
function Status({ value }) { return <span className={`status ${value === "VALID" ? "valid" : "revoked"}`}><i />{value}</span>; }
function Empty({ icon: Icon, title, text, action, actionText }) { return <div className="empty"><span><Icon size={20} /></span><b>{title}</b><p>{text}</p>{action && <button className="text-action" onClick={action}>{actionText}<ArrowRight size={14} /></button>}</div>; }
function Field({ label, value, onChange, placeholder, minLength }) { return <label>{label}<input value={value} onChange={onChange} placeholder={placeholder} minLength={minLength} required /></label>; }
function Detail({ label, value }) { return <div><small>{label}</small><b>{value}</b></div>; }
function Result({ cert, revoked = false }) { const good = cert.status === "VALID"; return <section className={`result ${good ? "" : "result-revoked"}`}><div className="result-head"><span>{good ? <BadgeCheck size={19} /> : <ShieldX size={19} />}</span><div><small>{revoked ? "STATUS UPDATED" : "VERIFICATION RESULT"}</small><h2>{revoked ? cert.message || "Certificate revoked" : good ? "Certificate is authentic" : "Certificate has been revoked"}</h2></div><Status value={cert.status} /></div><div className="result-id"><small>Certificate ID</small><code>{cert.certificateId}</code></div><div className="details"><Detail label="Student" value={cert.studentName} /><Detail label="Course" value={cert.course} /><Detail label="College" value={cert.college} /><Detail label="Issue date" value={new Date(cert.issueDate).toLocaleDateString()} /></div></section>; }

function Create({ onCreate }) {
  const [form, setForm] = useState({ studentName: "", course: "", college: "" }), [created, setCreated] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); try { const data = await onCreate(form); setCreated(data.certificate); setForm({ studentName: "", course: "", college: "" }); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <><Heading eyebrow="ISSUE CREDENTIAL" title="Create a certificate" description="Add a new academic achievement to the registry." /><div className="workflow"><section className="panel form-panel"><PanelHead kicker="CERTIFICATE DETAILS" title="Recipient information" /><form onSubmit={submit}><Field label="Student name" value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} placeholder="e.g. Diya Sharma" minLength={2} /><Field label="Course or qualification" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} placeholder="e.g. Computer Engineering" minLength={2} /><Field label="College or institution" value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} placeholder="e.g. ABC College" minLength={2} />{error && <div className="error-box">{error}</div>}<div className="form-footer"><span><ShieldCheck size={14} /> Status is set to VALID on issue</span><button className="primary" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <FilePlus2 size={15} />}{busy ? "Creating..." : "Create certificate"}</button></div></form></section><aside className="workflow-note"><span className="note-icon"><BookOpenText size={19} /></span><small>HOW IT WORKS</small><h3>A unique record, ready to verify.</h3><p>TrustGrid assigns a unique certificate ID and saves it to the shared registry.</p><hr /><p><b>01</b> Student details are stored in the registry.</p><p><b>02</b> An audit event is recorded automatically.</p></aside></div>{created && <Result cert={created} />}</>;
}
function Verify() {
  const [id, setId] = useState(""), [cert, setCert] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setCert(null); setBusy(true); setError(""); try { setCert(await api(`/verify/${encodeURIComponent(id.trim())}`)); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <><Heading eyebrow="PUBLIC VERIFICATION" title="Verify a certificate" description="Check the live status of a credential against the shared registry." /><div className="verify-wrap"><section className="panel verify-panel"><div className="verify-art"><span><Fingerprint size={34} /></span></div><div className="verify-copy"><small>REGISTRY LOOKUP</small><h2>Is this credential genuine?</h2><p>Enter the unique ID printed on the certificate.</p><form onSubmit={submit}><label className="lookup"><Search size={17} /><input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. TG123456789" required /></label><button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <ArrowRight size={15} />} Verify</button></form>{error && <div className="error-box" role="alert">{error}</div>}</div></section>{cert ? <Result cert={cert} /> : !error && <div className="verify-foot"><ShieldCheck size={14} /> Results are checked against the live certificate database.</div>}</div></>;
}
function Revoke({ user, onRevoke }) {
  const [id, setId] = useState(""), [result, setResult] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); try { setResult(await onRevoke(id.trim())); } catch (e) { setResult(null); setError(e.message); } finally { setBusy(false); } }
  return <><Heading eyebrow="REGISTRY CONTROL" title="Revoke a certificate" description="Immediately mark a credential as no longer valid." /><div className="workflow"><section className="panel form-panel"><div className="warning"> <ShieldX size={17} /> Revocation takes effect immediately and cannot be undone.</div><form onSubmit={submit}><Field label="Certificate ID" value={id} onChange={e => setId(e.target.value)} placeholder="e.g. TG123456789" />{error && <div className="error-box" role="alert">{error}</div>}<div className="form-footer"><span><CircleHelp size={14} /> Verify the ID before proceeding</span><button className="danger" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <ShieldX size={15} />}{busy ? "Revoking..." : "Revoke certificate"}</button></div></form></section><aside className="workflow-note warning-note"><span className="note-icon"><ShieldCheck size={19} /></span><small>BEFORE YOU CONTINUE</small><h3>Revoked means no longer valid.</h3><p>Anyone verifying this certificate will immediately see its REVOKED status.</p><hr /><p><b>!</b> This action is added to the audit trail.</p></aside></div>{result && <Result cert={result} revoked />}</>;
}
function Audit({ logs, loading, refresh }) { return <><Heading eyebrow="TRANSPARENCY & OVERSIGHT" title="Audit activity" description="A chronological record of important actions in the certificate registry." action={<button className="secondary" onClick={refresh}><LoaderCircle size={15} className={loading ? "spin" : ""} /> Refresh</button>} /><section className="panel audit"><PanelHead kicker="EVENT HISTORY" title={`${logs.length} recorded ${logs.length === 1 ? "event" : "events"}`} /><div className="table-wrap"><table><thead><tr><th>Action</th><th>Certificate ID</th><th>User</th><th>Timestamp</th></tr></thead><tbody>{logs.map(log => <tr key={log._id}><td><span className={`action-name ${log.action.includes("REVOKED") ? "" : "created-action"}`}><i />{log.action.replaceAll("_", " ")}</span></td><td><code>{log.certificateId}</code></td><td>{log.user || "system"}</td><td>{new Date(log.timestamp).toLocaleString()}</td></tr>)}</tbody></table></div>{!logs.length && <Empty icon={Activity} title="Your audit trail is empty" text="Certificate actions are recorded automatically." />}</section></>; }

createRoot(document.getElementById("root")).render(<App />);
