const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = 3000;

const JWT_SECRET =
  "pr-reminder-secret-development";

const ADMIN_JWT_SECRET =
  "pr-reminder-admin-secret-development";

const db = new Database(
  "backend/pr-reminder.db"
);

db.pragma("foreign_keys = ON");

/* =========================================================
   DATABASE TAMBAHAN UNTUK ADMIN / OWNER
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK(status IN ('active', 'blocked')),
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
  Tabel status penyelesaian tugas.
*/
db.exec(`
  CREATE TABLE IF NOT EXISTS task_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    task_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,

    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(task_id, student_id),

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE CASCADE,

    FOREIGN KEY (student_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  )
`);

app.use(cors());
app.use(express.json());

/* =========================================================
   REQUEST LOGGER
========================================================= */

app.use((req, res, next) => {
  console.log(
    `[REQUEST] ${req.method} ${req.url}`
  );

  next();
});

/* =========================================================
   AUTH GURU / SISWA
========================================================= */

function authenticateToken(
  req,
  res,
  next
) {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message:
        "Token tidak ditemukan.",
    });
  }

  const token =
    authorization.replace(
      "Bearer ",
      ""
    );

  try {
    const user =
      jwt.verify(
        token,
        JWT_SECRET
      );

    const currentUser =
      db
        .prepare(`
          SELECT
            id,
            username,
            role,
            class_id,
            status
          FROM users
          WHERE id = ?
        `)
        .get(user.id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message:
          "Akun tidak ditemukan.",
      });
    }

    if (
      currentUser.status ===
      "blocked"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Akun Anda telah diblokir.",
      });
    }

    req.user = {
      id: currentUser.id,
      username:
        currentUser.username,
      role:
        currentUser.role,
      classId:
        currentUser.class_id,
    };

    next();
  } catch (error) {
    console.error(
      "JWT ERROR:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
}

/* =========================================================
   AUTH ADMIN / OWNER
========================================================= */

function authenticateAdmin(
  req,
  res,
  next
) {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message:
        "Token Admin tidak ditemukan.",
    });
  }

  const token =
    authorization.replace(
      "Bearer ",
      ""
    );

  try {
    const admin =
      jwt.verify(
        token,
        ADMIN_JWT_SECRET
      );

    const currentAdmin =
      db
        .prepare(`
          SELECT
            id,
            username,
            status
          FROM admin_users
          WHERE id = ?
        `)
        .get(admin.id);

    if (!currentAdmin) {
      return res.status(401).json({
        success: false,
        message:
          "Akun Admin tidak ditemukan.",
      });
    }

    if (
      currentAdmin.status ===
      "blocked"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Akun Admin telah diblokir.",
      });
    }

    req.admin = {
      id: currentAdmin.id,
      username:
        currentAdmin.username,
      role: "admin",
    };

    next();
  } catch (error) {
    console.error(
      "ADMIN JWT ERROR:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Token Admin tidak valid atau sudah kedaluwarsa.",
    });
  }
}

/* =========================================================
   BASIC
========================================================= */

app.get(
  "/",
  (req, res) => {
    res.json({
      message:
        "PR Reminder Backend berjalan",
    });
  }
);

app.get(
  "/api/status",
  (req, res) => {
    res.json({
      status: "online",
      application:
        "PR Reminder",
    });
  }
);

/* =========================================================
   LOGIN GURU / SISWA
========================================================= */

app.post(
  "/api/login",
  (req, res) => {
    const {
      username,
      password,
      role,
    } = req.body;

    console.log(
      "LOGIN:",
      username,
      role
    );

    if (
      !username ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username, password, dan role harus diisi.",
      });
    }

    const user =
      db
        .prepare(`
          SELECT
            id,
            username,
            password,
            role,
            class_id,
            status
          FROM users
          WHERE username = ?
            AND role = ?
        `)
        .get(
          username,
          role
        );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Username atau password salah.",
      });
    }

    if (
      user.status ===
      "blocked"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Akun Anda telah diblokir.",
      });
    }

    const passwordCorrect =
      bcrypt.compareSync(
        password,
        user.password
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Username atau password salah.",
      });
    }

    db.prepare(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id);

    const tokenPayload = {
      id: user.id,
      username:
        user.username,
      role:
        user.role,
      classId:
        user.class_id,
    };

    const token =
      jwt.sign(
        tokenPayload,
        JWT_SECRET,
        {
          expiresIn:
            "7d",
        }
      );

    return res.json({
      success: true,
      message:
        "Login berhasil.",
      token,
      user:
        tokenPayload,
    });
  }
);

/* =========================================================
   CURRENT GURU / SISWA
========================================================= */

app.get(
  "/api/me",
  authenticateToken,
  (req, res) => {
    return res.json({
      success: true,
      user: req.user,
    });
  }
);

/* =========================================================
   LOGIN ADMIN / OWNER
   Tidak digunakan oleh halaman login Guru/Siswa.
========================================================= */

app.post(
  "/api/admin/login",
  (req, res) => {
    const {
      username,
      password,
    } = req.body;

    console.log(
      "ADMIN LOGIN:",
      username
    );

    if (
      !username ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username dan password Admin harus diisi.",
      });
    }

    const admin =
      db
        .prepare(`
          SELECT
            id,
            username,
            password,
            status
          FROM admin_users
          WHERE username = ?
        `)
        .get(username);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Username atau password Admin salah.",
      });
    }

    if (
      admin.status ===
      "blocked"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Akun Admin telah diblokir.",
      });
    }

    const passwordCorrect =
      bcrypt.compareSync(
        password,
        admin.password
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Username atau password Admin salah.",
      });
    }

    db.prepare(`
      UPDATE admin_users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(admin.id);

    const tokenPayload = {
      id: admin.id,
      username:
        admin.username,
      role: "admin",
    };

    const token =
      jwt.sign(
        tokenPayload,
        ADMIN_JWT_SECRET,
        {
          expiresIn:
            "7d",
        }
      );

    return res.json({
      success: true,
      message:
        "Login Admin berhasil.",
      token,
      user:
        tokenPayload,
    });
  }
);

/* =========================================================
   ADMIN CURRENT USER
========================================================= */

app.get(
  "/api/admin/me",
  authenticateAdmin,
  (req, res) => {
    return res.json({
      success: true,
      user: req.admin,
    });
  }
);

/* =========================================================
   ADMIN - STATISTIK
========================================================= */

app.get(
  "/api/admin/stats",
  authenticateAdmin,
  (req, res) => {
    const totalGuru =
      db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM users
          WHERE role = 'guru'
        `)
        .get().count;

    const totalSiswa =
      db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM users
          WHERE role = 'siswa'
        `)
        .get().count;

    const totalBlocked =
      db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM users
          WHERE status = 'blocked'
        `)
        .get().count;

    const totalActive =
      db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM users
          WHERE status = 'active'
        `)
        .get().count;

    return res.json({
      success: true,
      stats: {
        totalGuru:
          Number(totalGuru),
        totalSiswa:
          Number(totalSiswa),
        totalBlocked:
          Number(totalBlocked),
        totalActive:
          Number(totalActive),
      },
    });
  }
);

/* =========================================================
   ADMIN - SEMUA AKUN
========================================================= */

app.get(
  "/api/admin/users",
  authenticateAdmin,
  (req, res) => {
    const search =
      String(
        req.query.search || ""
      ).trim();

    const role =
      String(
        req.query.role || ""
      ).trim();

    let query = `
      SELECT
        id,
        username,
        role,
        class_id AS classId,
        status,
        last_login AS lastLogin,
        created_at AS createdAt
      FROM users
      WHERE 1 = 1
    `;

    const params = [];

    if (search) {
      query += `
        AND username LIKE ?
      `;

      params.push(
        `%${search}%`
      );
    }

    if (
      role === "guru" ||
      role === "siswa"
    ) {
      query += `
        AND role = ?
      `;

      params.push(role);
    }

    query += `
      ORDER BY
        CASE
          WHEN status = 'active'
          THEN 0
          ELSE 1
        END,
        role ASC,
        username ASC
    `;

    const users =
      db
        .prepare(query)
        .all(...params);

    return res.json({
      success: true,
      users,
    });
  }
);

/* =========================================================
   ADMIN - BLOKIR / BUKA BLOKIR
========================================================= */

app.put(
  "/api/admin/users/:id/status",
  authenticateAdmin,
  (req, res) => {
    const userId =
      Number(req.params.id);

    const status =
      req.body.status;

    if (
      !Number.isInteger(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID akun tidak valid.",
      });
    }

    if (
      status !== "active" &&
      status !== "blocked"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status tidak valid.",
      });
    }

    const user =
      db
        .prepare(`
          SELECT
            id,
            username,
            role,
            status
          FROM users
          WHERE id = ?
        `)
        .get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Akun tidak ditemukan.",
      });
    }

    db.prepare(`
      UPDATE users
      SET status = ?
      WHERE id = ?
    `).run(
      status,
      userId
    );

    console.log(
      "STATUS AKUN DIUBAH:",
      user.username,
      status
    );

    return res.json({
      success: true,
      message:
        status === "blocked"
          ? `Akun ${user.username} berhasil diblokir.`
          : `Akun ${user.username} berhasil dibuka blokirnya.`,
    });
  }
);

/* =========================================================
   CREATE TASK - GURU
========================================================= */

app.post(
  "/api/tasks",
  authenticateToken,
  (req, res) => {
    console.log(
      "POST /api/tasks BODY:",
      req.body
    );

    console.log(
      "USER:",
      req.user
    );

    if (
      req.user.role !==
      "guru"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Hanya Guru yang dapat membuat tugas.",
      });
    }

    const {
      subject,
      title,
      description,
      deadline,
      classId,
    } = req.body;

    if (
      !subject ||
      !title ||
      !description ||
      !deadline ||
      !classId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Semua data tugas harus diisi.",
      });
    }

    const selectedClass =
      db
        .prepare(`
          SELECT id, name
          FROM classes
          WHERE id = ?
        `)
        .get(classId);

    if (!selectedClass) {
      return res.status(400).json({
        success: false,
        message:
          "Kelas tidak ditemukan.",
      });
    }

    try {
      const result =
        db
          .prepare(`
            INSERT INTO tasks (
              subject,
              title,
              description,
              deadline,
              class_id,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(
            subject,
            title,
            description,
            deadline,
            classId,
            req.user.id
          );

      const newTask =
        db
          .prepare(`
            SELECT
              id,
              subject,
              title,
              description,
              deadline,
              class_id AS classId,
              created_by AS createdBy,
              created_at AS createdAt
            FROM tasks
            WHERE id = ?
          `)
          .get(
            result.lastInsertRowid
          );

      console.log(
        "TASK BERHASIL DIBUAT:",
        newTask
      );

      return res.status(201).json({
        success: true,
        message:
          `Tugas berhasil dibuat untuk kelas ${classId}.`,
        task: newTask,
      });
    } catch (error) {
      console.error(
        "DATABASE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal menyimpan tugas ke database.",
      });
    }
  }
);

/* =========================================================
   GET TASKS
========================================================= */

app.get(
  "/api/tasks",
  authenticateToken,
  (req, res) => {
    try {
      let tasks;

      if (
        req.user.role ===
        "guru"
      ) {
        tasks =
          db
            .prepare(`
              SELECT
                t.id,
                t.subject,
                t.title,
                t.description,
                t.deadline,
                t.class_id AS classId,
                t.created_by AS createdBy,
                t.created_at AS createdAt,

                (
                  SELECT COUNT(*)
                  FROM users s
                  WHERE s.role = 'siswa'
                    AND s.class_id = t.class_id
                    AND s.status = 'active'
                ) AS totalStudents,

                (
                  SELECT COUNT(*)
                  FROM task_completions tc
                  INNER JOIN users s
                    ON s.id = tc.student_id
                  WHERE tc.task_id = t.id
                    AND s.role = 'siswa'
                    AND s.class_id = t.class_id
                    AND s.status = 'active'
                ) AS completedStudents

              FROM tasks t

              WHERE t.created_by = ?

              ORDER BY t.deadline ASC
            `)
            .all(
              req.user.id
            );

        tasks =
          tasks.map(
            (task) => ({
              ...task,
              totalStudents:
                Number(
                  task.totalStudents
                ),
              completedStudents:
                Number(
                  task.completedStudents
                ),
              incompleteStudents:
                Number(
                  task.totalStudents
                ) -
                Number(
                  task.completedStudents
                ),
            })
          );
      } else if (
        req.user.role ===
        "siswa"
      ) {
        if (
          !req.user.classId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Akun siswa belum memiliki kelas.",
          });
        }

        tasks =
          db
            .prepare(`
              SELECT
                t.id,
                t.subject,
                t.title,
                t.description,
                t.deadline,
                t.class_id AS classId,
                t.created_by AS createdBy,
                t.created_at AS createdAt,

                (
                  SELECT COUNT(*)
                  FROM users s
                  WHERE s.role = 'siswa'
                    AND s.class_id = t.class_id
                    AND s.status = 'active'
                ) AS totalStudents,

                (
                  SELECT COUNT(*)
                  FROM task_completions tc
                  INNER JOIN users s
                    ON s.id = tc.student_id
                  WHERE tc.task_id = t.id
                    AND s.role = 'siswa'
                    AND s.class_id = t.class_id
                    AND s.status = 'active'
                ) AS completedStudents,

                CASE
                  WHEN EXISTS (
                    SELECT 1
                    FROM task_completions tc2
                    WHERE tc2.task_id = t.id
                      AND tc2.student_id = ?
                  )
                  THEN 1
                  ELSE 0
                END AS completedByMe

              FROM tasks t

              WHERE t.class_id = ?

              ORDER BY t.deadline ASC
            `)
            .all(
              req.user.id,
              req.user.classId
            );

        tasks =
          tasks.map(
            (task) => ({
              ...task,
              totalStudents:
                Number(
                  task.totalStudents
                ),
              completedStudents:
                Number(
                  task.completedStudents
                ),
              incompleteStudents:
                Number(
                  task.totalStudents
                ) -
                Number(
                  task.completedStudents
                ),
              completedByMe:
                Boolean(
                  task.completedByMe
                ),
            })
          );
      } else {
        return res.status(403).json({
          success: false,
          message:
            "Role tidak diizinkan.",
        });
      }

      return res.json({
        success: true,
        tasks,
      });
    } catch (error) {
      console.error(
        "GET TASKS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal mengambil tugas.",
      });
    }
  }
);

/* =========================================================
   UPDATE STATUS SELESAI - SISWA
========================================================= */

app.put(
  "/api/tasks/:taskId/completion",
  authenticateToken,
  (req, res) => {
    if (
      req.user.role !==
      "siswa"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Hanya siswa yang dapat mengubah status tugas.",
      });
    }

    const taskId =
      Number(req.params.taskId);

    const completed =
      Boolean(
        req.body.completed
      );

    if (
      !Number.isInteger(
        taskId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID tugas tidak valid.",
      });
    }

    const task =
      db
        .prepare(`
          SELECT
            id,
            class_id AS classId
          FROM tasks
          WHERE id = ?
        `)
        .get(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message:
          "Tugas tidak ditemukan.",
      });
    }

    if (
      task.classId !==
      req.user.classId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke tugas ini.",
      });
    }

    try {
      if (completed) {
        db.prepare(`
          INSERT INTO task_completions (
            task_id,
            student_id
          )
          VALUES (?, ?)

          ON CONFLICT(task_id, student_id)
          DO UPDATE SET
            completed_at = CURRENT_TIMESTAMP
        `).run(
          taskId,
          req.user.id
        );
      } else {
        db.prepare(`
          DELETE FROM task_completions
          WHERE task_id = ?
            AND student_id = ?
        `).run(
          taskId,
          req.user.id
        );
      }

      const statistics =
        db
          .prepare(`
            SELECT
              (
                SELECT COUNT(*)
                FROM users
                WHERE role = 'siswa'
                  AND class_id = ?
                  AND status = 'active'
              ) AS totalStudents,

              (
                SELECT COUNT(*)
                FROM task_completions tc
                INNER JOIN users s
                  ON s.id = tc.student_id
                WHERE tc.task_id = ?
                  AND s.role = 'siswa'
                  AND s.class_id = ?
                  AND s.status = 'active'
              ) AS completedStudents
          `)
          .get(
            task.classId,
            taskId,
            task.classId
          );

      const totalStudents =
        Number(
          statistics.totalStudents
        );

      const completedStudents =
        Number(
          statistics.completedStudents
        );

      return res.json({
        success: true,
        completed,
        totalStudents,
        completedStudents,
        incompleteStudents:
          totalStudents -
          completedStudents,
      });
    } catch (error) {
      console.error(
        "UPDATE COMPLETION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal mengubah status tugas.",
      });
    }
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `PR Reminder Backend berjalan di http://localhost:${PORT}`
    );
  }
);