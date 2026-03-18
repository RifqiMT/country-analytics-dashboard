# Focista Schedulo

Plan with clarity, focus without noise, and celebrate what you complete.

Focista Schedulo is a cross-platform to-do application focused on **rich task metadata**, **project grouping**, **recurring scheduling**, **calendar + day agenda views**, **voice-to-form input**, **export**, and **light gamification**.

## Product benefits

- **Clarity**: tasks support priority, labels, location, reminders, deadlines, and duration.
- **Control**: projects + bulk move/delete let you reorganize quickly.
- **Trust**: recurring series use stable IDs (parent/child) so edits/completions don’t “fork” the series.
- **Planning**: month calendar + hourly day agenda makes scheduling realistic.
- **Speed**: voice input captures tasks faster and auto-populates structured fields.
- **Ownership**: export everything to JSON or CSV at any time.

## Tech stack

- **Frontend**: React + TypeScript, Vite dev/build, CSS variables theme system
- **Backend**: Node.js + Express + TypeScript, Zod validation, JSON file persistence
- **Monorepo**: npm workspaces (`backend`, `frontend`)

## Packages

- `backend` – Node + Express + TypeScript API
- `frontend` – React + Vite + TypeScript SPA

## Documentation

- `docs/README.md` (index)
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DESIGN_GUIDELINES.md`
- `docs/VARIABLES.md`
- `docs/PRODUCT_METRICS.md` and `docs/METRICS_AND_OKRS.md`
- `docs/USER_PERSONAS.md` and `docs/USER_STORIES.md`

## Running in development

From the `focista-schedulo` directory:

```bash
npm install
npm run dev
```

Open the URL printed by the frontend dev server (typically `http://localhost:5173`).

If `5173` is already in use, Vite will automatically pick the next available port (e.g., `5174`).

## Useful scripts

- `npm run dev`: start backend + frontend together
- `npm run dev:backend`: start backend only (`http://localhost:4000`)
- `npm run dev:frontend`: start frontend only (proxied `/api` → `http://localhost:4000`)
- `npm run build`: build backend + frontend
- `npm run lint`: lint backend + frontend

## Key concepts

- **Tasks**: title, description, priority, due date/time, duration, repetition, labels, location, reminder offset, deadline, completion state, optional project.
- **Projects**: groups of tasks with stable IDs `P1`, `P2`, ...
- **Recurring series**: stable `parentId` (`YYYYMMDD-N`) and `childId` (`${parentId}-${index}`) across edits/completion/reactivation.
- **Calendar**: month view + day agenda timeline (hourly) with multi-day duration segmentation.
- **Voice input**: speak naturally to populate task fields (priority, date/time, duration, repeat, reminder, labels, location).
- **Export**: one-button export of all projects + tasks to JSON or CSV.
- **Gamification**: points per completed task (low=1, medium=2, high=3, urgent=4), plus level/XP and streak indicators.

## Data and persistence

- The backend persists tasks/projects to JSON under `backend/data/` for local development simplicity.
- **Important**: these files are intentionally not committed:
  - `backend/data/*.json` is ignored by git (local-only).

## Repo conventions (engineering)

- Prefer **TypeScript-first** changes; validate inputs with Zod in the backend.
- Keep recurrence/identity logic backend-enforced (IDs and migrations) to preserve trust.
- When changing fields/metrics, update `docs/VARIABLES.md` and the PRD/Architecture accordingly.

