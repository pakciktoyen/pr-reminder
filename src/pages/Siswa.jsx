import { useEffect, useMemo, useState } from "react";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAYS = [
  "Min",
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
];

export default function Siswa({ user, onLogout }) {
  const [page, setPage] = useState("home");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const token = localStorage.getItem("prReminderToken");

  async function loadTasks() {
    try {
      setLoading(true);

      const response = await fetch(`${API}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        onLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil tugas."
        );
      }

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (error) {
      console.error("LOAD TASKS:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function toggleComplete(task) {
    try {
      const response = await fetch(
        `${API}/api/tasks/${task.id}/completion`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: !task.completedByMe,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        onLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal mengubah status tugas."
        );
      }

      await loadTasks();
    } catch (error) {
      console.error("TOGGLE TASK:", error);
    }
  }

  const todoTasks = tasks.filter(
    (task) => !task.completedByMe
  );

  const doneTasks = tasks.filter(
    (task) => task.completedByMe
  );

  return (
    <div style={styles.app}>
      <header style={styles.topbar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>PR</div>

          <div>
            <div style={styles.brandName}>
              PR Reminder
            </div>

            <div style={styles.brandSub}>
              Dashboard Siswa
            </div>
          </div>
        </div>

        <div style={styles.topUser}>
          <div style={styles.topUserText}>
            <strong>
              {user?.fullName ||
                user?.username ||
                "Siswa"}
            </strong>

            <span>
              Kelas {user?.classId || "-"}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={styles.logoutButton}
          >
            Keluar
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {page === "home" && (
          <HomePage
            user={user}
            tasks={tasks}
            todoTasks={todoTasks}
            doneTasks={doneTasks}
            loading={loading}
            openTask={setSelectedTask}
            complete={toggleComplete}
            goTo={setPage}
          />
        )}

        {page === "tasks" && (
          <TasksPage
            tasks={tasks}
            loading={loading}
            openTask={setSelectedTask}
            complete={toggleComplete}
          />
        )}

        {page === "calendar" && (
          <CalendarPage
            tasks={tasks}
            openTask={setSelectedTask}
          />
        )}

        {page === "profile" && (
          <ProfilePage
            user={user}
            openFeedback={() =>
              setShowFeedback(true)
            }
            logout={onLogout}
          />
        )}
      </main>

      <footer style={styles.bottomNav}>
        <NavButton
          active={page === "home"}
          label="Beranda"
          icon="H"
          onClick={() => setPage("home")}
        />

        <NavButton
          active={page === "tasks"}
          label="Tugas"
          icon="T"
          onClick={() => setPage("tasks")}
        />

        <NavButton
          active={page === "calendar"}
          label="Kalender"
          icon="K"
          onClick={() => setPage("calendar")}
        />

        <NavButton
          active={page === "profile"}
          label="Profil"
          icon="P"
          onClick={() => setPage("profile")}
        />

        <div style={styles.watermark}>
          {"\u2665"} Made by Rayva
        </div>
      </footer>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          close={() => setSelectedTask(null)}
          complete={() =>
            toggleComplete(selectedTask)
          }
        />
      )}

      {showFeedback && (
        <FeedbackModal
          close={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

/* =========================================================
   HOME
========================================================= */

function HomePage({
  user,
  tasks,
  todoTasks,
  doneTasks,
  loading,
  openTask,
  complete,
  goTo,
}) {
  const nearest = [...todoTasks]
    .sort(
      (a, b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    )
    .slice(0, 3);

  return (
    <div>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>
            DASHBOARD SISWA
          </div>

          <h1 style={styles.heroTitle}>
            Halo,{" "}
            {user?.fullName ||
              user?.username ||
              "Siswa"}
            !
          </h1>

          <p style={styles.heroText}>
            Berikut tugas yang diberikan untuk
            kelas{" "}
            <strong>
              {user?.classId || "-"}
            </strong>
            .
          </p>
        </div>

        <div style={styles.heroClass}>
          <span>Kelas</span>

          <strong>
            {user?.classId || "-"}
          </strong>
        </div>
      </section>

      <section style={styles.statsGrid}>
        <StatCard
          label="Total tugas"
          value={tasks.length}
        />

        <StatCard
          label="Belum selesai"
          value={todoTasks.length}
        />

        <StatCard
          label="Sudah selesai"
          value={doneTasks.length}
        />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Tugas terdekat
            </h2>

            <p style={styles.sectionText}>
              Jangan sampai lewat deadline.
            </p>
          </div>

          <button
            type="button"
            style={styles.linkButton}
            onClick={() => goTo("tasks")}
          >
            Lihat semua
          </button>
        </div>

        {loading ? (
          <LoadingBox />
        ) : nearest.length === 0 ? (
          <EmptyBox text="Tidak ada tugas yang belum selesai." />
        ) : (
          <div style={styles.taskList}>
            {nearest.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                open={() => openTask(task)}
                complete={() =>
                  complete(task)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   TASKS
========================================================= */

function TasksPage({
  tasks,
  loading,
  openTask,
  complete,
}) {
  const [filter, setFilter] = useState("all");

  const shown = tasks.filter((task) => {
    if (filter === "todo") {
      return !task.completedByMe;
    }

    if (filter === "done") {
      return task.completedByMe;
    }

    return true;
  });

  return (
    <div>
      <PageTitle
        title="Tugas"
        text="Semua tugas yang diberikan Guru."
      />

      <div style={styles.filterRow}>
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Semua
        </FilterButton>

        <FilterButton
          active={filter === "todo"}
          onClick={() => setFilter("todo")}
        >
          Belum selesai
        </FilterButton>

        <FilterButton
          active={filter === "done"}
          onClick={() => setFilter("done")}
        >
          Selesai
        </FilterButton>
      </div>

      {loading ? (
        <LoadingBox />
      ) : shown.length === 0 ? (
        <EmptyBox text="Tidak ada tugas pada kategori ini." />
      ) : (
        <div style={styles.taskList}>
          {shown.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              open={() => openTask(task)}
              complete={() =>
                complete(task)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CALENDAR
========================================================= */

function CalendarPage({
  tasks,
  openTask,
}) {
  const today = new Date();

  const [month, setMonth] = useState(
    today.getMonth()
  );

  const [year, setYear] = useState(
    today.getFullYear()
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const totalDays = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const previousMonthDays = new Date(
      year,
      month,
      0
    ).getDate();

    const cells = [];

    for (
      let i = firstDay - 1;
      i >= 0;
      i--
    ) {
      cells.push({
        day: previousMonthDays - i,
        current: false,
        date: null,
      });
    }

    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {
      cells.push({
        day,
        current: true,
        date: new Date(
          year,
          month,
          day
        ),
      });
    }

    let nextDay = 1;

    while (cells.length % 7 !== 0) {
      cells.push({
        day: nextDay,
        current: false,
        date: null,
      });

      nextDay += 1;
    }

    return cells;
  }, [month, year]);

  function previousMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((value) => value - 1);
    } else {
      setMonth((value) => value - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((value) => value + 1);
    } else {
      setMonth((value) => value + 1);
    }
  }

  function tasksForDate(date) {
    if (!date) {
      return [];
    }

    return tasks.filter((task) => {
      const deadline = new Date(
        task.deadline
      );

      return (
        deadline.getFullYear() ===
          date.getFullYear() &&
        deadline.getMonth() ===
          date.getMonth() &&
        deadline.getDate() ===
          date.getDate()
      );
    });
  }

  const monthTasks = tasksForMonth(
    tasks,
    year,
    month
  );

  return (
    <div>
      <PageTitle
        title="Kalender"
        text="Daftar deadline tugas berdasarkan tanggal."
      />

      <section style={styles.calendarPanel}>
        <div style={styles.calendarHeader}>
          <button
            type="button"
            onClick={previousMonth}
            style={styles.calendarArrow}
          >
            {"<"}
          </button>

          <h2 style={styles.calendarMonth}>
            {MONTHS[month]} {year}
          </h2>

          <button
            type="button"
            onClick={nextMonth}
            style={styles.calendarArrow}
          >
            {">"}
          </button>
        </div>

        <div style={styles.calendarWeek}>
          {DAYS.map((day) => (
            <div
              key={day}
              style={styles.calendarWeekDay}
            >
              {day}
            </div>
          ))}
        </div>

        <div style={styles.calendarGrid}>
          {calendarDays.map(
            (cell, index) => {
              const dayTasks =
                tasksForDate(cell.date);

              return (
                <div
                  key={`${cell.day}-${index}`}
                  style={{
                    ...styles.calendarCell,
                    opacity: cell.current
                      ? 1
                      : 0.35,
                  }}
                >
                  <div
                    style={
                      styles.calendarNumber
                    }
                  >
                    {cell.day}
                  </div>

                  <div
                    style={
                      styles.calendarTasks
                    }
                  >
                    {dayTasks.map(
                      (task) => (
                        <button
                          type="button"
                          key={task.id}
                          onClick={() =>
                            openTask(task)
                          }
                          style={
                            styles.calendarTask
                          }
                        >
                          {task.title}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      <section style={styles.calendarLegend}>
        <strong>
          Deadline bulan ini
        </strong>

        {monthTasks.length === 0 ? (
          <span>
            Belum ada deadline pada bulan
            ini.
          </span>
        ) : (
          monthTasks.map((task) => (
            <button
              type="button"
              key={task.id}
              onClick={() =>
                openTask(task)
              }
              style={styles.deadlineItem}
            >
              <span>
                {formatDate(task.deadline)}
              </span>

              <strong>
                {task.title}
              </strong>
            </button>
          ))
        )}
      </section>
    </div>
  );
}

function tasksForMonth(
  tasks,
  year,
  month
) {
  return tasks
    .filter((task) => {
      const date = new Date(
        task.deadline
      );

      return (
        date.getFullYear() === year &&
        date.getMonth() === month
      );
    })
    .sort(
      (a, b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfilePage({
  user,
  openFeedback,
  logout,
}) {
  const displayName =
    user?.fullName ||
    user?.username ||
    "Siswa";

  return (
    <div>
      <PageTitle
        title="Profil"
        text="Informasi akun Siswa."
      />

      <section style={styles.profileCard}>
        <div style={styles.profileAvatar}>
          {displayName[0].toUpperCase()}
        </div>

        <h2 style={styles.profileName}>
          {displayName}
        </h2>

        <p style={styles.profileUsername}>
          @{user?.username || "-"}
        </p>

        <div style={styles.infoList}>
          <InfoRow
            label="Nama lengkap"
            value={
              user?.fullName || "-"
            }
          />

          <InfoRow
            label="Username"
            value={
              user?.username || "-"
            }
          />

          <InfoRow
            label="Kelas"
            value={
              user?.classId || "-"
            }
          />

          <InfoRow
            label="Peran"
            value="Siswa"
          />
        </div>

        <button
          type="button"
          onClick={openFeedback}
          style={styles.feedbackButton}
        >
          Masukan / Saran
        </button>

        <button
          type="button"
          onClick={logout}
          style={styles.profileLogout}
        >
          Keluar dari akun
        </button>
      </section>
    </div>
  );
}

/* =========================================================
   FEEDBACK
========================================================= */

function FeedbackModal({ close }) {
  const [type, setType] = useState("saran");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  async function submit(event) {
    event.preventDefault();

    const cleanMessage = message.trim();

    setNotice(null);

    if (!cleanMessage) {
      setNotice({
        type: "error",
        text: "Masukan belum diisi.",
      });
      return;
    }

    if (cleanMessage.length < 3) {
      setNotice({
        type: "error",
        text: "Masukan minimal 3 karakter.",
      });
      return;
    }

    const token =
      localStorage.getItem(
        "prReminderToken"
      );

    if (!token) {
      setNotice({
        type: "error",
        text:
          "Sesi tidak ditemukan. Silakan login kembali.",
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        `${API}/api/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type,
            message: cleanMessage,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal mengirim masukan."
        );
      }

      setMessage("");

      setNotice({
        type: "success",
        text: "Masukan berhasil dikirim.",
      });
    } catch (error) {
      console.error(
        "SISWA FEEDBACK:",
        error
      );

      setNotice({
        type: "error",
        text:
          error.message ||
          "Gagal mengirim masukan.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button
          type="button"
          onClick={close}
          disabled={sending}
          style={styles.closeButton}
        >
          ×
        </button>

        <h2 style={styles.modalTitle}>
          Masukan / Saran
        </h2>

        <p style={styles.modalText}>
          Sampaikan saran, laporan bug,
          atau ide fitur untuk PR Reminder.
        </p>

        <form onSubmit={submit}>
          <label style={styles.label}>
            Kategori
          </label>

          <div style={styles.feedbackTypes}>
            <button
              type="button"
              disabled={sending}
              onClick={() => {
                setType("saran");
                setNotice(null);
              }}
              style={{
                ...styles.feedbackType,
                ...(type === "saran"
                  ? styles.feedbackTypeActive
                  : {}),
              }}
            >
              Saran
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() => {
                setType("bug");
                setNotice(null);
              }}
              style={{
                ...styles.feedbackType,
                ...(type === "bug"
                  ? styles.feedbackTypeActive
                  : {}),
              }}
            >
              Bug
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() => {
                setType("fitur");
                setNotice(null);
              }}
              style={{
                ...styles.feedbackType,
                ...(type === "fitur"
                  ? styles.feedbackTypeActive
                  : {}),
              }}
            >
              Fitur Baru
            </button>
          </div>

          <label style={styles.label}>
            Pesan
          </label>

          <textarea
            value={message}
            onChange={(event) => {
              setMessage(
                event.target.value
              );
              setNotice(null);
            }}
            placeholder="Tulis masukan kamu..."
            rows={6}
            disabled={sending}
            style={styles.textarea}
          />

          {/* NOTIFIKASI SENGAJA DI SINI:
              kiri atas, tepat sebelum tombol */}
          {notice && (
            <div
              style={{
                marginTop: "8px",
                marginBottom: "0",
                textAlign: "left",
                fontSize: "12px",
                fontWeight: "700",
                color:
                  notice.type === "error"
                    ? "#dc2626"
                    : "#16a34a",
              }}
            >
              {notice.text}
            </div>
          )}

          <button
            type="submit"
            disabled={
              sending ||
              !message.trim()
            }
            style={{
              ...styles.primaryButton,
              marginTop: "8px",
              opacity:
                sending ||
                !message.trim()
                  ? 0.65
                  : 1,
            }}
          >
            {sending
              ? "Mengirim..."
              : "Kirim Masukan"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   TASK CARD
========================================================= */

function TaskCard({
  task,
  open,
  complete,
}) {
  return (
    <article
      style={{
        ...styles.taskCard,
        borderColor: task.completedByMe
          ? "#bbf7d0"
          : "#dbe3f0",
      }}
    >
      <div style={styles.taskTop}>
        <span style={styles.subjectBadge}>
          {task.subject}
        </span>

        <span
          style={{
            ...styles.statusBadge,
            background:
              task.completedByMe
                ? "#dcfce7"
                : "#ffedd5",
            color:
              task.completedByMe
                ? "#15803d"
                : "#c2410c",
          }}
        >
          {task.completedByMe
            ? "Selesai"
            : "Belum selesai"}
        </span>
      </div>

      <h3 style={styles.taskTitle}>
        {task.title}
      </h3>

      <p style={styles.taskDescription}>
        {task.description}
      </p>

      <div style={styles.taskDeadline}>
        <span>Deadline</span>

        <strong>
          {formatDateTime(
            task.deadline
          )}
        </strong>
      </div>

      <div style={styles.taskActions}>
        <button
          type="button"
          onClick={open}
          style={styles.detailButton}
        >
          Lihat detail
        </button>

        <button
          type="button"
          onClick={complete}
          style={
            task.completedByMe
              ? styles.undoButton
              : styles.completeButton
          }
        >
          {task.completedByMe
            ? "Batalkan"
            : "Tandai selesai"}
        </button>
      </div>
    </article>
  );
}

/* =========================================================
   TASK MODAL
========================================================= */

function TaskModal({
  task,
  close,
  complete,
}) {
  return (
    <Modal close={close}>
      <div style={styles.modalBadges}>
        <span style={styles.subjectBadge}>
          {task.subject}
        </span>

        <span style={styles.classBadge}>
          Kelas{" "}
          {task.className ||
            task.classId ||
            "-"}
        </span>
      </div>

      <h2 style={styles.modalTitle}>
        {task.title}
      </h2>

      <p style={styles.modalDescription}>
        {task.description}
      </p>

      <div style={styles.detailBox}>
        <div style={styles.detailBoxItem}>
          <span>Deadline</span>

          <strong>
            {formatDateTime(
              task.deadline
            )}
          </strong>
        </div>

        <div style={styles.detailBoxItem}>
          <span>Status</span>

          <strong>
            {task.completedByMe
              ? "Sudah selesai"
              : "Belum selesai"}
          </strong>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          complete();
          close();
        }}
        style={
          task.completedByMe
            ? styles.undoButtonLarge
            : styles.primaryButton
        }
      >
        {task.completedByMe
          ? "Batalkan selesai"
          : "Tandai selesai"}
      </button>
    </Modal>
  );
}

/* =========================================================
   GENERIC
========================================================= */

function Modal({
  children,
  close,
}) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button
          type="button"
          onClick={close}
          style={styles.closeButton}
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
}

function PageTitle({
  title,
  text,
}) {
  return (
    <div style={styles.pageTitle}>
      <h1 style={styles.pageTitleHeading}>
        {title}
      </h1>

      <p style={styles.pageTitleText}>
        {text}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
}) {
  return (
    <div style={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.filterButton,
        ...(active
          ? styles.filterButtonActive
          : {}),
      }}
    >
      {children}
    </button>
  );
}

function NavButton({
  active,
  label,
  icon,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.navButton,
        color: active
          ? "#2563eb"
          : "#8da0bc",
      }}
    >
      <span
        style={{
          ...styles.navIcon,
          background: active
            ? "#eaf1ff"
            : "transparent",
        }}
      >
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}

function LoadingBox() {
  return (
    <div style={styles.emptyBox}>
      Memuat tugas...
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div style={styles.emptyBox}>
      {text}
    </div>
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f7faff",
    color: "#14213d",
    fontFamily:
      "Inter, Arial, sans-serif",
    paddingBottom: "92px",
  },

  topbar: {
    minHeight: "72px",
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 7%",
    boxSizing: "border-box",
    gap: "20px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  brandIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#fff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "12px",
    flexShrink: 0,
  },

  brandName: {
    fontSize: "16px",
    fontWeight: "800",
  },

  brandSub: {
    fontSize: "10px",
    opacity: 0.8,
    marginTop: "2px",
  },

  topUser: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  topUserText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
    fontSize: "12px",
  },

  logoutButton: {
    border:
      "1px solid rgba(255,255,255,.5)",
    background: "transparent",
    color: "#fff",
    borderRadius: "9px",
    padding: "9px 15px",
    cursor: "pointer",
    fontWeight: "700",
  },

  main: {
    width: "min(1050px, 90%)",
    margin: "0 auto",
    paddingTop: "34px",
  },

  hero: {
    background:
      "linear-gradient(135deg,#2563eb,#4385f5)",
    color: "#fff",
    borderRadius: "20px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    boxShadow:
      "0 18px 40px rgba(37,99,235,.16)",
  },

  eyebrow: {
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.2px",
    opacity: 0.85,
  },

  heroTitle: {
    margin: "8px 0 7px",
    fontSize: "30px",
  },

  heroText: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.9,
  },

  heroClass: {
    minWidth: "100px",
    padding: "18px",
    background:
      "rgba(255,255,255,.14)",
    borderRadius: "14px",
    textAlign: "center",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "16px",
    marginTop: "20px",
  },

  statCard: {
    background: "#fff",
    border: "1px solid #e1e8f2",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  section: {
    marginTop: "28px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "21px",
  },

  sectionText: {
    margin: "5px 0 0",
    color: "#8190a7",
    fontSize: "13px",
  },

  linkButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontWeight: "800",
    cursor: "pointer",
  },

  pageTitle: {
    marginBottom: "24px",
  },

  pageTitleHeading: {
    margin: 0,
    fontSize: "30px",
    lineHeight: 1.2,
  },

  pageTitleText: {
    margin: "6px 0 0",
    color: "#8190a7",
    fontSize: "13px",
  },

  filterRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  filterButton: {
    border: "1px solid #d8e1ee",
    background: "#fff",
    color: "#5d6d85",
    borderRadius: "10px",
    padding: "10px 15px",
    cursor: "pointer",
    fontWeight: "700",
  },

  filterButtonActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
  },

  taskList: {
    display: "grid",
    gap: "14px",
  },

  taskCard: {
    background: "#fff",
    border: "1px solid",
    borderRadius: "16px",
    padding: "20px",
    boxShadow:
      "0 5px 18px rgba(30,50,90,.04)",
  },

  taskTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  subjectBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#eaf1ff",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "800",
  },

  classBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#f0f4fa",
    color: "#607089",
    fontSize: "11px",
    fontWeight: "800",
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "800",
  },

  taskTitle: {
    margin: "15px 0 8px",
    fontSize: "18px",
  },

  taskDescription: {
    margin: 0,
    color: "#687991",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  taskDeadline: {
    marginTop: "16px",
    padding: "13px",
    background: "#f6f8fc",
    borderRadius: "11px",
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    fontSize: "12px",
  },

  taskActions: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "9px",
    marginTop: "13px",
  },

  detailButton: {
    border: "1px solid #cfd9e8",
    background: "#fff",
    color: "#17345f",
    borderRadius: "10px",
    padding: "11px",
    cursor: "pointer",
    fontWeight: "800",
  },

  completeButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: "10px",
    padding: "11px",
    cursor: "pointer",
    fontWeight: "800",
  },

  undoButton: {
    border: "none",
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: "10px",
    padding: "11px",
    cursor: "pointer",
    fontWeight: "800",
  },

  emptyBox: {
    background: "#fff",
    border: "1px dashed #cad5e5",
    borderRadius: "16px",
    padding: "40px",
    textAlign: "center",
    color: "#8290a5",
  },

  calendarPanel: {
    background: "#fff",
    border: "1px solid #dce5f1",
    borderRadius: "18px",
    overflow: "hidden",
  },

  calendarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom:
      "1px solid #edf1f6",
  },

  calendarMonth: {
    margin: 0,
    fontSize: "19px",
  },

  calendarArrow: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    border: "1px solid #d8e2ef",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "900",
  },

  calendarWeek: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,1fr)",
    borderBottom:
      "1px solid #edf1f6",
  },

  calendarWeekDay: {
    textAlign: "center",
    padding: "11px 5px",
    fontSize: "11px",
    color: "#8493a9",
    fontWeight: "800",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,1fr)",
  },

  calendarCell: {
    minHeight: "90px",
    borderRight:
      "1px solid #edf1f6",
    borderBottom:
      "1px solid #edf1f6",
    padding: "8px",
    boxSizing: "border-box",
  },

  calendarNumber: {
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "5px",
  },

  calendarTasks: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  calendarTask: {
    border: "none",
    background: "#eaf1ff",
    color: "#2563eb",
    borderRadius: "5px",
    padding: "4px 5px",
    fontSize: "9px",
    textAlign: "left",
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  calendarLegend: {
    marginTop: "18px",
    background: "#fff",
    border: "1px solid #dce5f1",
    borderRadius: "16px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  deadlineItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    textAlign: "left",
    border: "1px solid #e1e8f2",
    background: "#f9fbff",
    borderRadius: "10px",
    padding: "11px",
    cursor: "pointer",
  },

  profileCard: {
    background: "#fff",
    border: "1px solid #dce5f1",
    borderRadius: "18px",
    padding: "30px",
    maxWidth: "650px",
    margin: "0 auto",
    textAlign: "center",
  },

  profileAvatar: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "#eaf1ff",
    color: "#2563eb",
    margin: "0 auto 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    fontWeight: "900",
  },

  profileName: {
    margin: 0,
  },

  profileUsername: {
    color: "#8190a7",
    margin: "5px 0 24px",
  },

  infoList: {
    textAlign: "left",
    borderTop: "1px solid #edf1f6",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    padding: "14px 0",
    borderBottom:
      "1px solid #edf1f6",
    fontSize: "13px",
  },

  feedbackButton: {
    width: "100%",
    marginTop: "20px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: "11px",
    padding: "13px",
    cursor: "pointer",
    fontWeight: "800",
  },

  profileLogout: {
    width: "100%",
    marginTop: "9px",
    border: "1px solid #fecaca",
    background: "#fff",
    color: "#dc2626",
    borderRadius: "11px",
    padding: "13px",
    cursor: "pointer",
    fontWeight: "800",
  },

  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "74px",
    background: "#fff",
    borderTop:
      "1px solid #e1e8f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "70px",
    zIndex: 20,
  },

  navButton: {
    border: "none",
    background: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  navIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "11px",
  },

  watermark: {
    position: "absolute",
    bottom: "4px",
    left: "50%",
    transform:
      "translateX(-50%)",
    fontSize: "9px",
    color: "#9aa7b9",
    pointerEvents: "none",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 100,
  },

  modal: {
    width: "min(560px,100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: "18px",
    padding: "28px",
    position: "relative",
    boxSizing: "border-box",
  },

  closeButton: {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    border:
      "1px solid #dce5f1",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "20px",
    color: "#66758a",
  },

  modalTitle: {
    margin: "0 40px 8px 0",
    fontSize: "22px",
  },

  modalText: {
    color: "#7a899f",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  modalDescription: {
    color: "#56667e",
    lineHeight: 1.7,
    fontSize: "14px",
  },

  modalBadges: {
    display: "flex",
    gap: "8px",
    marginBottom: "15px",
    flexWrap: "wrap",
  },

  detailBox: {
    background: "#f6f8fc",
    borderRadius: "12px",
    padding: "15px",
    display: "grid",
    gap: "12px",
    margin: "20px 0",
  },

  detailBoxItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
  },

  label: {
    display: "block",
    margin:
      "15px 0 7px",
    fontSize: "12px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #d5dfec",
    borderRadius: "10px",
    padding: "12px",
    fontFamily: "inherit",
    outline: "none",
    fontSize: "13px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #d5dfec",
    borderRadius: "10px",
    padding: "12px",
    fontFamily: "inherit",
    outline: "none",
    fontSize: "13px",
    resize: "vertical",
    display: "block",
  },

  primaryButton: {
    width: "100%",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: "10px",
    padding: "13px",
    marginTop: "16px",
    cursor: "pointer",
    fontWeight: "800",
  },

  undoButtonLarge: {
    width: "100%",
    border: "none",
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: "10px",
    padding: "13px",
    marginTop: "16px",
    cursor: "pointer",
    fontWeight: "800",
  },

  feedbackTypes: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: "8px",
  },

  feedbackType: {
    border:
      "1px solid #d5dfec",
    background: "#fff",
    color: "#66758a",
    borderRadius: "9px",
    padding: "10px 8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  feedbackTypeActive: {
    border:
      "2px solid #2563eb",
    background: "#eaf1ff",
    color: "#2563eb",
  },
};