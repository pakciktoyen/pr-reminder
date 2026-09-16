require("dotenv").config();

const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL belum diatur di file .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function seed() {
  try {
    console.log("Menghubungkan ke PostgreSQL...");

    await pool.query("SELECT NOW()");

    console.log("Database terhubung.");
    console.log("");

    const classes = [
      ["7A", "7A"],
      ["7B", "7B"],
      ["7C", "7C"],
      ["7D", "7D"],
      ["8A", "8A"],
      ["8B", "8B"],
      ["8C", "8C"],
      ["8D", "8D"],
      ["9A", "9A"],
      ["9B", "9B"],
      ["9C", "9C"],
      ["9D", "9D"],
    ];

    for (const [id, name] of classes) {
      await pool.query(
        `
        INSERT INTO classes (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id)
        DO UPDATE SET name = EXCLUDED.name
        `,
        [id, name]
      );
    }

    console.log("✓ 12 kelas tersedia.");
    console.log("");
    console.log("Tidak ada akun contoh yang dibuat.");
    console.log("Akun pribadi akan dibuat melalui sistem akun PR Reminder.");
    console.log("");
    console.log("==========================================");
    console.log(" SEED SELESAI");
    console.log("==========================================");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("SEED GAGAL:");
    console.error(error);
    console.error("");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();