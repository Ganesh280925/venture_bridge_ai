const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const crypto = require("crypto");
const extras = require("./extras");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const DB_FILE = path.join(DATA, "db.json");
fs.mkdirSync(DATA, { recursive: true });

const seed = {
  opportunities: [
    { id: "opp-1", title: "Startup Product Design", category: "Design", type: "Project Type: Paid Project", tags: ["UI/UX", "Design", "Research"], description: "Shape a clear, user-friendly experience for an early-stage product team.", skills: ["UI/UX", "Figma", "Research"], level: "Beginner friendly" },
    { id: "opp-2", title: "Website Development", category: "Development", type: "Project Type: Internship", tags: ["React", "Web", "Frontend"], description: "Help a small team build and improve a responsive website.", skills: ["HTML", "CSS", "JavaScript"], level: "Beginner friendly" },
    { id: "opp-3", title: "Market Research", category: "Research", type: "Project Type: Project", tags: ["Research", "Strategy", "Data"], description: "Research customer needs and turn findings into practical recommendations.", skills: ["Research", "Communication", "Analysis"], level: "All levels" },
    { id: "opp-4", title: "Data Analysis", category: "Data", type: "Project Type: Project", tags: ["Python", "Excel", "Analytics"], description: "Explore a sample dataset and share insights that support a business decision.", skills: ["Python", "Excel", "Data analysis"], level: "Beginner friendly" },
    { id: "opp-5", title: "Prototype a New Idea", category: "Innovation", type: "Project Type: Challenge", tags: ["Prototype", "MVP", "Innovation"], description: "Work with a cross-functional team to turn a problem statement into an MVP concept.", skills: ["Ideation", "Teamwork", "Prototyping"], level: "All levels" }
  ],
  profiles: [],
  challenges: [],
  applications: []
};
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
{ const d = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); if (extras.migrate(d)) fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }
function send(res, status, payload, type="application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" });
  res.end(type.startsWith("application/json") ? JSON.stringify(payload) : payload);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".ico":"image/x-icon" };

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const db = readDB();
      if (req.method === "GET" && url.pathname === "/api/opportunities") {
        const q = (url.searchParams.get("q") || "").toLowerCase();
        const category = url.searchParams.get("category") || "All";
        const items = db.opportunities.filter(o =>
          (category === "All" || o.category === category) &&
          (!q || [o.title, o.description, o.category, ...o.tags, ...o.skills].join(" ").toLowerCase().includes(q))
        );
        return send(res, 200, { opportunities: items });
      }
      if (req.method === "GET" && url.pathname === "/api/stats")
        return send(res, 200, { opportunities: db.opportunities.length, profiles: db.profiles.length, challenges: db.challenges.length, applications: db.applications.length });
      if (req.method === "GET" && url.pathname === "/api/profiles")
        return send(res, 200, { profiles: db.profiles.map(({ email, ...rest }) => rest) });
      if (req.method === "POST" && url.pathname === "/api/profiles") {
        const b = await body(req);
        if (!b.name || !b.email) return send(res, 400, { error: "Name and email are required." });
        const profile = { id: crypto.randomUUID(), name: String(b.name).trim(), email: String(b.email).trim(), role: b.role || "Student", skills: Array.isArray(b.skills) ? b.skills : String(b.skills || "").split(",").map(s=>s.trim()).filter(Boolean), interests: b.interests || "", goals: b.goals || "", createdAt: new Date().toISOString() };
        db.profiles.push(profile); writeDB(db);
        return send(res, 201, { message: "Profile created.", profile });
      }
      if (req.method === "POST" && url.pathname === "/api/challenges") {
        const b = await body(req);
        if (!b.title || !b.organization || !b.description) return send(res, 400, { error: "Title, organization and challenge description are required." });
        const challenge = { id: `challenge-${Date.now()}`, title: String(b.title).trim(), organization: String(b.organization).trim(), category: b.category || "Business", description: String(b.description).trim(), skills: String(b.skills || "").split(",").map(s=>s.trim()).filter(Boolean), createdAt: new Date().toISOString(), status: "Submitted for review" };
        db.challenges.push(challenge); writeDB(db);
        return send(res, 201, { message: "Challenge submitted for review.", challenge });
      }
      if (req.method === "POST" && url.pathname === "/api/applications") {
        const b = await body(req);
        if (!b.opportunityId || !b.name || !b.email) return send(res, 400, { error: "Name, email and opportunity are required." });
        const opportunity = db.opportunities.find(o => o.id === b.opportunityId) || db.careers.find(o => o.id === b.opportunityId);
        if (!opportunity) return send(res, 404, { error: "Opportunity not found." });
        const duplicate = db.applications.find(a => a.opportunityId === b.opportunityId && a.email.toLowerCase() === String(b.email).toLowerCase());
        if (duplicate) return send(res, 409, { error: "You have already applied to this opportunity with this email." });
        const application = { id: `application-${Date.now()}`, opportunityId: opportunity.id, opportunityTitle: opportunity.title, name: String(b.name).trim(), email: String(b.email).trim(), message: b.message || "", createdAt: new Date().toISOString(), status: "Received" };
        db.applications.push(application); writeDB(db);
        return send(res, 201, { message: "Application received.", application });
      }
      const bodyData = ["POST", "PUT"].includes(req.method) ? await body(req) : {};
      const hit = extras.route(req.method, url, db, bodyData);
      if (hit) { if (hit.dirty) writeDB(db); return send(res, hit.status, hit.payload); }
      return send(res, 404, { error: "API route not found." });
    }
    let filePath = path.join(PUBLIC, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
    if (!filePath.startsWith(PUBLIC)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(PUBLIC, "index.html");
    return send(res, 200, fs.readFileSync(filePath), mime[path.extname(filePath)] || "application/octet-stream");
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: "Something went wrong. Please try again." });
  }
}).listen(PORT, () => console.log(`VentureBridge AI prototype running at http://localhost:${PORT}`));
