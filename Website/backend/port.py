#!/usr/bin/env python3
"""
Capture RFID card scans from a USB HID 'keyboard-style' reader on a
headless Raspberry Pi and record attendance in the BeanRFID database.

Each scanned badge number is run through a translation layer (the `badges`
table) to resolve the student it belongs to, then the matching attendance
row for this room is marked present (a row is created if the student does
not have one yet).

Requires: sudo apt install python3-evdev python3-psycopg2
Access:   sudo usermod -a -G input $USER   (log out/in once)

Set ROOM_NUMBER below to the room this reader is installed in. Configure the
database connection with the DATABASE_URL environment variable, e.g.
  export DATABASE_URL="postgresql://postgres:PASSWORD@50.116.30.54:5432/beanrfid"
"""

import os
import sys
import time

import evdev
from evdev import ecodes
import psycopg2

# ── Configuration ────────────────────────────────────────────────────────────
# Part of the reader's device name to match (case-insensitive substring).
# Run the one-liner in the README to see your device's exact name,
# then put a distinctive piece of it here.
READER_NAME_MATCH = "reader"

# Connection string to the BeanRFID Postgres database (on the server).
DATABASE_URL = os.environ.get("DATABASE_URL")

# This reader is physically installed in ONE room. Set its room number here.
# Every badge scanned on this reader is pushed to the database together with
# this room number and marks the student as "here" (present) for this room.
ROOM_NUMBER = "301"

# Class used only when a scanned student has no attendance row for this room
# yet, so a fresh "present" row can be created for them.
CLASS_ID = "PRO200"

# USB HID scancode -> character map (digits + a few extras).
SCANCODES = {
    2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
    7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
    30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f',
}


# ── Input device ─────────────────────────────────────────────────────────────
def find_reader():
    for path in evdev.list_devices():
        dev = evdev.InputDevice(path)
        if READER_NAME_MATCH.lower() in dev.name.lower():
            return dev
    raise SystemExit(
        f"No input device matching '{READER_NAME_MATCH}'. "
        "List devices and adjust READER_NAME_MATCH."
    )


# ── Database ─────────────────────────────────────────────────────────────────
def connect_db():
    """Open a database connection, retrying until the server is reachable."""
    if not DATABASE_URL:
        raise SystemExit(
            "DATABASE_URL is not set. Export it, e.g.\n"
            '  export DATABASE_URL="postgresql://postgres:PASSWORD@50.116.30.54:5432/beanrfid"'
        )
    while True:
        try:
            return psycopg2.connect(DATABASE_URL)
        except psycopg2.OperationalError as err:
            print(f"DB connection failed ({err}); retrying in 5s...", flush=True)
            time.sleep(5)


def record_scan(conn, badge):
    """Translate a badge number to a student and mark them present."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT student_id, student_name FROM badges WHERE badge_number = %s",
            (badge,),
        )
        row = cur.fetchone()
        if row is None:
            print(f"Unknown badge: {badge}", flush=True)
            return
        student_id, student_name = row

        # Mark the student "here" on their existing row (keep first arrival).
        cur.execute(
            """
            UPDATE attendance
               SET present = TRUE,
                   arrived_at = COALESCE(arrived_at, NOW())
             WHERE student_id = %s AND room_id = %s
            RETURNING id
            """,
            (student_id, ROOM_NUMBER),
        )
        marked_unenrolled = False
        if not cur.fetchall():
            # Student is not on this room's roster: mark them here, but flag the
            # row as not enrolled ("here, but not in the system").
            cur.execute(
                """
                INSERT INTO attendance
                    (student_name, student_id, class_id, room_id, present, enrolled, arrived_at)
                VALUES (%s, %s, %s, %s, TRUE, FALSE, NOW())
                """,
                (student_name, student_id, CLASS_ID, ROOM_NUMBER),
            )
            marked_unenrolled = True
        conn.commit()
    suffix = " (NOT IN SYSTEM for this room)" if marked_unenrolled else ""
    print(f"{student_name} ({student_id}) is HERE in room {ROOM_NUMBER}{suffix}", flush=True)


def on_card(conn, card_id):
    """Handle one scanned badge, reconnecting if the DB dropped."""
    try:
        record_scan(conn, card_id)
    except (psycopg2.OperationalError, psycopg2.InterfaceError):
        print("DB connection lost; reconnecting...", flush=True)
        new_conn = connect_db()
        record_scan(new_conn, card_id)
        return new_conn
    except psycopg2.Error as err:
        conn.rollback()
        print(f"DB error recording {card_id}: {err}", flush=True)
    return conn


# ── Main loop ────────────────────────────────────────────────────────────────
def main():
    conn = connect_db()
    device = find_reader()
    print(f"Listening on: {device.name} ({device.path})", flush=True)
    print(f"Marking students HERE in room {ROOM_NUMBER} (class {CLASS_ID})", flush=True)

    # Take exclusive control so the codes don't also leak to the console.
    device.grab()

    card = ""
    try:
        for event in device.read_loop():
            if event.type != ecodes.EV_KEY:
                continue
            # keystate 1 == key down (ignore key-up / auto-repeat)
            if event.value != 1:
                continue
            if event.code == ecodes.KEY_ENTER:
                if card:
                    conn = on_card(conn, card)
                card = ""
            else:
                card += SCANCODES.get(event.code, "")
    except KeyboardInterrupt:
        pass
    finally:
        device.ungrab()
        conn.close()


if __name__ == "__main__":
    main()
