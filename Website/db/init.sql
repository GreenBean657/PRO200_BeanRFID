CREATE TABLE users (
    id             SERIAL PRIMARY KEY NOT NULL,
    username       VARCHAR(100) UNIQUE NOT NULL,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  TEXT         NOT NULL,
    role           VARCHAR(10)  NOT NULL CHECK (role IN ('admin', 'teacher', 'assistant')),
    assigned_rooms VARCHAR(5)[],
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
    id          VARCHAR(5)  PRIMARY KEY NOT NULL,
    description VARCHAR(30),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance (
    id           SERIAL PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    student_id   VARCHAR(10)  NOT NULL,
    class_id     VARCHAR(10)  NOT NULL,
    room_id      VARCHAR(5)   REFERENCES rooms(id),
    present      BOOLEAN      NOT NULL DEFAULT FALSE,
    arrived_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE override_logs (
    id          SERIAL PRIMARY KEY,
    attendance_id INTEGER     NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    overridden_by VARCHAR(100) NOT NULL,
    from_status BOOLEAN      NOT NULL,
    to_status   BOOLEAN      NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE export_logs (
    id           SERIAL PRIMARY KEY,
    exported_by  VARCHAR(100) NOT NULL,
    export_type  VARCHAR(20)  NOT NULL CHECK (export_type IN ('attendance', 'override-log')),
    record_count INTEGER      NOT NULL,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_room_id    ON attendance(room_id);
CREATE INDEX idx_attendance_arrived_at ON attendance(arrived_at);