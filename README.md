<div align="center">

# CONNEXUS

### Live Video Portal for Intercampus Communication

**A real-time video communication platform connecting PSBC Paete and PSBC Pagsanjan campuses through WebRTC-powered video sessions, instant messaging, bulletin boards, and live portal mode.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-5.12-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Real--time-FF6600?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

**Live Demo:** [frontend-seven-kappa-41.vercel.app](https://frontend-seven-kappa-41.vercel.app)

</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Conceptual Framework](#conceptual-framework)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Contributing](#contributing)

---

## About the Project

**CONNEXUS** is a capstone project built for PSBC (Polytechnic State College of the Philippines) connecting the Paete and Pagsanjan campuses through a live video portal. The platform enables:

- Real-time video communication between campuses via WebRTC
- Independent audio channels: cross-campus talk buttons and same-campus microphone
- Portal mode with three states: Portal, In Meeting, and Live
- Screen sharing with Google Meet-style layout
- Emergency broadcast system for campus-wide alerts
- Bulletin board with comments, reactions, and real-time push
- Recording with upload, playback, and management
- Secure authentication with JWT and optional 2FA (TOTP)
- Real-time chat with reactions, reply threading, and emoji responses

---

## Features

### Video and Audio

- Peer-to-peer WebRTC video calls between campuses
- Split-screen side-by-side view with campus branding (Paete = cyan, Pagsanjan = purple)
- HD/SD video quality toggle (720p/480p)
- Camera on/off with animated avatar indicator
- Screen sharing with Google Meet-style participant layout
- Camera/mic device hot-swap with live preview
- Mic level meter with real-time audio visualization

### Audio Settings

- HD Audio toggle (48kHz high-fidelity / 16kHz standard)
- Echo cancellation toggle
- Noise suppression toggle
- Auto gain control toggle
- Test microphone with real-time playback
- Test speakers with audio playback
- Per-device mic and speaker selection persisted to localStorage
- Settings sync across browser tabs via BroadcastChannel

### Portal Mode (3 States)

| State | Description |
|-------|-------------|
| **PORTAL** (Green) | Campus live feed active, controls disabled |
| **IN MEETING** (Amber) | Campus-only mode, restricted communication |
| **LIVE** (Cyan) | Full cross-campus communication enabled |

### Talk Modes

- Talk to Paete (cross-campus)
- Talk to Pagsanjan (cross-campus)
- Talk to Both campuses simultaneously
- Local mic for same-campus audio
- Mute/unmute with state preserved across mode switches

### Communication

- Real-time chat with All Campus and Campus-specific tabs
- Chat reply/quote threading
- Chat reactions (8 emoji options)
- Floating emoji reactions in video view
- Raise hand / lower hand
- Date separators and message grouping
- Disconnection feedback with error indicators

### Bulletin Board

- 3 announcement types: Bulletin, Info, Emergency
- Image attachments on bulletins
- External links on bulletins
- Reactions on bulletins (toggle with 6 emojis)
- Comments on bulletins (add/delete)
- Real-time bulletin push via Socket.IO
- Creator notification on reactions and comments
- Soft delete with edit/delete by creator
- Mark read / mark all read / clear notifications

### Recording

- Client-side MediaRecorder recording during sessions
- Upload to server (500MB max file size)
- Grid/list view with sort, search, and pagination
- Playback modal
- Soft delete, restore, and permanent delete

### Notifications

- Unread count badges on bell icon
- Mark read / mark all read
- Real-time push via Socket.IO
- Notification panel with tabs for Notifications and Bulletins
- Emergency alerts pushed to all users
- Bulletin creator notifications on reactions and comments
- Per-user targeted notifications via personal room tracking

### Emergency System

- Campus-scoped and broadcast emergency modes
- Admin/principal-only trigger
- Full-screen emergency alert overlay
- Emergency dismiss (admin = global, principal = campus-scoped)
- Emergency logged to database with audit trail

### Admin Dashboard

- User CRUD operations with role-based access
- User deactivation (soft delete, not hard delete)
- Session history with date filtering
- Audit logs with IP tracking
- Principal can create Staff only for their campus

### User Management

- Profile management with avatar upload
- Password change with audit logging
- Activity log tracking
- Role hierarchy: Principal, Admin, Teacher, Staff

### Settings

- Dedicated Camera and Audio settings pages with live device preview
- Video quality, mirror, HD Audio, echo, noise, gain toggles
- Auto reconnect, low latency, notification toggles
- Settings persistence to localStorage
- Settings toast notifications (ON/OFF pill feedback for every toggle)

### UI/UX

- Orbitron font for headings, Inter for body
- Campus-colored branding (Paete = cyan, Pagsanjan = purple)
- Camera permission error banners in Control Room and Campus View
- Chat send error state when disconnected
- Hand-raised indicator
- Peer talking indicator
- Split-screen side-by-side layout

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 6 | Build tool and dev server |
| Tailwind CSS 3 | Styling and design system |
| Zustand 5 | State management |
| React Router 6 | Client-side routing |
| Socket.IO Client | Real-time communication |
| Axios | HTTP client |
| Lucide React | Icon library |

### Backend

| Technology | Purpose |
|------------|---------|
| FastAPI | REST API framework |
| SQLAlchemy 2 | ORM and database management |
| PostgreSQL 17 | Primary database |
| python-socketio | WebSocket server |
| python-jose | JWT token handling |
| passlib + bcrypt | Password hashing |
| PyOTP | Two-Factor Authentication |
| Alembic | Database migrations |
| SlowAPI | Rate limiting |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Vercel | Frontend hosting and deployment |
| Render | Backend API hosting and deployment |
| Neon | Serverless PostgreSQL database |
| Google STUN Server | WebRTC NAT traversal |
| Socket.IO | Real-time event broadcasting |

---

## Architecture

```
+-----------------------------------------------------------------------+
|                           Frontend (Vercel)                             |
|             React + TypeScript + Tailwind CSS + Zustand                |
|                                                                       |
|   +-----------+  +-----------+  +-----------+  +-----------+          |
|   |  Campus   |  |  Control  |  |   Chat    |  |  Profile  |          |
|   |   View    |  |   Room    |  |  Panel    |  |  Settings |          |
|   +-----+-----+  +-----+-----+  +-----+-----+  +-----+-----+          |
|         |              |              |              |                 |
|         +--------------+--------------+--------------+                 |
|                            |                                          |
|                  +---------v----------+                               |
|                  |  HTTP / Socket.IO  |                               |
|                  +---------+----------+                               |
+----------------------------+------------------------------------------+
                             |
+----------------------------v------------------------------------------+
|                      Backend (Render)                                   |
|            FastAPI + SQLAlchemy + python-socketio                       |
|                                                                       |
|   +-----------+  +-----------+  +-----------+  +-----------+          |
|   |   Auth    |  |  Users    |  | Bulletin  |  |Recording  |          |
|   |  (JWT)    |  |   CRUD    |  |  Board    |  |  Upload   |          |
|   +-----+-----+  +-----+-----+  +-----+-----+  +-----+-----+          |
|         |              |              |              |                 |
|         +--------------+--------------+--------------+                 |
|                            |                                          |
|   +------------------------v--------------------------------------+   |
|   |              Signaling Server (Socket.IO)                      |   |
|   |  WebRTC Signaling / Room Management / Chat / Emergencies      |   |
|   +----------------------------+----------------------------------+   |
|                                |                                      |
|                  +-------------v-------------+                        |
|                  |   PostgreSQL 17 (Neon)    |                        |
|                  +---------------------------+                        |
+-----------------------------------------------------------------------+
```

---

## Conceptual Framework

The conceptual framework of **CONNEXUS** is grounded on the **Input–Process–Output (IPO) model**, the standard paradigm for describing information systems. It illustrates how people, hardware, software, data, and network resources flow through the system's core processes to produce measurable intercampus communication outcomes. The framework is supported by a system context diagram (Level-0 Data Flow Diagram), actor-based use cases, the development methodology, and the theoretical foundation of the platform.

### Input–Process–Output (IPO) Model

```mermaid
flowchart LR
  subgraph inputs["INPUTS"]
    direction TB
    I1["I1 Human Resources<br/>Administrator, Principal, Teacher, Staff"]
    I2["I2 Hardware Endpoints<br/>Campus TV, Webcam, Speakers<br/>Control Room PC, Camera, Microphone"]
    I3["I3 Software Technologies<br/>React, TypeScript, FastAPI<br/>Socket.IO, WebRTC, Tailwind CSS"]
    I4["I4 Data and Records<br/>Accounts, Bulletins, Chat Logs<br/>Recordings, Notifications, Audit Logs"]
    I5["I5 Network and Connectivity<br/>Internet, STUN and TURN Servers"]
    I6["I6 Cloud Services<br/>Vercel, Render, Neon PostgreSQL"]
  end

  subgraph processes["PROCESSING"]
    direction TB
    P1["P1 Authentication and Access Control<br/>JWT, Two-Factor Authentication, Role-Based Access"]
    P2["P2 Video Session and WebRTC Management<br/>Peer Mesh, Portal Modes, Screen Share, Talk Routing"]
    P3["P3 Collaboration and Communication<br/>Chat, Reactions, Bulletins, Notifications"]
    P4["P4 Emergency Broadcasting<br/>Role-Verified Trigger, Siren, Fullscreen Alert, Dismiss"]
    P5["P5 Content and Recording Management<br/>Record, Upload, Playback, Soft Delete"]
    P6["P6 Administration and Monitoring<br/>User CRUD, Dashboard, Session History, Audit Logs"]
  end

  subgraph outputs["OUTPUTS"]
    direction TB
    O1["O1 Secured Role-Scoped Access Session"]
    O2["O2 Live Intercampus Video Portal with Controlled Audio"]
    O3["O3 Real-Time Messaging and Announcement Dissemination"]
    O4["O4 Campus-Wide Emergency Alerts with Audit Trail"]
    O5["O5 Recorded Session Media Library"]
    O6["O6 Management Reports and System Audit Logs"]
  end

  inputs --> processes --> outputs
```

#### Inputs

| Ref | Category | Components |
|-----|----------|------------|
| **I1** | Human Resources | Four system roles — Administrator, Principal, Teacher, and Staff — serving PSBC Paete and PSBC Pagsanjan |
| **I2** | Hardware Endpoints | Campus endpoints (TV display, webcam, speakers) and the Control Room workstation (PC, camera, microphone, speakers) |
| **I3** | Software Technologies | React 18, TypeScript, Vite, Tailwind CSS, and Zustand on the client; FastAPI, SQLAlchemy, and python-socketio on the server; WebRTC and Socket.IO for real-time media |
| **I4** | Data and Records | User accounts, bulletin announcements, chat messages, session recordings, notifications, and audit logs |
| **I5** | Network and Connectivity | Internet connectivity, Google STUN servers, and optional TURN relay for NAT traversal |
| **I6** | Cloud Services | Vercel (frontend hosting), Render (API hosting), and Neon (serverless PostgreSQL) |

#### Processes

| Ref | Process | Key Activities |
|-----|---------|----------------|
| **P1** | Authentication and Access Control | Credential validation, JWT issuance with refresh rotation, TOTP two-factor authentication, role-based route guarding, and account lockout after failed attempts |
| **P2** | Video Session and WebRTC Management | Room join and leave, three-peer WebRTC mesh negotiation (offer, answer, and ICE exchanged via Socket.IO), Portal / In Meeting / Live states, screen presentation with Google Meet-style layout, and selective cross-campus talk routing |
| **P3** | Collaboration and Communication | Real-time chat with reply threading and emoji reactions, raise hand, floating reactions, bulletin board with comments, and push notifications |
| **P4** | Emergency Broadcasting | Server-side role verification, campus-scoped or broadcast delivery, synchronized siren and fullscreen alert overlay, dismissal, and database audit logging |
| **P5** | Content and Recording Management | Client-side session recording via MediaRecorder, validated server upload, playback, and soft delete with restore |
| **P6** | Administration and Monitoring | User CRUD with soft delete, session history, audit trail with IP tracking, dashboard statistics, and live system metrics |

#### Outputs

| Ref | Output | Description |
|-----|--------|-------------|
| **O1** | Secured Access Session | An authenticated, role-scoped session that grants only the capabilities permitted to the user's role |
| **O2** | Live Intercampus Video Portal | Real-time peer-to-peer audio and video among Paete, Pagsanjan, and the Control Room with selective talk routing and screen presentation |
| **O3** | Real-Time Information Dissemination | Instant messages and bulletin announcements pushed to every connected endpoint within milliseconds |
| **O4** | Emergency Alert and Audit Trail | Fullscreen alerts with audible siren — campus-scoped or campus-wide — each permanently recorded in the audit log |
| **O5** | Session Media Library | Uploaded recordings available for authenticated playback, restoration, and management |
| **O6** | Management Reports and Audit Logs | Dashboard statistics, session history, and an immutable audit trail for administrative review |

### System Context (Level-0 Data Flow Diagram)

The context diagram positions CONNEXUS between its four actor classes and the external services it depends on. Media flows **peer-to-peer** between endpoints; only signaling, chat, and persisted data pass through the server.

```mermaid
flowchart TD
  subgraph actors["System Actors"]
    A1["Administrator"]
    A2["Principal"]
    A3["Teacher"]
    A4["Staff"]
  end

  SYS["CONNEXUS System<br/>FastAPI REST API and Socket.IO Signaling Server"]

  subgraph services["External Services and Data Stores"]
    DB[("PostgreSQL 17 on Neon<br/>Users, Sessions, Bulletins, Recordings, Audit Logs")]
    NAT["Google STUN Server<br/>NAT Traversal Discovery"]
    HOST["Cloud Hosting<br/>Vercel Frontend, Render Backend"]
  end

  A1 -->|"User management, dashboard, global emergency control"| SYS
  A2 -->|"Control Room operation, campus emergency, bulletin posting"| SYS
  A3 -->|"Campus video session, chat, bulletin engagement"| SYS
  A4 -->|"Campus video session, chat, bulletin engagement"| SYS
  SYS <-->|"REST API and data persistence"| DB
  SYS <-->|"ICE and server reflexive address discovery"| NAT
  SYS -->|"Continuous deployment from GitHub"| HOST

  NOTE["Design Note: Audio and video travel peer-to-peer between endpoints over WebRTC. Only signaling, chat, and persisted data pass through the system."]
  SYS -.-> NOTE
```

### Use Cases by Actor

```mermaid
flowchart LR
  ADM(["Administrator"])
  PRN(["Principal"])
  TCH(["Teacher"])
  STF(["Staff"])

  subgraph boundary["CONNEXUS System Boundary"]
    UC1(["UC1 Authenticate with Password and 2FA"])
    UC2(["UC2 Join Campus Live Video Session"])
    UC3(["UC3 Operate the Control Room"])
    UC4(["UC4 Share Screen and Present"])
    UC5(["UC5 Send Chat, Raise Hand, and React"])
    UC6(["UC6 Post Bulletin Announcements"])
    UC7(["UC7 React and Comment on Bulletins"])
    UC8(["UC8 Trigger and Dismiss Emergency Alerts"])
    UC9(["UC9 Manage Users and Roles"])
    UC10(["UC10 Record and Manage Session Media"])
    UC11(["UC11 View Dashboard, Session History, and Audit Logs"])
    UC12(["UC12 Configure Camera, Audio, and Profile Settings"])
  end

  ADM --> UC1
  ADM --> UC2
  ADM --> UC3
  ADM --> UC4
  ADM --> UC5
  ADM --> UC6
  ADM --> UC7
  ADM --> UC8
  ADM --> UC9
  ADM --> UC10
  ADM --> UC11
  ADM --> UC12

  PRN --> UC1
  PRN --> UC2
  PRN --> UC3
  PRN --> UC4
  PRN --> UC5
  PRN --> UC6
  PRN --> UC7
  PRN --> UC8
  PRN --> UC9
  PRN --> UC11
  PRN --> UC12

  TCH --> UC1
  TCH --> UC2
  TCH --> UC4
  TCH --> UC5
  TCH --> UC7
  TCH --> UC12

  STF --> UC1
  STF --> UC2
  STF --> UC4
  STF --> UC5
  STF --> UC7
  STF --> UC12
```

| Actor | Access Scope | Use Cases |
|-------|--------------|-----------|
| **Administrator** | Full system control | UC1 – UC12 (all use cases), including global emergency dismissal and permanent media management |
| **Principal** | Control Room and own-campus administration | UC1 – UC9, UC11, UC12 — Control Room operation, campus-scoped emergency, bulletin posting, and own-campus staff management |
| **Teacher** | Campus participation | UC1, UC2, UC4, UC5, UC7, UC12 — video sessions, screen sharing, chat and reactions, bulletin engagement, and settings |
| **Staff** | Campus participation | UC1, UC2, UC4, UC5, UC7, UC12 — identical participation scope to Teacher |

> **Access enforcement is two-layered.** Route guards restrict pages in the client (`App.tsx` — Control Room and Dashboard require `principal` or `admin`), while the server independently verifies authority on sensitive events (for example, `emergency_trigger` accepts only `principal` or `admin` sessions, and bulletin creation is limited to `admin` and `principal`). Principals may view the recordings library; starting a recording and permanent deletion are administrator-only.

### Development Methodology

The system was built using the **Agile Iterative** software development life cycle, delivered in six two-week sprints with continuous client feedback between iterations.

```mermaid
flowchart LR
  S1["1 Requirements<br/>Gathering and Analysis"] --> S2["2 System Design<br/>Architecture, Data Model, UI Wireframes"]
  S2 --> S3["3 Implementation<br/>Six Agile Sprints"]
  S3 --> S4["4 Testing and Quality Assurance<br/>Type Checks, Builds, End-to-End Suites"]
  S4 --> S5["5 Deployment<br/>Continuous Delivery on Vercel and Render"]
  S5 --> S6["6 Evaluation<br/>Client Acceptance and Feedback"]
  S6 -->|"Iterate"| S2
```

| Phase | Activities | Project Evidence |
|-------|------------|------------------|
| **1. Requirements** | Stakeholder interviews and feature backlog definition | Intercampus portal, selective talk routing, emergency broadcast, and bulletin board requirements |
| **2. System Design** | Three-tier architecture, entity-relationship design, UI/UX prototyping | Client–server architecture, twelve-entity data model, campus-branded interface (Paete = cyan, Pagsanjan = purple) |
| **3. Implementation** | Incremental sprint delivery | Foundation → WebRTC core → multi-peer Control Room → advanced features → administration → polish |
| **4. Testing** | Type checking, production builds, end-to-end API suites, role-based acceptance logins | Continuous `tsc` and `vite build` gates, 23-check end-to-end verification suite, all seeded accounts validated against production |
| **5. Deployment** | Push-triggered CI/CD | GitHub → Vercel (frontend) and Render (backend) auto-deployment with Neon-managed database |
| **6. Evaluation** | User-acceptance testing rounds and feedback incorporation | Iterative refinements — for example, emergency indicators, screen-share stage layout, and roster alignment |

### Theoretical Foundation

- **Peer-to-Peer Multimedia Communication (WebRTC)** — browser-native real-time audio and video between endpoints, encrypted end-to-end with DTLS-SRTP; media never transits the application server.
- **NAT Traversal (STUN/TURN)** — STUN discovers each peer's public address for direct connection; TURN provides relaying when restrictive NATs block the direct path.
- **WebSocket Full-Duplex Signaling (Socket.IO)** — a persistent low-latency channel for WebRTC signaling, presence, chat, notifications, and emergency events.
- **Stateless Web Architecture (REST and JWT)** — short-lived access tokens with refresh rotation and HTTP-only cookies enable secure, horizontally scalable APIs.
- **Password and Second-Factor Cryptography (BCrypt, TOTP RFC 6238)** — adaptive salted password hashing combined with time-based one-time passwords for two-factor authentication.
- **Three-Tier Client–Server Architecture** — a clear separation of presentation (React), application (FastAPI and Socket.IO), and data (PostgreSQL) tiers.
- **Relational Data Modeling (SQLAlchemy and Alembic)** — twelve persistent entities with referential integrity, versioned migrations, and role-scoped queries.
- **Cloud-Native PaaS Deployment** — Vercel, Render, and Neon provide managed, auto-scaling infrastructure with push-based continuous delivery.

---

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm** — Frontend build and dev server
- **Python 3.10+** and **pip** — Backend API server
- **PostgreSQL 15+** — Database (or a cloud instance like Neon)
- **Git** — Version control
- **Modern browser** — Chrome 90+, Firefox 88+, Edge 90+, or Safari 14+ (WebRTC required)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rjvtayam/connexus_psbc_laguna.git
   cd connexus_psbc_laguna
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb here_to_there

   # Run migrations
   cd backend
   alembic upgrade head

   # Seed admin user
   python seed.py
   ```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/here_to_there

# JWT (generate a strong secret for production)
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=["http://localhost:5173"]

# WebRTC
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=
TURN_USERNAME=
TURN_CREDENTIAL=

# Limits
MAX_UPLOAD_SIZE=5242880
MAX_CHAT_MESSAGE_LENGTH=500

# Rate Limiting
RATE_LIMIT_AUTH=10/minute
RATE_LIMIT_API=60/minute
```

Frontend environment variable (optional, for production):

```env
VITE_SOCKET_URL=https://connexus-api.onrender.com
```

### Running the App

**Option A: Manual**
```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option B: Docker Compose**
```bash
docker-compose up --build
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

---

## Deployment

The application is deployed using a cloud-native stack:

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Vercel | [frontend-seven-kappa-41.vercel.app](https://frontend-seven-kappa-41.vercel.app) |
| Backend | Render | [connexus-api.onrender.com](https://connexus-api.onrender.com) |
| Database | Neon | Serverless PostgreSQL |

### Backend (Render)

1. Push to GitHub
2. Connect repo to Render
3. Set Root Directory to `backend`
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (see `.env` section above)
7. Set `PYTHON_VERSION=3.11` in Render env vars

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set Root Directory to `frontend`
3. Set `VITE_SOCKET_URL` environment variable to the Render backend URL
4. Deploy

### Database (Neon)

1. Create a Neon project
2. Create a `here_to_there` database
3. Run `alembic upgrade head` against the Neon URL
4. Seed admin user: `python seed.py`

For detailed deployment instructions, see [DEPLOY.md](DEPLOY.md).

---

## Project Structure

```
connexus_psbc_laguna/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # API route handlers
│   │   │   ├── auth.py       # Authentication endpoints
│   │   │   ├── users.py      # User management
│   │   │   ├── sessions.py   # Session history
│   │   │   ├── announcements.py  # Bulletin board CRUD
│   │   │   ├── bulletin_comments.py  # Bulletin comments
│   │   │   ├── chat_reactions.py  # Chat emoji reactions
│   │   │   ├── dashboard.py  # Admin dashboard stats
│   │   │   ├── notifications.py  # Notification management
│   │   │   ├── profile.py    # Profile, 2FA, avatar
│   │   │   └── recordings.py # Recording upload/management
│   │   ├── models/           # SQLAlchemy models (12 models)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic layer
│   │   ├── signaling/        # Socket.IO event handlers (22 events)
│   │   ├── middleware/        # CORS, security headers, rate limiting
│   │   ├── utils/            # JWT, password hashing, encryption
│   │   ├── config.py         # Application settings
│   │   ├── database.py       # Database engine and session
│   │   └── main.py           # FastAPI app factory
│   ├── alembic/              # Database migrations (13 migrations)
│   ├── uploads/              # Avatar and recording file storage
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml           # Render deployment config
├── frontend/
│   ├── src/
│   │   ├── api/              # API client layer
│   │   ├── components/       # Reusable UI components
│   │   │   ├── announcements/  # BulletinBoard, BulletinCard
│   │   │   ├── chat/         # ChatPanel with reactions/replies
│   │   │   ├── controls/     # TalkButton, PortalToggle, EmergencyButton
│   │   │   ├── indicators/   # PortalStatus, MicTalking
│   │   │   ├── layout/       # Sidebar, Header, DashboardLayout
│   │   │   ├── modals/       # ConfirmationDialog, ImageModal
│   │   │   ├── ui/           # SettingsToast, Button, Input, etc.
│   │   │   └── video/        # VideoCard, VideoControls
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── useWebRTC.ts
│   │   │   ├── useRecording.ts
│   │   │   ├── useSettingsSync.ts
│   │   │   └── useMediaDevices.ts
│   │   ├── pages/            # Route pages
│   │   │   ├── Login.tsx
│   │   │   ├── control-room/
│   │   │   │   ├── ControlRoom.tsx
│   │   │   │   ├── SettingsPage.tsx
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   ├── SessionHistory.tsx
│   │   │   │   ├── AuditLogs.tsx
│   │   │   │   └── UserManagement.tsx
│   │   │   └── campus/
│   │   │       └── CampusView.tsx
│   │   ├── stores/           # Zustand state stores
│   │   │   ├── peerStore.ts
│   │   │   ├── sessionStore.ts
│   │   │   └── authStore.ts
│   │   ├── styles/           # Global CSS
│   │   ├── types/            # TypeScript type definitions
│   │   └── lib/              # Constants, utilities
│   ├── vercel.json           # Vercel deployment config
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml
├── DEPLOY.md                 # Deployment guide
├── .env.example
└── .gitignore
```

---

## API Documentation

Once the backend is running, access the interactive API docs:

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check with DB connectivity |
| `POST` | `/api/v1/auth/login` | Authenticate user (returns 2FA flag if enabled) |
| `POST` | `/api/v1/auth/2fa-login` | Verify 2FA code |
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Clear auth cookies |
| `GET` | `/api/v1/auth/me` | Get current user profile |
| `PUT` | `/api/v1/profile/me` | Update profile |
| `POST` | `/api/v1/profile/change-password` | Change password |
| `POST` | `/api/v1/profile/avatar` | Upload avatar |
| `POST` | `/api/v1/profile/2fa/setup` | Setup 2FA |
| `GET` | `/api/v1/users/` | List users (admin) |
| `PUT` | `/api/v1/users/{id}` | Update user (admin) |
| `DELETE` | `/api/v1/users/{id}` | Deactivate user (admin) |
| `GET` | `/api/v1/sessions/` | Session history |
| `GET` | `/api/v1/announcements/` | List bulletins |
| `POST` | `/api/v1/announcements/` | Create bulletin |
| `PUT` | `/api/v1/announcements/{id}` | Update bulletin |
| `DELETE` | `/api/v1/announcements/{id}` | Delete bulletin |
| `POST` | `/api/v1/announcements/{id}/react` | Toggle bulletin reaction |
| `GET` | `/api/v1/announcements/{id}/comments` | List bulletin comments |
| `POST` | `/api/v1/announcements/{id}/comments` | Add bulletin comment |
| `DELETE` | `/api/v1/announcements/comments/{id}` | Delete bulletin comment |
| `GET` | `/api/v1/notifications/` | List notifications |
| `GET` | `/api/v1/notifications/unread-count` | Get unread count |
| `PUT` | `/api/v1/notifications/{id}/read` | Mark notification read |
| `PUT` | `/api/v1/notifications/read-all` | Mark all read |
| `DELETE` | `/api/v1/notifications/{id}` | Delete notification |
| `POST` | `/api/v1/chat-messages/{id}/react` | Toggle chat reaction |
| `GET` | `/api/v1/recordings/` | List recordings |
| `POST` | `/api/v1/recordings/upload` | Upload recording |
| `DELETE` | `/api/v1/recordings/{id}` | Soft delete recording |
| `PUT` | `/api/v1/recordings/{id}/restore` | Restore recording |
| `DELETE` | `/api/v1/recordings/{id}/permanent` | Permanent delete |
| `GET` | `/api/v1/dashboard/stats` | Admin dashboard stats |

### Socket.IO Events

#### Client to Server

| Event | Description |
|-------|-------------|
| `connect` | Authenticate with JWT token, join personal room |
| `disconnect` | Clean up on disconnect |
| `join_room` | Join a video room |
| `leave_room` | Leave a video room |
| `webrtc_offer` | Send WebRTC SDP offer |
| `webrtc_answer` | Send WebRTC SDP answer |
| `ice_candidate` | Send ICE candidate |
| `mute_audio` | Broadcast audio mute state |
| `mute_video` | Broadcast video on/off state |
| `screen_share_start` | Start screen sharing |
| `screen_share_stop` | Stop screen sharing |
| `talk_to` | Set cross-campus talk target |
| `portal_mode_changed` | Update portal mode |
| `raise_hand` | Raise hand |
| `lower_hand` | Lower hand |
| `send_reaction` | Send floating emoji reaction |
| `chat_message` | Send chat message |
| `chat_reaction_update` | Toggle chat message reaction |
| `reaction_update` | Toggle bulletin reaction |
| `bulletin_update` | Broadcast new bulletin |
| `emergency_trigger` | Trigger emergency broadcast |
| `emergency_dismiss` | Dismiss emergency |

#### Server to Client

| Event | Description |
|-------|-------------|
| `peer_joined` | Notify room of new peer |
| `peer_left` | Notify room of peer disconnect |
| `peer_portal_mode` | Broadcast portal state |
| `peer_muted` | Broadcast audio mute state |
| `peer_video_toggled` | Broadcast video state |
| `peer_talk_target` | Broadcast talk target |
| `peer_hand_raised` | Broadcast hand raise/lower |
| `peer_reaction` | Broadcast floating emoji |
| `screen_share_started` | Notify screen share started |
| `screen_share_stopped` | Notify screen share stopped |
| `room_users` | Full room user list with portal states |
| `chat_history` | Recent chat messages on join |
| `chat_message` | Broadcast new chat message |
| `chat_reaction_update` | Broadcast chat reaction |
| `reaction_update` | Broadcast bulletin reaction |
| `bulletin_new` | Broadcast new bulletin |
| `emergency_alert` | Broadcast emergency alert |
| `emergency_dismissed` | Broadcast emergency dismissed |
| `notification_update` | Notify new notification |
| `error` | Error message |

---

## Security Features

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Short-lived access tokens (30 min) with refresh token rotation (7 days) |
| **HTTP-Only Cookies** | Tokens stored in HttpOnly, Secure, SameSite=Strict cookies + Bearer header (dual mode) |
| **Two-Factor Authentication** | TOTP-based 2FA with QR code setup (Google Authenticator compatible) |
| **Account Lockout** | Automatic lockout after 5 failed login attempts (30-minute cooldown) |
| **Failed Login Logging** | All failed attempts logged with email, IP address, and attempt count |
| **Password Policy** | Minimum 8 characters with uppercase, lowercase, number, and special character |
| **Rate Limiting** | 10 req/min login, 5 req/min register, 5 req/min password change |
| **HTTP Security Headers** | HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy |
| **CORS Protection** | Strict origin allowlist for HTTP and Socket.IO connections |
| **SQL Injection Prevention** | SQLAlchemy ORM with parameterized queries |
| **Input Validation** | Pydantic schemas for all API inputs, length limits on chat/emergency messages |
| **File Upload Security** | Server-side magic byte detection, path traversal prevention, 5MB limit |
| **Audit Logging** | Login success/failure, profile changes, password changes, 2FA changes - all with IP |
| **Database Connection Pooling** | QueuePool with 10 connections, 20 overflow, 1800s recycle, health checks |
| **Field-Level Encryption** | AES-256-GCM encryption utility for sensitive data at rest |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with care for PSBC Paete and PSBC Pagsanjan**

*Capstone Project - 2026*

</div>
