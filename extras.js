// Team matching, projects, careers and profile-dashboard API (plain Node, no deps).
const crypto = require("crypto");
const L = a => (a || []).map(s => String(s).trim().toLowerCase()).filter(Boolean);
const list = v => Array.isArray(v) ? v : String(v || "").split(",").map(s => s.trim()).filter(Boolean);
const pub = p => ({ id: p.id, name: p.name, role: p.role, skills: p.skills, interests: p.interests });

const seeds = {
  members: [
    { id: "m1", name: "Aarav S.", role: "Frontend Developer", skills: ["javascript", "react", "html", "css"], interests: "web, startups" },
    { id: "m2", name: "Meera K.", role: "UI/UX Designer", skills: ["ui/ux", "figma", "design", "research"], interests: "product, startups" },
    { id: "m3", name: "Rohan P.", role: "Data Analyst", skills: ["python", "excel", "data analysis", "analytics"], interests: "data, finance" },
    { id: "m4", name: "Sana M.", role: "Market Researcher", skills: ["research", "communication", "strategy", "analysis"], interests: "market, social impact" },
    { id: "m5", name: "Dev T.", role: "Project Lead", skills: ["planning", "communication", "business", "teamwork"], interests: "startups, innovation" },
    { id: "m6", name: "Ishita R.", role: "Full-stack Developer", skills: ["python", "react", "javascript", "prototyping"], interests: "ai, mvp, web" }
  ],
  projects: [
    { id: "proj-1", title: "Onboarding Redesign", org: "PayNest (sample fintech)", category: "Design", weeks: 4, teamSize: 4, level: "Beginner friendly", skills: ["UI/UX", "Figma", "Research"], summary: "Cut drop-off in a sign-up flow by testing and redesigning each step.", milestones: ["Audit the current flow", "Interview 5 users", "Design wireframes", "Present prototype"] },
    { id: "proj-2", title: "Local Shop Website", org: "GreenLeaf Grocers (sample MSME)", category: "Development", weeks: 3, teamSize: 3, level: "Beginner friendly", skills: ["HTML", "CSS", "JavaScript"], summary: "Build a fast, mobile-first site with a product catalogue and order enquiry form.", milestones: ["Agree page structure", "Build responsive layout", "Add catalogue + form", "Launch and hand over"] },
    { id: "proj-3", title: "Customer Churn Insights", org: "StreamBox (sample SaaS)", category: "Data", weeks: 4, teamSize: 3, level: "Intermediate", skills: ["Python", "Excel", "Data analysis"], summary: "Explore a sample dataset and recommend three actions to retain subscribers.", milestones: ["Clean the dataset", "Find churn drivers", "Build charts", "Present recommendations"] },
    { id: "proj-4", title: "Market Entry Study", org: "AgroLink (sample startup)", category: "Research", weeks: 3, teamSize: 4, level: "All levels", skills: ["Research", "Strategy", "Communication"], summary: "Size a new regional market and shortlist the first 10 customers to approach.", milestones: ["Define market segments", "Collect 15 data points", "Draft report", "Pitch findings"] },
    { id: "proj-5", title: "48-Hour MVP Sprint", org: "VentureBridge Sprint", category: "Innovation", weeks: 1, teamSize: 5, level: "All levels", skills: ["Ideation", "Teamwork", "Prototyping"], summary: "Turn a problem statement into a clickable MVP and a 3-minute pitch.", milestones: ["Pick the problem", "Sketch solution", "Build prototype", "Pitch"] }
  ],
  careers: [
    { id: "career-1", title: "UX Design Intern", org: "Sample: Orbit Labs", type: "Internship", location: "Remote", skills: ["UI/UX", "Figma", "Research"] },
    { id: "career-2", title: "Frontend Developer Intern", org: "Sample: BrightCart", type: "Internship", location: "Hybrid", skills: ["HTML", "CSS", "JavaScript", "React"] },
    { id: "career-3", title: "Junior Data Analyst", org: "Sample: Finlytics", type: "Full-time", location: "On-site", skills: ["Python", "Excel", "Data analysis"] },
    { id: "career-4", title: "Brand Research Project", org: "Sample: Kiran & Co.", type: "Paid project", location: "Remote", skills: ["Research", "Communication", "Analysis"] },
    { id: "career-5", title: "Founding Product Associate", org: "Sample: Seedling", type: "Startup", location: "Remote", skills: ["Planning", "Prototyping", "Communication"] },
    { id: "career-6", title: "Landing Page Freelance Gig", org: "Sample: PetPal", type: "Paid project", location: "Remote", skills: ["HTML", "CSS", "UI/UX"] }
  ],
  memberships: [], invites: [], saved: []
};
const GOALS = {
  "Build a product prototype": ["ui/ux", "figma", "javascript", "react", "planning"],
  "Analyze business data": ["python", "excel", "data analysis", "research", "communication"],
  "Research a market": ["research", "strategy", "analysis", "communication", "excel"],
  "Develop a website": ["html", "css", "javascript", "react", "ui/ux"]
};

function migrate(db) {
  let dirty = false;
  for (const k of Object.keys(seeds)) if (!db[k]) { db[k] = JSON.parse(JSON.stringify(seeds[k])); dirty = true; }
  return dirty;
}

function dashboard(db, p) {
  const projects = db.memberships.filter(m => m.profileId === p.id).map(m => {
    const pr = db.projects.find(x => x.id === m.projectId);
    return { ...pr, done: m.done, pct: Math.round(100 * m.done.filter(Boolean).length / pr.milestones.length) };
  });
  return {
    profile: p, projects,
    applications: db.applications.filter(a => a.email.toLowerCase() === p.email.toLowerCase()),
    saved: db.saved.filter(s => s.profileId === p.id).map(s => s.careerId),
    invites: db.invites.filter(i => i.profileId === p.id)
  };
}

function rank(db, b) {
  const mine = L(list(b.skills)), req = GOALS[b.goal] || GOALS["Build a product prototype"];
  const gaps = req.filter(s => !mine.includes(s)), need = gaps.length ? gaps : req;
  const myInt = L(list(b.interests));
  const pool = [...db.members, ...db.profiles.filter(p => p.id !== b.profileId && p.role === "Student").map(pub)];
  return pool.map(c => {
    const has = L(c.skills), covers = need.filter(s => has.includes(s));
    const shared = L(list(c.interests)).filter(i => myInt.includes(i));
    const score = Math.min(99, Math.round(80 * covers.length / need.length + (shared.length ? 20 : 5)));
    const why = [];
    if (covers.length) why.push(`Covers your gaps: ${covers.join(", ")}`);
    if (shared.length) why.push(`Shared interest: ${shared.join(", ")}`);
    if (!why.length) why.push("Different strengths — could broaden the team");
    return { ...pub(c), skills: c.skills, score, why, demo: String(c.id).startsWith("m") && c.id.length < 4 };
  }).sort((a, z) => z.score - a.score).slice(0, 5);
}

function route(method, url, db, b) {
  const parts = url.pathname.split("/").filter(Boolean).slice(1), [r, id, act] = parts;
  const ok = (payload, dirty = false, status = 200) => ({ status, payload, dirty });
  const err = (status, error) => ({ status, payload: { error }, dirty: false });
  const me = () => db.profiles.find(p => p.id === b.profileId);

  if (r === "profiles" && id === "lookup" && method === "POST") {
    const p = db.profiles.find(x => x.email.toLowerCase() === String(b.email || "").trim().toLowerCase());
    return p ? ok(dashboard(db, p)) : err(404, "No profile found for that email.");
  }
  if (r === "profiles" && id && method === "GET") {
    const p = db.profiles.find(x => x.id === id);
    return p ? ok(dashboard(db, p)) : err(404, "Profile not found.");
  }
  if (r === "profiles" && id && method === "PUT") {
    const p = db.profiles.find(x => x.id === id);
    if (!p) return err(404, "Profile not found.");
    if (!String(b.name || "").trim()) return err(400, "Name is required.");
    Object.assign(p, { name: String(b.name).trim(), role: b.role || p.role, skills: list(b.skills), interests: String(b.interests || ""), goals: String(b.goals || "") });
    return ok(dashboard(db, p), true);
  }
  if (r === "matches" && method === "POST") {
    if (!list(b.skills).length) return err(400, "Add at least one skill to find matches.");
    return ok({ matches: rank(db, b), needed: GOALS[b.goal] || [] });
  }
  if (r === "invites" && method === "POST") {
    if (!me()) return err(400, "Create a profile first.");
    if (db.invites.some(i => i.profileId === b.profileId && i.memberId === b.memberId)) return err(409, "You already invited this teammate.");
    const m = db.members.find(x => x.id === b.memberId) || db.profiles.find(x => x.id === b.memberId);
    if (!m) return err(404, "Teammate not found.");
    db.invites.push({ id: crypto.randomUUID(), profileId: b.profileId, memberId: m.id, memberName: m.name, goal: b.goal || "", status: "Invitation sent", createdAt: new Date().toISOString() });
    return ok({ message: `Invitation sent to ${m.name.replace(/\.$/, "")}.` }, true, 201);
  }
  if (r === "projects" && !id && method === "GET") return ok({ projects: db.projects });
  if (r === "projects" && act === "join" && method === "POST") {
    const pr = db.projects.find(x => x.id === id);
    if (!pr) return err(404, "Project not found.");
    if (!me()) return err(400, "Create a profile first.");
    if (db.memberships.some(m => m.profileId === b.profileId && m.projectId === id)) return err(409, "You already joined this project.");
    db.memberships.push({ id: crypto.randomUUID(), profileId: b.profileId, projectId: id, done: pr.milestones.map(() => false), joinedAt: new Date().toISOString() });
    return ok({ message: `You joined “${pr.title}”.` }, true, 201);
  }
  if (r === "projects" && act === "milestone" && method === "POST") {
    const m = db.memberships.find(x => x.profileId === b.profileId && x.projectId === id);
    if (!m || !(b.index in m.done)) return err(404, "Milestone not found.");
    m.done[b.index] = !m.done[b.index];
    return ok({ done: m.done }, true);
  }
  if (r === "careers" && !id && method === "GET") return ok({ careers: db.careers });
  if (r === "careers" && act === "save" && method === "POST") {
    if (!me()) return err(400, "Create a profile first.");
    const i = db.saved.findIndex(s => s.profileId === b.profileId && s.careerId === id);
    if (i >= 0) db.saved.splice(i, 1); else db.saved.push({ profileId: b.profileId, careerId: id });
    return ok({ saved: i < 0 }, true);
  }
  return null;
}
module.exports = { seeds, migrate, route };
