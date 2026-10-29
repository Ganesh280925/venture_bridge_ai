# VentureBridge AI — Prototype

A responsive frontend and lightweight backend based on the supplied VentureBridge AI homepage design and venture-journey presentation.

## Included prototype flows

- Landing page, value proposition, how-it-works, feature cards, FAQ and footer.
- Searchable/filterable sample opportunities.
- Student profile creation with skills, interests and goals.
- Opportunity detail and application/interest submission.
- Business challenge submission.
- Transparent rule-based team matching demo.
- JSON-backed API and persistent local prototype data.

## New in this version

- **Profile now shows up**: after saving, a profile dashboard opens (strength meter, stats, projects with milestone checklists, applications, team invitations). The header button turns into your avatar, the profile persists across reloads, and you can edit it, sign out, or sign back in with your email.
- **AI Team Matching, Real-World Projects and Career Opportunities now work** (hero pills, trust chips and matching feature cards open them): ranked teammate matches with reasons and invites; joinable projects with trackable milestones; careers with filters, skill-fit %, save and apply.
- `GET /api/profiles` no longer exposes email addresses.

## Run locally

Requirements: Node.js 18+ (no npm packages required).

```bash
npm start
```

Open http://localhost:3000.

## API endpoints

- `GET /api/opportunities?q=&category=`
- `GET /api/stats`
- `GET /api/profiles`
- `POST /api/profiles`
- `POST /api/applications`
- `POST /api/challenges`
- `GET/PUT /api/profiles/:id`, `POST /api/profiles/lookup`
- `POST /api/matches`, `POST /api/invites`
- `GET /api/projects`, `POST /api/projects/:id/join`, `POST /api/projects/:id/milestone`
- `GET /api/careers`, `POST /api/careers/:id/save` (apply via `POST /api/applications`)

Data is stored in `data/db.json`. Reset the prototype by stopping the server and replacing `data/db.json` with the seed structure in `server.js`, or delete the file and restart to recreate seed data.

## Important scope notes

- Opportunity records are sample data for demonstrating the provided concept, not verified live openings.
- Team matching is a rule-based interaction, not a connected AI service.
- Sign-in is email-only with no password (prototype stand-in), so do not deploy it publicly as is. Real authentication, email verification, production database, authorization, deployment, business review workflow, and real AI integrations are not included; these require product decisions and secure service credentials before production use.
- The uploaded journey PDF is image-based, so the implementation follows the supplied website mockup and readable visual content from the journey deck. Avoid presenting this prototype as a live/operational service.
