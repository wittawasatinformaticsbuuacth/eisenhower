# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at localhost:5173
npm run build     # build to dist/
firebase deploy   # deploy to Firebase Hosting (requires firebase-tools + login)
```

PowerShell does not support `&&` — run commands separately.

## Architecture

Single-page React app (Vite) with Firebase backend. No routing — auth state drives what renders.

**Auth flow** (`App.jsx`):
- `user === undefined` → blank (loading)
- `user === null` → `<Login>` (Facebook OAuth via `signInWithPopup`)
- `user` object → `<Matrix>`

**Data** — Firestore path: `/users/{uid}/tasks/{taskId}`
- Fields: `text`, `q` (quadrant id), `done`, `createdAt`
- `onSnapshot` subscription in `Matrix` keeps tasks live; unsubscribes on unmount
- All Firestore writes (add/update/delete) happen directly in components — no intermediate layer

**State** — all in `Matrix`, passed down to `Quadrant` as props:
- `tasks` — full flat array, filtered per quadrant inside `Quadrant`
- `activeQ` — which quadrant's input is open (only one at a time)
- `val` — controlled input value
- `inputRef` — single ref shared across quadrants, attached to whichever input is active

**Quadrant IDs**: `do`, `schedule`, `delegate`, `drop` — defined in `QS` array at top of `App.jsx`

**Styling**: CSS variables in `App.css` (`--q1` through `--q4` for accent colors, `--q1-bg` through `--q4-bg` for backgrounds). No CSS framework.

## Environment

Firebase config lives in `.env` (not committed). See `.env` for required `VITE_*` keys. All accessed via `import.meta.env` in `src/firebase.js`.

## Firestore Rules

Users can only read/write their own tasks. Rules in `firestore.rules` — deploy separately with `firebase deploy --only firestore:rules` or together with hosting via `firebase deploy`.
