-- Generates day-by-day historical attendance for the attendance graph.
-- Idempotent against existing days: it only inserts for weekdays that have no
-- rows yet, so re-running won't duplicate the seeded "today" data.
-- Roster mirrors backend/seed.js (one row per student per class session/day).
--
-- NOTE: the per-row random() lives in a MATERIALIZED CTE. Without MATERIALIZED,
-- Postgres treats an uncorrelated random() as a one-time InitPlan and every row
-- gets the same value.
WITH roster(student_name, student_id, class_id, room_id) AS (
  VALUES
    ('Alice Harper', 'N10001', 'CSC220', '101'),
    ('Bob Martinez', 'N10002', 'CSC220', '101'),
    ('Grace Lee',    'N10007', 'CSC220', '101'),
    ('Jake Rivera',  'N10010', 'CSC220', '101'),
    ('Olivia Clark', 'N10015', 'CSC220', '101'),
    ('Frank Torres', 'N10006', 'WEB310', '102'),
    ('Mia Brown',    'N10013', 'WEB310', '102'),
    ('Rachel King',  'N10018', 'WEB310', '102'),
    ('Sam Wright',   'N10019', 'WEB310', '102'),
    ('Carol Nguyen', 'N10003', 'NET101', '201'),
    ('Henry Adams',  'N10008', 'NET101', '201'),
    ('Noah Davis',   'N10014', 'NET101', '201'),
    ('Quinn Young',  'N10017', 'NET101', '201'),
    ('David Park',   'N10004', 'SEC440', '202'),
    ('Karen White',  'N10011', 'SEC440', '202'),
    ('Tina Lopez',   'N10020', 'SEC440', '202'),
    ('Emma Wilson',  'N10005', 'PRO200', '301'),
    ('Liam Scott',   'N10012', 'PRO200', '301'),
    ('Nathaniel Cruz', 'N10021', 'PRO200', '301'),
    ('Isla Chen',    'N10009', 'SYS305', '302'),
    ('Peter Hall',   'N10016', 'SYS305', '302')
),
days AS (
  SELECT d::date AS day
  FROM generate_series('2026-05-04'::date, '2026-06-03'::date, '1 day') AS d
  WHERE extract(isodow FROM d) < 6                 -- Monday–Friday only
    AND d::date NOT IN (SELECT DISTINCT created_at::date FROM attendance)
),
sessions AS MATERIALIZED (
  SELECT r.student_name, r.student_id, r.class_id, r.room_id, d.day,
         random() AS rnd,
         random() AS arrival_jitter
  FROM roster r
  CROSS JOIN days d
)
INSERT INTO attendance (student_name, student_id, class_id, room_id, present, enrolled, arrived_at, created_at)
SELECT student_name, student_id, class_id, room_id,
       (rnd < 0.85) AS present,
       TRUE,
       CASE WHEN rnd < 0.85
            THEN (day + TIME '08:00' + (arrival_jitter * INTERVAL '40 minutes')) AT TIME ZONE 'UTC'
            ELSE NULL END,
       (day + TIME '07:55') AT TIME ZONE 'UTC'
FROM sessions;