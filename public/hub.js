// VentureBridge hub: profile dashboard, team matching, projects and careers.
const LS_KEY = "vb_profile_id";
const TABS = [["profile", "My Profile"], ["match", "Team Matching"], ["projects", "Projects"], ["careers", "Careers"]];
const GOALS = ["Build a product prototype", "Analyze business data", "Research a market", "Develop a website"];
let me = null, curTab = "profile";
const e = escapeHtml;
const initials = n => String(n).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const chips = a => (a || []).map(t => `<span class="tag">${e(t)}</span>`).join("");
const post = (url, body) => api(url, { method: "POST", body: JSON.stringify(body) });

async function loadMe() {
  const id = localStorage.getItem(LS_KEY);
  try { me = id ? await api(`/api/profiles/${id}`) : null; } catch { me = null; localStorage.removeItem(LS_KEY); }
  renderAuth();
}
function renderAuth() {
  const btn = $(".topbar > [data-open-profile]");
  btn.innerHTML = me ? `<span class="avatar sm">${e(initials(me.profile.name))}</span> ${e(me.profile.name.split(" ")[0])}` : "Get Started";
  btn.classList.toggle("signed-in", !!me);
  btn.setAttribute("aria-label", me ? "Open your profile" : "Get started");
}
function prefill(sel) {
  if (!me) return;
  const f = $(sel).elements; f.namedItem("name").value = me.profile.name; f.namedItem("email").value = me.profile.email;
}
function needProfile(msg = "Create a free profile first — it takes a minute.") { toast(msg); openProfileEntry(); }

function openProfileEntry() {
  if (me) return openHub("profile");
  openModal(profileForm() + `<p class="signin-line">Already have a profile? <button class="text-btn" id="signinBtn" type="button">Sign in with your email</button></p>`);
  $("#profileForm").addEventListener("submit", submitProfile);
  $("#signinBtn").addEventListener("click", () => {
    openModal(`<span class="eyebrow">WELCOME BACK</span><h2 id="modalTitle">Sign in</h2><p class="subtext">Prototype sign-in: enter the email you used for your profile. (No password in this prototype.)</p><form id="signinForm"><div class="field"><label for="siEmail">Email</label><input id="siEmail" type="email" required placeholder="you@example.com"></div><button class="btn" type="submit">Continue →</button></form>`);
    $("#signinForm").addEventListener("submit", async ev => {
      ev.preventDefault();
      try { const r = await post("/api/profiles/lookup", { email: $("#siEmail").value }); onProfileSaved(r.profile, false); }
      catch (err) { toast(err.message); }
    });
  });
}
async function onProfileSaved(p, isNew = true) {
  window.__welcome = isNew;
  localStorage.setItem(LS_KEY, p.id);
  await loadMe();
  openHub("profile");
}

function openHub(tab = "profile", opts = {}) {
  openModal('<div id="hub"></div>');
  modalContent.parentElement.classList.add("wide");
  hubTab(tab, opts);
}
async function hubTab(tab, opts = {}) {
  curTab = tab;
  $("#hub").innerHTML = `<div class="hub-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join("")}</div><div class="hub-body" id="hubBody"><div class="loading">Loading…</div></div>`;
  $$("[data-tab]").forEach(b => b.addEventListener("click", () => hubTab(b.dataset.tab)));
  try { await views[tab](opts); } catch (err) { $("#hubBody").innerHTML = `<p class="loading">${e(err.message)}</p>`; }
}
async function refresh() { await loadMe(); if ($("#hub")) hubTab(curTab); }

const views = {
  profile() {
    const body = $("#hubBody");
    if (!me) {
      body.innerHTML = `<div class="empty"><h2>Your profile lives here</h2><p>Create a profile to join projects, invite teammates, save careers and track your progress.</p><button class="btn" id="mkProfile">Create your profile →</button></div>`;
      return $("#mkProfile").addEventListener("click", openProfileEntry);
    }
    const { profile: p, projects, applications, saved, invites } = me;
    const strength = 20 + (p.skills.length >= 3 ? 20 : 0) + (p.interests ? 20 : 0) + (p.goals ? 20 : 0) + (projects.length || applications.length ? 20 : 0);
    body.innerHTML = `
      ${opts_welcome()}
      <div class="profile-head"><span class="avatar">${e(initials(p.name))}</span><div><h2 id="modalTitle">${e(p.name)}</h2><p class="muted">${e(p.role)} · ${e(p.email)}</p>
        <div class="meter" title="Profile strength"><i style="width:${strength}%"></i></div><small class="muted">Profile strength ${strength}%${strength < 100 ? " — add skills, interests, goals and join a project to reach 100%" : ""}</small></div>
        <div class="head-actions"><button class="btn btn-small" id="editProfile">Edit</button><button class="btn btn-small btn-outline dark" id="signOut">Sign out</button></div></div>
      <div class="stats"><div><b>${projects.length}</b>Projects</div><div><b>${applications.length}</b>Applications</div><div><b>${saved.length}</b>Saved roles</div><div><b>${invites.length}</b>Team invites</div></div>
      <div class="two-col"><section><h3>Skills</h3><div class="tags">${chips(p.skills) || '<span class="muted">No skills yet</span>'}</div><h3>Interests</h3><p class="muted">${e(p.interests) || "—"}</p><h3>Goals</h3><p class="muted">${e(p.goals) || "—"}</p></section>
      <section><h3>My projects</h3>${projects.length ? projects.map(pr => `<div class="mini"><b>${e(pr.title)}</b><div class="meter"><i style="width:${pr.pct}%"></i></div>${pr.milestones.map((m, i) => `<label class="check"><input type="checkbox" data-ms="${pr.id}:${i}" ${pr.done[i] ? "checked" : ""}> ${e(m)}</label>`).join("")}</div>`).join("") : '<p class="muted">None yet. <button class="text-btn" data-go="projects">Browse projects →</button></p>'}</section></div>
      <div class="two-col"><section><h3>Applications</h3>${applications.length ? applications.map(a => `<div class="row"><span>${e(a.opportunityTitle)}</span><em>${e(a.status)}</em></div>`).join("") : '<p class="muted">No applications yet. <button class="text-btn" data-go="careers">Explore careers →</button></p>'}</section>
      <section><h3>Team invitations</h3>${invites.length ? invites.map(i => `<div class="row"><span>${e(i.memberName)}</span><em>${e(i.status)}</em></div>`).join("") : '<p class="muted">No invites yet. <button class="text-btn" data-go="match">Find teammates →</button></p>'}</section></div>`;
    $$("[data-go]").forEach(b => b.addEventListener("click", () => hubTab(b.dataset.go)));
    $("#signOut").addEventListener("click", () => { localStorage.removeItem(LS_KEY); me = null; renderAuth(); closeModal(); toast("Signed out. Your profile is saved — sign in with your email anytime."); });
    $("#editProfile").addEventListener("click", editProfile);
    $$("[data-ms]").forEach(c => c.addEventListener("change", async () => { const [id, i] = c.dataset.ms.split(":"); try { await post(`/api/projects/${id}/milestone`, { profileId: p.id, index: +i }); refresh(); } catch (err) { toast(err.message); } }));
  },

  async match() {
    const p = me?.profile;
    $("#hubBody").innerHTML = `<h2 id="modalTitle">Find complementary teammates</h2><p class="subtext">A transparent rule-based match: we look at what your project goal needs, spot the skills you’re missing, and rank teammates who cover those gaps. Not a live AI model.</p>
      <form id="matchForm" class="match-form"><div class="field"><label for="mSkills">Your skills</label><input id="mSkills" required value="${e((p?.skills || []).join(", "))}" placeholder="Python, data analysis"></div>
      <div class="field"><label for="mGoal">Project goal</label><select id="mGoal">${GOALS.map(g => `<option>${g}</option>`).join("")}</select></div>
      <div class="field"><label for="mInt">Interests (optional)</label><input id="mInt" value="${e(p?.interests || "")}" placeholder="web, startups"></div>
      <button class="btn" type="submit">Find matches →</button></form><div id="matchOut"></div>`;
    $("#matchForm").addEventListener("submit", async ev => {
      ev.preventDefault();
      const out = $("#matchOut"); out.innerHTML = '<div class="loading">Matching…</div>';
      try {
        const r = await post("/api/matches", { profileId: p?.id, skills: $("#mSkills").value, goal: $("#mGoal").value, interests: $("#mInt").value });
        const invited = new Set((me?.invites || []).map(i => i.memberId));
        out.innerHTML = `<div class="cards">${r.matches.map(m => `<article class="person"><span class="avatar">${e(initials(m.name))}</span><div><h3>${e(m.name)} <small class="muted">${e(m.role)}</small></h3><div class="tags">${chips(m.skills)}</div><ul class="why">${m.why.map(w => `<li>${e(w)}</li>`).join("")}</ul>${m.demo ? '<small class="muted">Sample teammate for the demo</small>' : ""}</div><div class="score"><b>${m.score}%</b><small>match</small><button class="btn btn-small" data-invite="${e(m.id)}" ${invited.has(m.id) ? "disabled" : ""}>${invited.has(m.id) ? "Invited ✓" : "Invite"}</button></div></article>`).join("")}</div>`;
        $$("[data-invite]", out).forEach(b => b.addEventListener("click", async () => {
          if (!me) return needProfile("Create a profile to invite teammates.");
          try { const x = await post("/api/invites", { profileId: me.profile.id, memberId: b.dataset.invite, goal: $("#mGoal").value }); toast(x.message); b.disabled = true; b.textContent = "Invited ✓"; loadMe(); } catch (err) { toast(err.message); }
        }));
      } catch (err) { out.innerHTML = `<p class="loading">${e(err.message)}</p>`; }
    });
  },

  async projects() {
    const { projects } = await api("/api/projects");
    const joined = new Set((me?.projects || []).map(x => x.id));
    $("#hubBody").innerHTML = `<h2 id="modalTitle">Real-world projects</h2><p class="subtext">Join a brief, work through its milestones and track progress in your profile. Organizations shown are sample records for this prototype.</p><div class="cards">${projects.map(pr => `<article class="proj"><div class="proj-top"><span class="category">${e(pr.category)}</span><small class="muted">${pr.weeks} wk · team of ${pr.teamSize} · ${e(pr.level)}</small></div><h3>${e(pr.title)}</h3><p class="muted org">${e(pr.org)}</p><p>${e(pr.summary)}</p><div class="tags">${chips(pr.skills)}</div><ol class="ms">${pr.milestones.map(m => `<li>${e(m)}</li>`).join("")}</ol><button class="btn btn-small" data-join="${pr.id}" ${joined.has(pr.id) ? "disabled" : ""}>${joined.has(pr.id) ? "Joined ✓" : "Join project →"}</button></article>`).join("")}</div>`;
    $$("[data-join]").forEach(b => b.addEventListener("click", async () => {
      if (!me) return needProfile("Create a profile to join a project.");
      try { const r = await post(`/api/projects/${b.dataset.join}/join`, { profileId: me.profile.id }); toast(r.message); refresh(); } catch (err) { toast(err.message); }
    }));
  },

  async careers() {
    const { careers } = await api("/api/careers");
    const types = ["All", ...new Set(careers.map(c => c.type))];
    const mine = (me?.profile.skills || []).map(s => s.toLowerCase());
    const saved = new Set(me?.saved || []), applied = new Set((me?.applications || []).map(a => a.opportunityId));
    const draw = type => {
      $("#careerList").innerHTML = careers.filter(c => type === "All" || c.type === type).map(c => {
        const fit = mine.length ? Math.round(100 * c.skills.filter(s => mine.includes(s.toLowerCase())).length / c.skills.length) : null;
        return `<article class="proj"><div class="proj-top"><span class="category">${e(c.type)}</span><small class="muted">${e(c.location)}</small></div><h3>${e(c.title)}</h3><p class="muted org">${e(c.org)}</p><div class="tags">${chips(c.skills)}</div>${fit !== null ? `<div class="fit"><div class="meter"><i style="width:${fit}%"></i></div><small>${fit}% skill fit</small></div>` : ""}<div class="btn-row"><button class="btn btn-small" data-apply="${c.id}" ${applied.has(c.id) ? "disabled" : ""}>${applied.has(c.id) ? "Applied ✓" : "Apply →"}</button><button class="btn btn-small btn-outline dark" data-save="${c.id}" aria-pressed="${saved.has(c.id)}">${saved.has(c.id) ? "★ Saved" : "☆ Save"}</button></div></article>`;
      }).join("");
      $$("[data-apply]").forEach(b => b.addEventListener("click", async () => {
        if (!me) return needProfile("Create a profile to apply.");
        try { const r = await post("/api/applications", { opportunityId: b.dataset.apply, name: me.profile.name, email: me.profile.email, message: "Applied via Career Opportunities" }); toast(r.message); refresh(); } catch (err) { toast(err.message); }
      }));
      $$("[data-save]").forEach(b => b.addEventListener("click", async () => {
        if (!me) return needProfile("Create a profile to save roles.");
        try { await post(`/api/careers/${b.dataset.save}/save`, { profileId: me.profile.id }); refresh(); } catch (err) { toast(err.message); }
      }));
    };
    $("#hubBody").innerHTML = `<h2 id="modalTitle">Career opportunities</h2><p class="subtext">Internships, jobs, paid projects and startup roles. These are sample listings, not live openings.</p><div class="filters">${types.map((t, i) => `<button class="chip dark ${i ? "" : "on"}" data-type="${e(t)}">${e(t)}</button>`).join("")}</div><div class="cards" id="careerList"></div>`;
    $$("[data-type]").forEach(b => b.addEventListener("click", () => { $$("[data-type]").forEach(x => x.classList.toggle("on", x === b)); draw(b.dataset.type); }));
    draw("All");
  }
};
function opts_welcome() {
  const w = window.__welcome; window.__welcome = false;
  return w ? `<div class="welcome"><b>Welcome to VentureBridge, ${e(me.profile.name.split(" ")[0])}! 🎉</b> Your profile is saved. Next: <button class="text-btn" data-go="match">find teammates</button> · <button class="text-btn" data-go="projects">join a project</button> · <button class="text-btn" data-go="careers">explore careers</button></div>` : "";
}
function editProfile() {
  const p = me.profile;
  $("#hubBody").innerHTML = `<h2 id="modalTitle">Edit profile</h2><form id="editForm"><div class="form-grid"><div class="field"><label>Full name *</label><input name="name" required value="${e(p.name)}"></div><div class="field"><label>I am a</label><select name="role">${["Student", "Business", "Educator"].map(r => `<option ${r === p.role ? "selected" : ""}>${r}</option>`).join("")}</select></div><div class="field full"><label>Skills (comma-separated)</label><input name="skills" value="${e(p.skills.join(", "))}"></div><div class="field full"><label>Interests</label><input name="interests" value="${e(p.interests)}"></div><div class="field full"><label>Career goals</label><textarea name="goals">${e(p.goals)}</textarea></div></div><button class="btn" type="submit">Save changes</button></form>`;
  $("#editForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    try { await api(`/api/profiles/${p.id}`, { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(ev.currentTarget))) }); toast("Profile updated."); refresh(); } catch (err) { toast(err.message); }
  });
}

// Wire up every "open the hub" trigger: hero pills, trust chips, feature cards, how-it-works button.
$("#matchBtn").dataset.hub = "match";
[["match"], [null], ["profile"], ["projects"], ["projects"], [null], ["careers"]].forEach(([hub], i) => {
  const f = $$(".feature")[i]; if (!f || !hub) return;
  f.dataset.hub = hub; f.setAttribute("role", "button"); f.tabIndex = 0; f.classList.add("clickable");
  f.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); f.click(); } });
});
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-hub]"); if (!t) return;
  window.__welcome = false; openHub(t.dataset.hub);
});
loadMe();
