# BeanRFID

An RFID-based classroom attendance system built for Neumont College of Computer Science.

---

## Overview

BeanRFID automates student attendance tracking by pairing physical RFID badge scanners with a web dashboard. When a student scans their ID badge at the classroom door, the system records the scan, resolves the student's identity through a badge registry, and marks them present in real time. Teachers and TAs can view attendance records, navigate day-by-day, manually override entries, and export reports to CSV. An admin panel provides full user and room management.

### Problem Addressed

Manual attendance is slow, error-prone, and easy to falsify. BeanRFID removes the paper sign-in sheet entirely: a Raspberry Pi with a USB HID RFID reader handles capture automatically, and the web dashboard gives faculty instant, accurate records without extra work.

---

## Team Members

- Nathaniel Cruz

---

## Key Features

- **Automatic scan-to-attendance** — USB HID RFID reader on a Raspberry Pi writes directly to the database; no manual input required.
- **Badge registry** — maps physical badge numbers to student identities through a dedicated `badges` table.
- **Role-based access** — admin, teacher, and TA (assistant) roles with scoped visibility and actions.
- **Day-by-day attendance graph** — trend chart with a date navigator so faculty can step through any class day.
- **Manual overrides** — staff can correct individual records; every change is logged in `override_logs`.
- **CSV export** — attendance and override logs are exportable; exports are recorded in `export_logs`.
- **Walk-in detection** — scans for students not on the roster are still recorded (`enrolled = false`) so no one is silently dropped.
- **Admin panel** — full CRUD for users, rooms, and badge assignments.

---

## Technologies Used

| Layer | Technology | Role |
|---|---|---|
| Hardware reader | Python 3 + `evdev` | Reads USB HID RFID scanner on headless Raspberry Pi; writes scans to the database |
| Backend API | Node.js + Express | REST API with JWT auth, rate limiting, and role enforcement |
| Database | PostgreSQL | Stores users, rooms, attendance, badges, and audit logs |
| Frontend dashboard | React + TypeScript | SPA with dashboard, admin panel, and login pages |
| Containerization | Docker + Docker Compose | Runs backend and frontend in isolated containers |

### Emerging Technologies

The hardware integration layer sits on a Raspberry Pi running a headless Python daemon (`port.py`) that interfaces with the USB RFID reader through the Linux input subsystem (`evdev`). This edge-computing approach keeps scan latency near zero and requires no internet connection at the moment of scan — attendance is written over a local or campus network connection to the database.

---

## Project Structure

```
BeanRFID/
├── RFID/                        # (reserved for C++ inference work)
└── Website/
    ├── backend/                 # Express API
    │   ├── index.js             # Routes, auth, middleware
    │   ├── port.py              # Raspberry Pi RFID reader daemon
    │   └── seed.js              # Development seed data
    ├── frontend/                # React + TypeScript SPA
    │   └── src/
    │       ├── pages/           # LoginPage, DashboardPage, AdminPage
    │       ├── components/      # AttendanceTable, AttendanceChart, Navbar
    │       ├── services/        # API client (api.ts)
    │       ├── context/         # AuthContext (JWT state)
    │       └── types/           # Shared TypeScript types
    ├── db/
    │   ├── init.sql             # Schema (tables, indexes)
    │   └── seed_attendance_history.sql
    ├── docker-compose.yml
    └── startup.sh
```

---

## Setup & Installation

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A PostgreSQL instance (local or remote) — or let Docker Compose run one
- A Raspberry Pi with a USB HID RFID reader (for live scanning)
- Python 3 + `evdev` + `psycopg2` on the Pi (`sudo apt install python3-evdev python3-psycopg2`)

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/ncruz-neumont/PRO200_BeanRFID.git
cd PRO200_BeanRFID/Website

# Set the database password
export PASSWORD=yourpassword
export DB_HOST=your-db-host   # or the Docker host IP

# Build and run
./startup.sh
```

The frontend is served at `http://localhost:3000` and the API at `http://localhost:8000`.

### Database Initialization

```bash
# Apply schema against your PostgreSQL instance
psql -U postgres -d beanrfid -f db/init.sql

# (Optional) seed historical attendance data for development
psql -U postgres -d beanrfid -f db/seed_attendance_history.sql

# (Optional) seed users, rooms, and badges
cd backend && node seed.js
```

### RFID Reader Daemon (Raspberry Pi)

```bash
# Add your user to the input group (log out and back in once)
sudo usermod -a -G input $USER

# Set the database connection
export DATABASE_URL="postgresql://postgres:PASSWORD@<db-host>:5432/beanrfid"

# Edit ROOM_NUMBER in port.py to match the room the reader is installed in
# Then run the daemon
python3 port.py
```

To find the exact device name for your reader, run:

```bash
python3 -c "import evdev; [print(d.path, d.name) for d in [evdev.InputDevice(p) for p in evdev.list_devices()]]"
```

---

## Development Retrospective

### What Went Well

- The badge-to-student translation layer (the `badges` table + `port.py`) cleanly separated hardware concerns from application logic. Swapping reader hardware only requires updating the Python script, not the API or frontend.
- Docker Compose made it straightforward to keep the backend and frontend environments reproducible across machines.
- Role-based access control was implemented early, which made it easy to add the TA role later without restructuring the API.

### Challenges

- Getting the USB HID reader to produce clean digit sequences on a headless Pi required handling key-repeat events and filtering non-numeric scan codes in `port.py`.
- Attendance records need to be scoped to a specific date for the chart to be useful — designing the query to support both a live "today" view and historical navigation took several iterations.

### Lessons Learned

- Starting with a well-defined database schema (separate tables for attendance, overrides, exports, and badges) made every subsequent feature straightforward to wire up.
- The walk-in detection requirement (`enrolled = false` rows) surfaced late; adding it after the fact required a schema change and frontend update that would have been cleaner planned from the start.

### What Would Come Next

- Canvas LMS integration to sync attendance directly to the gradebook.
- C++ inference engine on the Pi to flag suspicious badge-sharing patterns from scan timing data.
- Email or push notifications to students when an absence is recorded.
- A student-facing view so students can review their own attendance history.
