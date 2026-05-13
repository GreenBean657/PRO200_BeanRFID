# BeanRFID

## Project Description

BeanRFID is an RFID-based classroom attendance system designed for Neumont College of Computer Science. Each classroom entrance contains an RFID scanner connected to a Raspberry Pi. Students scan their ID badge when entering class, and attendance is automatically recorded and synchronized with Canvas.

The system also uses AI inference written in C++ to detect suspicious attendance patterns that may indicate badge sharing between students.

## Team Members

- Nathaniel Cruz

## Technologies Used

| Layer | Technology |
|-------|------------|
| Firmware / AI Inference | C++ (Raspberry Pi) |
| Frontend Dashboard | React |
| Hardware | RFID Scanner, Raspberry Pi |
| LMS Integration | Canvas API |

## Project Structure

```
BeanRFID/
├── RFID/        # C++ firmware and AI inference engine (Raspberry Pi)
└── Website/     # React frontend dashboard
```

## Setup & Installation

> Setup and installation instructions are pending.

### Prerequisites

- Raspberry Pi with an RFID reader module
- Node.js (v18+) and npm for the React frontend
- A C++ compiler (g++ 11+) and CMake for the firmware
- Canvas API credentials

### Quick Start

```bash
# Clone the repository
git clone https://github.com/<your-username>/BeanRFID.git
cd BeanRFID

# Frontend
cd Website
npm install
npm run dev

# Firmware (on Raspberry Pi)
cd ../RFID
cmake -B build && cmake --build build
```
