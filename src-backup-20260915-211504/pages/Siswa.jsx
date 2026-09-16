import React, { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const SUBJECT_COLORS = {
  Matematika: "#2563eb",
  "Bahasa Indonesia": "#7c3aed",
  "Bahasa Inggris": "#0891b2",
  IPA: "#059669",
  IPS: "#d97706",
  PPKn: "#dc2626",
  Informatika: "#4f46e5",
  Seni: "#db2777",
  PJOK: "#16a34a",
  Prakarya: "#9333ea",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function subjectColor(subject) {
  return SUBJECT_COLORS[subject] || "#2563eb";
}

function isOverdue(task) {
  if (!task?.deadline) return false;
  if (task.completedByMe) return false;

  return new Date(task.deadline).getTime() < Date.now();
}

function Siswa({
  user: userProp = null,
  onLogout = null,
  onBack = null,
}) {
  const [user, setUser] = useState(userProp);
  const [page, setPage] = useState("home");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("saran");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  useEffect(() => {
    if (userProp) {
      setUser(userProp);
      return;
    }

    try {
      const saved = localStorage.getItem("prReminderUser");

      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (err) {
      console.error(err);
    }
  }, [userProp]);

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("prReminderToken");

      if (!token) {
        throw new Error("Token login tidak ditemukan.");
      }

      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil tugas."
        );
      }

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengambil tugas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function toggleTask(task) {
    try {
      const token = localStorage.getItem("prReminderToken");

      if (!token) {
        throw new Error("Token login tidak ditemukan.");
      }

      const completed = !Boolean(task.completedByMe);

      const response = await fetch(
        `${API_URL}/api/tasks/${task.id}/completion`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengubah status tugas."
        );
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                completedByMe: completed,
                completedStudents:
                  data.completedStudents ??
                  item.completedStudents,
                incompleteStudents:
                  data.incompleteStudents ??
                  item.incompleteStudents,
              }
            : item
        )
      );

      setSelectedTask((current) => {
        if (!current || current.id !== task.id) {
          return current;
        }

        return {
          ...current,
          completedByMe: completed,
          completedStudents:
            data.completedStudents ??
            current.completedStudents,
          incompleteStudents:
            data.incompleteStudents ??
            current.incompleteStudents,
        };
      });
    } catch (err) {
      console.error(err);
      window.alert(
        err.message || "Gagal mengubah status tugas."
      );
    }
  }

  async function submitFeedback(event) {
    event.preventDefault();

    setFeedbackError("");
    setFeedbackSuccess("");

    const message = feedbackMessage.trim();

    if (!message) {
      setFeedbackError("Masukan belum diisi.");
      return;
    }

    try {
      setFeedbackSaving(true);

      const token = localStorage.getItem("prReminderToken");

      if (!token) {
        throw new Error("Token login tidak ditemukan.");
      }

      const response = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: feedbackType,
          message,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengirim masukan."
        );
      }

      setFeedbackMessage("");
      setFeedbackType("saran");
      setFeedbackSuccess(
        "Masukan berhasil dikirim."
      );
    } catch (err) {
      console.error(err);
      setFeedbackError(
        err.message || "Gagal mengirim masukan."
      );
    } finally {
      setFeedbackSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("prReminderToken");
    localStorage.removeItem("prReminderUser");

    if (typeof onLogout === "function") {
      onLogout();
    }
  }

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completedByMe
  ).length;

  const unfinishedTasks =
    totalTasks - completedTasks;

  const overdueTasks = tasks.filter(
    (task) => isOverdue(task)
  ).length;

  const upcomingTasks = [...tasks]
    .filter((task) => !task.completedByMe)
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() -
        new Date(b.deadline).getTime()
    );

  function taskStatus(task) {
    if (task.completedByMe) {
      return {
        text: "Selesai",
        color: "#15803d",
        background: "#dcfce7",
      };
    }

    if (isOverdue(task)) {
      return {
        text: "Terlambat",
        color: "#b91c1c",
        background: "#fee2e2",
      };
    }

    return {
      text: "Belum selesai",
      color: "#c2410c",
      background: "#ffedd5",
    };
  }

  function TaskCard({ task }) {
    const status = taskStatus(task);
    const color = subjectColor(task.subject);

    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #dbe4f0",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              background: `${color}15`,
              color,
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {task.subject || "Pelajaran"}
          </span>

          <span
            style={{
              background: status.background,
              color: status.color,
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {status.text}
          </span>
        </div>

        <h3
          style={{
            color: "#173b69",
            margin: "15px 0 7px",
            fontSize: 18,
          }}
        >
          {task.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: "#60728b",
            lineHeight: 1.6,
            fontSize: 13,
          }}
        >
          {task.description}
        </p>

        <div
          style={{
            marginTop: 15,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div style={infoBox}>
            <small>Deadline</small>
            <strong>{formatDate(task.deadline)}</strong>
          </div>

          <div style={infoBox}>
            <small>Kelas</small>
            <strong>
              {task.className || user?.classId || "-"}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 15,
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedTask(task)}
            style={secondaryButton}
          >
            Lihat detail
          </button>

          <button
            type="button"
            onClick={() => toggleTask(task)}
            style={
              task.completedByMe
                ? greenButton
                : primaryButton
            }
          >
            {task.completedByMe
              ? "Batalkan selesai"
              : "Tandai selesai"}
          </button>
        </div>
      </div>
    );
  }

  function renderTaskList(list) {
    if (loading) {
      return (
        <div style={emptyCard}>
          Memuat tugas...
        </div>
      );
    }

    if (error) {
      return (
        <div style={emptyCard}>
          <div
            style={{
              color: "#b91c1c",
              marginBottom: 12,
            }}
          >
            {error}
          </div>

          <button
            type="button"
            onClick={loadTasks}
            style={primaryButton}
          >
            Coba lagi
          </button>
        </div>
      );
    }

    if (!list.length) {
      return (
        <div style={emptyCard}>
          <strong
            style={{
              display: "block",
              color: "#173b69",
              marginBottom: 6,
            }}
          >
            Belum ada tugas.
          </strong>

          <span
            style={{
              color: "#789",
              fontSize: 13,
            }}
          >
            Tugas dari guru akan muncul di sini.
          </span>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        {list.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  }

  function renderHome() {
    return (
      <>
        <div
          style={{
            background:
              "linear-gradient(135deg,#eaf4ff,#f8fbff)",
            border: "1px solid #d6e8fb",
            borderRadius: 22,
            padding: 23,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: "#1971d4",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            PR REMINDER
          </div>

          <h1
            style={{
              color: "#173b69",
              margin: "9px 0 6px",
              fontSize: 28,
            }}
          >
            Halo, {user?.fullName || user?.username || "Siswa"}
          </h1>

          <p
            style={{
              color: "#60728b",
              margin: 0,
              fontSize: 13,
            }}
          >
            Jangan lupa selesaikan tugas tepat waktu.
          </p>

          <div
            style={{
              display: "inline-block",
              marginTop: 14,
              background: "#fff",
              color: "#2563eb",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Kelas {user?.classId || "-"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Total tugas"
            value={totalTasks}
          />

          <StatCard
            label="Selesai"
            value={completedTasks}
          />

          <StatCard
            label="Belum selesai"
            value={unfinishedTasks}
          />
        </div>

        <h2 style={sectionTitle}>
          Tugas mendatang
        </h2>

        {renderTaskList(upcomingTasks.slice(0, 5))}
      </>
    );
  }

  function renderTasks() {
    return (
      <>
        <h1 style={pageTitle}>Tugas</h1>

        <p style={pageSubtitle}>
          Semua tugas untuk kelas{" "}
          <strong>{user?.classId || "-"}</strong>.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Total"
            value={totalTasks}
          />

          <StatCard
            label="Terlambat"
            value={overdueTasks}
          />

          <StatCard
            label="Selesai"
            value={completedTasks}
          />
        </div>

        {renderTaskList(tasks)}
      </>
    );
  }

  function renderCalendar() {
    return (
      <>
        <h1 style={pageTitle}>Kalender</h1>

        <p style={pageSubtitle}>
          Daftar deadline tugas.
        </p>

        {renderTaskList(
          [...tasks].sort(
            (a, b) =>
              new Date(a.deadline).getTime() -
              new Date(b.deadline).getTime()
          )
        )}
      </>
    );
  }

  function renderProfile() {
    return (
      <>
        <h1 style={pageTitle}>Profil</h1>

        <p style={pageSubtitle}>
          Informasi akun siswa.
        </p>

        <div
          style={{
            background: "#fff",
            border: "1px solid #dbe4f0",
            borderRadius: 18,
            padding: 20,
            display: "grid",
            gap: 14,
          }}
        >
          <ProfileRow
            label="Nama lengkap"
            value={user?.fullName || "-"}
          />

          <ProfileRow
            label="Username"
            value={user?.username || "-"}
          />

          <ProfileRow
            label="Kelas"
            value={user?.classId || "-"}
          />

          <ProfileRow
            label="Role"
            value="Siswa"
          />

          <ProfileRow
            label="Status"
            value={
              user?.status === "blocked"
                ? "Blocked"
                : "Aktif"
            }
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setFeedbackOpen(true);
            setFeedbackError("");
            setFeedbackSuccess("");
          }}
          style={{
            width: "100%",
            marginTop: 14,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#173b69",
            borderRadius: 12,
            padding: 14,
            cursor: "pointer",
            fontWeight: 700,
            textAlign: "left",
          }}
        >
          Masukan / Saran
        </button>

        <button
          type="button"
          onClick={logout}
          style={{
            width: "100%",
            marginTop: 10,
            border: "none",
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 12,
            padding: 14,
            cursor: "pointer",
            fontWeight: 700,
            textAlign: "left",
          }}
        >
          Keluar dari akun
        </button>

        {typeof onBack === "function" && (
          <button
            type="button"
            onClick={onBack}
            style={{
              width: "100%",
              marginTop: 10,
              border: "1px solid #dbe4f0",
              background: "#f8fafc",
              color: "#60728b",
              borderRadius: 12,
              padding: 14,
              cursor: "pointer",
              fontWeight: 700,
              textAlign: "left",
            }}
          >
            Kembali
          </button>
        )}
      </>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#f2f8ff 0%,#fff 45%)",
      }}
    >
      <header
        style={{
          background: "#1976e8",
          color: "#fff",
          padding: "13px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              PR Reminder
            </div>

            <div
              style={{
                fontSize: 10,
                opacity: 0.85,
              }}
            >
              Dashboard Siswa
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 12,
            }}
          >
            <div>
              {user?.fullName ||
                user?.username ||
                "Siswa"}
            </div>

            <div style={{ opacity: 0.8 }}>
              Kelas {user?.classId || "-"}
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "26px 20px 100px",
        }}
      >
        {page === "home" && renderHome()}
        {page === "tasks" && renderTasks()}
        {page === "calendar" && renderCalendar()}
        {page === "profile" && renderProfile()}
      </main>

      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderTop: "1px solid #dbe4f0",
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns:
              "repeat(4,1fr)",
          }}
        >
          <NavButton
            active={page === "home"}
            label="Beranda"
            onClick={() => setPage("home")}
          />

          <NavButton
            active={page === "tasks"}
            label="Tugas"
            onClick={() => setPage("tasks")}
          />

          <NavButton
            active={page === "calendar"}
            label="Kalender"
            onClick={() => setPage("calendar")}
          />

          <NavButton
            active={page === "profile"}
            label="Profil"
            onClick={() => setPage("profile")}
          />
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 9,
            color: "#94a3b8",
            paddingBottom: 6,
          }}
        >
          Made by Rayva
        </div>
      </nav>

      {selectedTask && (
        <div
          style={modalOverlay}
          onClick={() => setSelectedTask(null)}
        >
          <div
            style={modalBox}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    color: subjectColor(
                      selectedTask.subject
                    ),
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {selectedTask.subject}
                </div>

                <h2
                  style={{
                    margin: "7px 0 0",
                    color: "#173b69",
                  }}
                >
                  {selectedTask.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTask(null)
                }
                style={closeButton}
              >
                X
              </button>
            </div>

            <p
              style={{
                color: "#60728b",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                marginTop: 18,
              }}
            >
              {selectedTask.description}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div style={infoBox}>
                <small>Deadline</small>
                <strong>
                  {formatDateTime(
                    selectedTask.deadline
                  )}
                </strong>
              </div>

              <div style={infoBox}>
                <small>Status</small>
                <strong>
                  {
                    taskStatus(selectedTask)
                      .text
                  }
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                toggleTask(selectedTask)
              }
              style={{
                ...primaryButton,
                width: "100%",
                marginTop: 16,
              }}
            >
              {selectedTask.completedByMe
                ? "Batalkan selesai"
                : "Tandai selesai"}
            </button>
          </div>
        </div>
      )}

      {feedbackOpen && (
        <div
          style={modalOverlay}
          onClick={() => setFeedbackOpen(false)}
        >
          <div
            style={modalBox}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#173b69",
                  }}
                >
                  Masukan / Saran
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#789",
                    fontSize: 13,
                  }}
                >
                  Kirim masukan untuk PR Reminder.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFeedbackOpen(false)
                }
                style={closeButton}
              >
                X
              </button>
            </div>

            {feedbackError && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: 11,
                  borderRadius: 10,
                  marginTop: 15,
                }}
              >
                {feedbackError}
              </div>
            )}

            {feedbackSuccess && (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: 11,
                  borderRadius: 10,
                  marginTop: 15,
                }}
              >
                {feedbackSuccess}
              </div>
            )}

            <form
              onSubmit={submitFeedback}
              style={{
                display: "grid",
                gap: 13,
                marginTop: 17,
              }}
            >
              <label
                style={{
                  color: "#173b69",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Jenis masukan
                <select
                  value={feedbackType}
                  onChange={(event) =>
                    setFeedbackType(
                      event.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="saran">
                    Saran
                  </option>

                  <option value="bug">
                    Bug
                  </option>

                  <option value="fitur">
                    Fitur Baru
                  </option>
                </select>
              </label>

              <label
                style={{
                  color: "#173b69",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Masukan
                <textarea
                  value={feedbackMessage}
                  onChange={(event) =>
                    setFeedbackMessage(
                      event.target.value
                    )
                  }
                  rows={6}
                  placeholder="Tulis masukan di sini..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={feedbackSaving}
                style={{
                  ...primaryButton,
                  opacity: feedbackSaving ? 0.6 : 1,
                }}
              >
                {feedbackSaving
                  ? "Mengirim..."
                  : "Kirim masukan"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #dbe4f0",
        borderRadius: 15,
        padding: 14,
      }}
    >
      <div
        style={{
          color: "#789",
          fontSize: 11,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          color: "#173b69",
          fontSize: 23,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 10,
        paddingBottom: 11,
        borderBottom: "1px solid #eef2f7",
      }}
    >
      <span
        style={{
          color: "#789",
          fontSize: 13,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#173b69",
          fontSize: 13,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function NavButton({
  active,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        borderTop: active
          ? "3px solid #1971d4"
          : "3px solid transparent",
        background: "#fff",
        color: active ? "#1971d4" : "#94a3b8",
        padding: "12px 5px 10px",
        cursor: "pointer",
        fontWeight: active ? 800 : 600,
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );
}

const infoBox = {
  background: "#f8fafc",
  borderRadius: 11,
  padding: 11,
  display: "grid",
  gap: 4,
};

const primaryButton = {
  border: "none",
  background: "#2563eb",
  color: "#fff",
  padding: "11px 14px",
  borderRadius: 11,
  cursor: "pointer",
  fontWeight: 700,
};

const greenButton = {
  border: "none",
  background: "#dcfce7",
  color: "#15803d",
  padding: "11px 14px",
  borderRadius: 11,
  cursor: "pointer",
  fontWeight: 700,
  flex: 1,
};

const secondaryButton = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#173b69",
  padding: "11px 14px",
  borderRadius: 11,
  cursor: "pointer",
  fontWeight: 700,
  flex: 1,
};

const emptyCard = {
  background: "#fff",
  border: "1px solid #dbe4f0",
  borderRadius: 18,
  padding: 28,
  textAlign: "center",
  color: "#789",
};

const pageTitle = {
  margin: 0,
  color: "#173b69",
  fontSize: 28,
};

const pageSubtitle = {
  margin: "7px 0 20px",
  color: "#789",
  fontSize: 13,
};

const sectionTitle = {
  color: "#173b69",
  fontSize: 20,
  margin: "0 0 13px",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 7,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  background: "#fff",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalBox = {
  width: "min(600px,100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 25px 70px rgba(15,23,42,0.25)",
};

const closeButton = {
  width: 36,
  height: 36,
  border: "1px solid #dbe4f0",
  background: "#fff",
  color: "#64748b",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: 700,
};

export default Siswa;