require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!DATABASE_URL) {
  console.error("DATABASE_URL belum diatur di file .env");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("JWT_SECRET belum diatur di file .env");
  process.exit(1);
}

if (!ADMIN_JWT_SECRET) {
  console.error("ADMIN_JWT_SECRET belum diatur di file .env");
  process.exit(1);
}

/* =========================================================
   DATABASE
========================================================= */

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });

  next();
});

/* =========================================================
   HELPERS
========================================================= */

function createUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function createAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      role: "admin",
    },
    ADMIN_JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function getBearerToken(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7);
}

/* =========================================================
   USER AUTHENTICATION
========================================================= */

async function authenticateToken(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Token tidak ditemukan.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        full_name,
        role,
        class_id,
        status,
        last_login,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Akun tidak ditemukan.",
      });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Akun Anda telah diblokir.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("authenticateToken:", error);

    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
}

/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function authenticateAdmin(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Token admin tidak ditemukan.",
      });
    }

    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        status,
        last_login,
        created_at
      FROM admin_users
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Akun admin tidak ditemukan.",
      });
    }

    const admin = result.rows[0];

    if (admin.status !== "active") {
      return res.status(403).json({
        message: "Akun admin telah diblokir.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("authenticateAdmin:", error);

    return res.status(401).json({
      message: "Token admin tidak valid atau sudah kedaluwarsa.",
    });
  }
}

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    app: "PR Reminder API",
    status: "online",
  });
});

/* =========================================================
   STATUS
========================================================= */

app.get("/api/status", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time"
    );

    res.json({
      success: true,
      status: "online",
      database: "connected",
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("GET /api/status:", error);

    res.status(500).json({
      success: false,
      status: "error",
      database: "disconnected",
    });
  }
});

/* =========================================================
   REGISTER SISWA
========================================================= */

app.post("/api/register", async (req, res) => {
  try {
    const {
      fullName,
      username,
      password,
      classId,
    } = req.body;

    if (!fullName || !username || !password || !classId) {
      return res.status(400).json({
        message:
          "Nama lengkap, username, password, dan kelas harus diisi.",
      });
    }

    const cleanName = String(fullName).trim();
    const cleanUsername = String(username).trim();

    if (cleanName.length < 2) {
      return res.status(400).json({
        message: "Nama lengkap terlalu pendek.",
      });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        message: "Username minimal 3 karakter.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password minimal 6 karakter.",
      });
    }

    const classResult = await pool.query(
      `
      SELECT id, name
      FROM classes
      WHERE id = $1
      LIMIT 1
      `,
      [classId]
    );

    if (classResult.rows.length === 0) {
      return res.status(400).json({
        message: "Kelas yang dipilih tidak tersedia.",
      });
    }

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE username = $1
      LIMIT 1
      `,
      [cleanUsername]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Username sudah digunakan.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const result = await pool.query(
      `
      INSERT INTO users (
        username,
        full_name,
        password,
        role,
        class_id,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        'siswa',
        $4,
        'active'
      )
      RETURNING
        id,
        username,
        full_name,
        role,
        class_id,
        status,
        created_at
      `,
      [
        cleanUsername,
        cleanName,
        hashedPassword,
        classId,
      ]
    );

    const user = result.rows[0];

    const token = createUserToken(user);

    res.status(201).json({
      success: true,
      message: "Akun siswa berhasil dibuat.",
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        classId: user.class_id,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("POST /api/register:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Username sudah digunakan.",
      });
    }

    res.status(500).json({
      message: "Gagal membuat akun siswa.",
    });
  }
});

/* =========================================================
   LOGIN GURU / SISWA
========================================================= */

app.post("/api/login", async (req, res) => {
  try {
    const {
      username,
      password,
      role,
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username dan password harus diisi.",
      });
    }

    if (!["guru", "siswa"].includes(role)) {
      return res.status(400).json({
        message: "Login role tidak valid.",
      });
    }

    const cleanUsername = String(username).trim();

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        full_name,
        password,
        role,
        class_id,
        status,
        last_login,
        created_at
      FROM users
      WHERE username = $1
        AND role = $2
      LIMIT 1
      `,
      [cleanUsername, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Username atau password salah.",
      });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        message:
          "Akun Anda telah diblokir oleh administrator.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Username atau password salah.",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET last_login = NOW()
      WHERE id = $1
      `,
      [user.id]
    );

    const token = createUserToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        classId: user.class_id,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("POST /api/login:", error);

    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
});

/* =========================================================
   CURRENT USER
========================================================= */

app.get("/api/me", authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.full_name,
      role: req.user.role,
      classId: req.user.class_id,
      status: req.user.status,
      lastLogin: req.user.last_login,
    },
  });
});

/* =========================================================
   GET CLASSES
========================================================= */

app.get("/api/classes", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name
      FROM classes
      ORDER BY id
    `);

    res.json({
      success: true,
      classes: result.rows,
    });
  } catch (error) {
    console.error("GET /api/classes:", error);

    res.status(500).json({
      message: "Gagal mengambil daftar kelas.",
    });
  }
});

/* =========================================================
   CREATE TASK
   GURU ONLY
========================================================= */

app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "guru") {
      return res.status(403).json({
        message: "Hanya Guru yang dapat membuat tugas.",
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
        message:
          "Subject, title, description, deadline, dan classId harus diisi.",
      });
    }

    const classResult = await pool.query(
      `
      SELECT id, name
      FROM classes
      WHERE id = $1
      LIMIT 1
      `,
      [classId]
    );

    if (classResult.rows.length === 0) {
      return res.status(400).json({
        message: "Kelas tidak ditemukan.",
      });
    }

    const parsedDeadline = new Date(deadline);

    if (Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({
        message: "Format deadline tidak valid.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO tasks (
        subject,
        title,
        description,
        deadline,
        class_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        subject,
        title,
        description,
        deadline,
        class_id,
        created_by,
        created_at
      `,
      [
        String(subject).trim(),
        String(title).trim(),
        String(description).trim(),
        parsedDeadline.toISOString(),
        classId,
        req.user.id,
      ]
    );

    const task = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Tugas berhasil dibuat.",
      task: {
        id: task.id,
        subject: task.subject,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        classId: task.class_id,
        createdBy: task.created_by,
        createdAt: task.created_at,
      },
    });
  } catch (error) {
    console.error("POST /api/tasks:", error);

    res.status(500).json({
      message: "Gagal membuat tugas.",
    });
  }
});

/* =========================================================
   GET TASKS
========================================================= */

app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    let result;

    if (req.user.role === "guru") {
      result = await pool.query(
        `
        SELECT
          t.id,
          t.subject,
          t.title,
          t.description,
          t.deadline,
          t.class_id,
          t.created_by,
          t.created_at,

          c.name AS class_name,

          COUNT(DISTINCT u.id)
            FILTER (WHERE u.role = 'siswa')
            AS total_students,

          COUNT(DISTINCT tc.student_id)
            AS completed_students

        FROM tasks t

        INNER JOIN classes c
          ON c.id = t.class_id

        LEFT JOIN users u
          ON u.class_id = t.class_id
          AND u.role = 'siswa'

        LEFT JOIN task_completions tc
          ON tc.task_id = t.id

        WHERE t.created_by = $1

        GROUP BY
          t.id,
          c.name

        ORDER BY t.deadline ASC
        `,
        [req.user.id]
      );
    } else {
      if (!req.user.class_id) {
        return res.json({
          success: true,
          tasks: [],
        });
      }

      result = await pool.query(
        `
        SELECT
          t.id,
          t.subject,
          t.title,
          t.description,
          t.deadline,
          t.class_id,
          t.created_by,
          t.created_at,

          c.name AS class_name,

          COUNT(DISTINCT u.id)
            FILTER (WHERE u.role = 'siswa')
            AS total_students,

          COUNT(DISTINCT tc.student_id)
            AS completed_students,

          EXISTS (
            SELECT 1
            FROM task_completions own_completion
            WHERE own_completion.task_id = t.id
              AND own_completion.student_id = $1
          ) AS completed_by_me

        FROM tasks t

        INNER JOIN classes c
          ON c.id = t.class_id

        LEFT JOIN users u
          ON u.class_id = t.class_id
          AND u.role = 'siswa'

        LEFT JOIN task_completions tc
          ON tc.task_id = t.id

        WHERE t.class_id = $2

        GROUP BY
          t.id,
          c.name

        ORDER BY t.deadline ASC
        `,
        [req.user.id, req.user.class_id]
      );
    }

    const tasks = result.rows.map((task) => ({
      id: task.id,
      subject: task.subject,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      classId: task.class_id,
      className: task.class_name,
      createdBy: task.created_by,
      createdAt: task.created_at,

      totalStudents: Number(
        task.total_students || 0
      ),

      completedStudents: Number(
        task.completed_students || 0
      ),

      incompleteStudents: Math.max(
        0,
        Number(task.total_students || 0) -
          Number(task.completed_students || 0)
      ),

      completedByMe:
        task.completed_by_me === undefined
          ? false
          : Boolean(task.completed_by_me),
    }));

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("GET /api/tasks:", error);

    res.status(500).json({
      message: "Gagal mengambil daftar tugas.",
    });
  }
});

/* =========================================================
   COMPLETE / UNCOMPLETE TASK
   SISWA ONLY
========================================================= */

app.put(
  "/api/tasks/:taskId/completion",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "siswa") {
        return res.status(403).json({
          message:
            "Hanya Siswa yang dapat mengubah status tugas.",
        });
      }

      const taskId = Number(req.params.taskId);

      if (!Number.isInteger(taskId)) {
        return res.status(400).json({
          message: "ID tugas tidak valid.",
        });
      }

      const completed = req.body.completed === true;

      const taskResult = await pool.query(
        `
        SELECT
          id,
          class_id
        FROM tasks
        WHERE id = $1
        LIMIT 1
        `,
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        return res.status(404).json({
          message: "Tugas tidak ditemukan.",
        });
      }

      const task = taskResult.rows[0];

      if (task.class_id !== req.user.class_id) {
        return res.status(403).json({
          message:
            "Anda tidak memiliki akses ke tugas kelas lain.",
        });
      }

      if (completed) {
        await pool.query(
          `
          INSERT INTO task_completions (
            task_id,
            student_id
          )
          VALUES ($1, $2)
          ON CONFLICT (task_id, student_id)
          DO NOTHING
          `,
          [taskId, req.user.id]
        );
      } else {
        await pool.query(
          `
          DELETE FROM task_completions
          WHERE task_id = $1
            AND student_id = $2
          `,
          [taskId, req.user.id]
        );
      }

      res.json({
        success: true,
        completed,
      });
    } catch (error) {
      console.error(
        "PUT /api/tasks/:taskId/completion:",
        error
      );

      res.status(500).json({
        message: "Gagal mengubah status tugas.",
      });
    }
  }
);

/* =========================================================
   ADMIN LOGIN
   TIDAK DITAMPILKAN DI LOGIN PUBLIK
========================================================= */

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message:
          "Username dan password admin harus diisi.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        password,
        status,
        last_login,
        created_at
      FROM admin_users
      WHERE username = $1
      LIMIT 1
      `,
      [String(username).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Username atau password admin salah.",
      });
    }

    const admin = result.rows[0];

    if (admin.status !== "active") {
      return res.status(403).json({
        message: "Akun admin telah diblokir.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Username atau password admin salah.",
      });
    }

    await pool.query(
      `
      UPDATE admin_users
      SET last_login = NOW()
      WHERE id = $1
      `,
      [admin.id]
    );

    const token = createAdminToken(admin);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/login:", error);

    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
});

/* =========================================================
   ADMIN ME
========================================================= */

app.get(
  "/api/admin/me",
  authenticateAdmin,
  async (req, res) => {
    res.json({
      success: true,
      admin: {
        id: req.admin.id,
        username: req.admin.username,
        status: req.admin.status,
        lastLogin: req.admin.last_login,
      },
    });
  }
);

/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",
  authenticateAdmin,
  async (req, res) => {
    try {
      const usersResult = await pool.query(`
        SELECT
          COUNT(*)::int AS total_users,

          COUNT(*) FILTER (
            WHERE role = 'guru'
          )::int AS total_guru,

          COUNT(*) FILTER (
            WHERE role = 'siswa'
          )::int AS total_siswa,

          COUNT(*) FILTER (
            WHERE status = 'blocked'
          )::int AS total_blocked

        FROM users
      `);

      const classesResult = await pool.query(`
        SELECT COUNT(*)::int AS total_classes
        FROM classes
      `);

      const tasksResult = await pool.query(`
        SELECT
          COUNT(*)::int AS total_tasks,

          COUNT(*) FILTER (
            WHERE deadline < NOW()
          )::int AS overdue_tasks

        FROM tasks
      `);

      const completionResult = await pool.query(`
        SELECT COUNT(*)::int AS total_completed
        FROM task_completions
      `);

      const users = usersResult.rows[0];
      const classes = classesResult.rows[0];
      const tasks = tasksResult.rows[0];
      const completions = completionResult.rows[0];

      res.json({
        success: true,
        stats: {
          totalUsers: Number(users.total_users),
          totalGuru: Number(users.total_guru),
          totalSiswa: Number(users.total_siswa),
          totalBlocked: Number(users.total_blocked),
          totalClasses: Number(classes.total_classes),
          totalTasks: Number(tasks.total_tasks),
          overdueTasks: Number(tasks.overdue_tasks),
          totalCompleted: Number(
            completions.total_completed
          ),
        },
      });
    } catch (error) {
      console.error("GET /api/admin/stats:", error);

      res.status(500).json({
        message: "Gagal mengambil statistik admin.",
      });
    }
  }
);

/* =========================================================
   ADMIN CREATE GURU
   HANYA OWNER / ADMIN
========================================================= */

app.post(
  "/api/admin/users/teacher",
  authenticateAdmin,
  async (req, res) => {
    try {
      const {
        fullName,
        username,
        password,
      } = req.body;

      if (!fullName || !username || !password) {
        return res.status(400).json({
          message:
            "Nama lengkap, username, dan password harus diisi.",
        });
      }

      const cleanName = String(fullName).trim();
      const cleanUsername = String(username).trim();

      if (cleanName.length < 2) {
        return res.status(400).json({
          message: "Nama lengkap terlalu pendek.",
        });
      }

      if (cleanUsername.length < 3) {
        return res.status(400).json({
          message: "Username minimal 3 karakter.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "Password minimal 6 karakter.",
        });
      }

      const existingUser = await pool.query(
        `
        SELECT id
        FROM users
        WHERE username = $1
        LIMIT 1
        `,
        [cleanUsername]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          message: "Username sudah digunakan.",
        });
      }

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      const result = await pool.query(
        `
        INSERT INTO users (
          username,
          full_name,
          password,
          role,
          class_id,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          'guru',
          NULL,
          'active'
        )
        RETURNING
          id,
          username,
          full_name,
          role,
          class_id,
          status,
          created_at
        `,
        [
          cleanUsername,
          cleanName,
          hashedPassword,
        ]
      );

      const teacher = result.rows[0];

      res.status(201).json({
        success: true,
        message: "Akun Guru berhasil dibuat.",
        user: {
          id: teacher.id,
          username: teacher.username,
          fullName: teacher.full_name,
          role: teacher.role,
          classId: teacher.class_id,
          status: teacher.status,
          createdAt: teacher.created_at,
        },
      });
    } catch (error) {
      console.error(
        "POST /api/admin/users/teacher:",
        error
      );

      if (error.code === "23505") {
        return res.status(409).json({
          message: "Username sudah digunakan.",
        });
      }

      res.status(500).json({
        message: "Gagal membuat akun Guru.",
      });
    }
  }
);

/* =========================================================
   ADMIN USERS
========================================================= */

app.get(
  "/api/admin/users",
  authenticateAdmin,
  async (req, res) => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      let result;

      if (search) {
        result = await pool.query(
          `
          SELECT
            u.id,
            u.username,
            u.full_name,
            u.role,
            u.class_id,
            u.status,
            u.last_login,
            u.created_at,
            c.name AS class_name

          FROM users u

          LEFT JOIN classes c
            ON c.id = u.class_id

          WHERE
            u.username ILIKE $1
            OR COALESCE(u.full_name, '') ILIKE $1
            OR u.role ILIKE $1
            OR COALESCE(u.class_id, '') ILIKE $1

          ORDER BY u.created_at DESC
          `,
          [`%${search}%`]
        );
      } else {
        result = await pool.query(`
          SELECT
            u.id,
            u.username,
            u.full_name,
            u.role,
            u.class_id,
            u.status,
            u.last_login,
            u.created_at,
            c.name AS class_name

          FROM users u

          LEFT JOIN classes c
            ON c.id = u.class_id

          ORDER BY u.created_at DESC
        `);
      }

      const users = result.rows.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        classId: user.class_id,
        className: user.class_name,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      }));

      res.json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("GET /api/admin/users:", error);

      res.status(500).json({
        message: "Gagal mengambil daftar akun.",
      });
    }
  }
);

/* =========================================================
   ADMIN BLOCK / UNBLOCK USER
========================================================= */

app.put(
  "/api/admin/users/:id/status",
  authenticateAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { status } = req.body;

      if (!Number.isInteger(userId)) {
        return res.status(400).json({
          message: "ID pengguna tidak valid.",
        });
      }

      if (!["active", "blocked"].includes(status)) {
        return res.status(400).json({
          message:
            "Status harus active atau blocked.",
        });
      }

      const result = await pool.query(
        `
        UPDATE users
        SET status = $1
        WHERE id = $2
        RETURNING
          id,
          username,
          full_name,
          role,
          class_id,
          status
        `,
        [status, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Pengguna tidak ditemukan.",
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        message:
          status === "blocked"
            ? "Akun berhasil diblokir."
            : "Akun berhasil dibuka kembali.",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          classId: user.class_id,
          status: user.status,
        },
      });
    } catch (error) {
      console.error(
        "PUT /api/admin/users/:id/status:",
        error
      );

      res.status(500).json({
        message: "Gagal mengubah status akun.",
      });
    }
  }
);

/* =========================================================
   ADMIN TASKS
========================================================= */

app.get(
  "/api/admin/tasks",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          t.id,
          t.subject,
          t.title,
          t.description,
          t.deadline,
          t.class_id,
          t.created_by,
          t.created_at,

          c.name AS class_name,
          u.username AS creator_username,
          u.full_name AS creator_full_name,

          COUNT(DISTINCT students.id)
            FILTER (
              WHERE students.role = 'siswa'
            ) AS total_students,

          COUNT(DISTINCT tc.student_id)
            AS completed_students

        FROM tasks t

        LEFT JOIN classes c
          ON c.id = t.class_id

        LEFT JOIN users u
          ON u.id = t.created_by

        LEFT JOIN users students
          ON students.class_id = t.class_id
          AND students.role = 'siswa'

        LEFT JOIN task_completions tc
          ON tc.task_id = t.id

        GROUP BY
          t.id,
          c.name,
          u.username,
          u.full_name

        ORDER BY t.created_at DESC
      `);

      const tasks = result.rows.map((task) => ({
        id: task.id,
        subject: task.subject,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        classId: task.class_id,
        className: task.class_name,
        createdBy: task.created_by,
        creatorUsername: task.creator_username,
        creatorFullName: task.creator_full_name,
        createdAt: task.created_at,

        totalStudents: Number(
          task.total_students || 0
        ),

        completedStudents: Number(
          task.completed_students || 0
        ),

        incompleteStudents: Math.max(
          0,
          Number(task.total_students || 0) -
            Number(task.completed_students || 0)
        ),
      }));

      res.json({
        success: true,
        tasks,
      });
    } catch (error) {
      console.error("GET /api/admin/tasks:", error);

      res.status(500).json({
        message: "Gagal mengambil daftar tugas.",
      });
    }
  }
);

/* =========================================================
   ADMIN CLASSES
========================================================= */

app.get(
  "/api/admin/classes",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          c.id,
          c.name,

          COUNT(u.id) FILTER (
            WHERE u.role = 'siswa'
          )::int AS total_students,

          COUNT(u.id) FILTER (
            WHERE u.role = 'guru'
          )::int AS total_teachers

        FROM classes c

        LEFT JOIN users u
          ON u.class_id = c.id

        GROUP BY
          c.id,
          c.name

        ORDER BY c.id
      `);

      const classes = result.rows.map((item) => ({
        id: item.id,
        name: item.name,
        totalStudents: Number(
          item.total_students || 0
        ),
        totalTeachers: Number(
          item.total_teachers || 0
        ),
      }));

      res.json({
        success: true,
        classes,
      });
    } catch (error) {
      console.error(
        "GET /api/admin/classes:",
        error
      );

      res.status(500).json({
        message: "Gagal mengambil daftar kelas.",
      });
    }
  }
);

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan.",
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server.",
  });
});

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    const result = await pool.query(
      "SELECT NOW() AS now"
    );

    console.log(
      "PostgreSQL connected:",
      result.rows[0].now
    );

    app.listen(PORT, HOST, () => {
      console.log("");
      console.log("==========================================");
      console.log(" PR REMINDER API");
      console.log("==========================================");
      console.log(` Server: http://localhost:${PORT}`);
      console.log(` Port: ${PORT}`);
      console.log(` Host: ${HOST}`);
      console.log(" Database: PostgreSQL / Supabase");
      console.log("==========================================");
      console.log("");
    });
  } catch (error) {
    console.error("");
    console.error(
      "GAGAL TERHUBUNG KE DATABASE POSTGRESQL."
    );
    console.error(error.message);
    console.error("");
    console.error(
      "Periksa DATABASE_URL di file .env."
    );

    process.exit(1);
  }
}

startServer();
