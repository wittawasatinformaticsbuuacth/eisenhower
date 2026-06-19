# Eisenhower Matrix

A personal task manager based on the Eisenhower prioritization framework — built with React, Vite, and Firebase.

## Features

- **4-quadrant matrix**: Do First, Schedule, Delegate, Eliminate
- **Facebook login** via Firebase Authentication
- **Real-time sync** with Firestore — tasks update instantly across devices
- **Per-user data** — each account sees only its own tasks
- Minimal, clean UI with no CSS framework

## Quadrants

| Quadrant | Label     | Criteria                   |
| -------- | --------- | -------------------------- |
| Q1       | Do First  | Urgent · Important         |
| Q2       | Schedule  | Not Urgent · Important     |
| Q3       | Delegate  | Urgent · Not Important     |
| Q4       | Eliminate | Not Urgent · Not Important |

## Tech Stack

- **React 18** + **Vite**
- **Firebase** (Authentication, Firestore, Hosting)
- Facebook OAuth via `signInWithPopup`

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project (see [DEPLOY.md](DEPLOY.md) for setup guide)
- A Facebook Developer App with OAuth configured

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_KEY=
VITE_AUTH_DOMAIN=
VITE_PROJECT_ID=
VITE_STORAGE_BUCKET=
VITE_MESSAGING_SENDER_ID=
VITE_APP_ID=
```

Get these values from your Firebase project settings.

### Run

```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # build to dist/
firebase deploy    # deploy to Firebase Hosting
```

> PowerShell does not support `&&` — run commands on separate lines.

## Project Structure

```
src/
  App.jsx       # Main app: auth state, Matrix, Quadrant components
  App.css       # Styles and CSS variables
  firebase.js   # Firebase initialization
  main.jsx      # React entry point
firestore.rules  # Firestore security rules
firebase.json    # Firebase Hosting config
```

## Firestore Data Model

```
/users/{uid}/tasks/{taskId}
  text      string    Task description
  q         string    Quadrant id: do | schedule | delegate | drop
  done      boolean   Completion state
  createdAt timestamp Server timestamp
```

Each user can only read and write their own tasks (enforced by Firestore rules).

## Deployment

See [DEPLOY.md](DEPLOY.md) for a step-by-step guide covering Firebase project creation, Facebook OAuth setup, and hosting deployment.
