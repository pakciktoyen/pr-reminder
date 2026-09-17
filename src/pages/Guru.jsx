import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://pr-reminder-tau.vercel.app";

const CLASS_OPTIONS = [
  "7A",
  "7B",
  "7C",
  "7D",
  "8A",
  "8B",
  "8C",
  "8D",
  "9A",
  "9B",
  "9C",
  "9D",
];

const SUBJECT_OPTIONS = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "IPA",
  "IPS",
  "Pendidikan Agama",
  "PPKn",
  "Seni Budaya",
  "PJOK",
  "Informatika",
];

const EMPTY_FORM = {
  subject: "Matematika",
  title: "",
  description: "",
  deadline: "",
  classId: "7D",
};

export default function Guru({
  user,
  onLogout,
  loginOnly = false,
  onLogin,
  onBack,
}) {
  if (loginOnly) {
    return <GuruLogin onLogin={onLogin} onBack={onBack} />;
  }

  return <GuruDashboard user={user} onLogout={onLogout} />;
}

/* =========================================================
   LOGIN GURU
========================================================= */

function GuruLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!username.trim()) {
      setErrorMessage("Username harus diisi.");
      return;
    }

    if (!password) {
      setErrorMessage("Password harus diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          role: "guru",
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        setErrorMessage(
          data.message || "Username atau password Guru salah."
        );
        return;
      }

      if (!data.token || !data.user) {
        setErrorMessage("Data login dari server tidak lengkap.");
        return;
      }

      localStorage.setItem("prReminderToken", data.token);
      localStorage.setItem(
        "prReminderUser",
        JSON.stringify(data.user)
      );

      onLogin(data.user);
    } catch (error) {
      console.error("GURU LOGIN:", error);
      setErrorMessage(
        "Server PR Reminder tidak dapat dihubungi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={loginStyles.page}>
      <div style={loginStyles.blobOne} />
      <div style={loginStyles.blobTwo} />

      <div style={loginStyles.card}>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          style={loginStyles.back}
        >
          Kembali
        </button>

        <div style={loginStyles.icon}>G</div>

        <div style={loginStyles.brand}>PR REMINDER</div>

        <h1 style={loginStyles.title}>Login Guru</h1>

        <p style={loginStyles.subtitle}>
          Masuk ke akun Guru Anda.
        </p>

        <form onSubmit={submit} style={loginStyles.form}>
          <label style={loginStyles.label}>Username</label>

          <input
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setErrorMessage("");
            }}
            placeholder="Masukkan username"
            autoComplete="username"
            disabled={loading}
            style={loginStyles.input}
          />

          <label
            style={{
              ...loginStyles.label,
              marginTop: 6,
            }}
          >
            Password
          </label>

          <div style={loginStyles.passwordWrap}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              placeholder="Masukkan password"
              autoComplete="current-password"
              disabled={loading}
              style={{
                ...loginStyles.input,
                paddingRight: 78,
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              disabled={loading}
              style={loginStyles.showPassword}
            >
              {showPassword ? "Sembunyikan" : "Lihat"}
            </button>
          </div>

          {errorMessage ? (
            <div style={loginStyles.error}>
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={loginStyles.submit}
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </form>

        <div style={loginStyles.watermark}>
          Made by Rayva
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD GURU
========================================================= */

function GuruDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("home");
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const token = localStorage.getItem("prReminderToken");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      await Promise.all([
        loadTasks(),
        loadClasses(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil tugas."
        );
      }

      setTasks(
        Array.isArray(data.tasks)
          ? data.tasks
          : []
      );
    } catch (error) {
      console.error("GURU TASKS:", error);
      setTasks([]);
    }
  }

  async function loadClasses() {
    try {
      const response = await fetch(
        `${API_URL}/api/classes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil kelas."
        );
      }

      if (Array.isArray(data.classes)) {
        setClasses(data.classes);
      } else {
        setClasses(
          CLASS_OPTIONS.map((id) => ({
            id,
            name: id,
          }))
        );
      }
    } catch (error) {
      console.error("GURU CLASSES:", error);

      setClasses(
        CLASS_OPTIONS.map((id) => ({
          id,
          name: id,
        }))
      );
    }
  }

  async function deleteTask(taskId) {
    if (!token || deletingTaskId !== null) {
      return;
    }

    setDeleteError("");
    setDeletingTaskId(taskId);

    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          data.message || "Gagal menghapus tugas."
        );
      }

      setTasks((current) =>
        current.filter(
          (item) => Number(item.id) !== Number(taskId)
        )
      );

      if (
        selectedTask &&
        Number(selectedTask.id) === Number(taskId)
      ) {
        setSelectedTask(null);
      }

      setDeleteTarget(null);
      setDeleteError("");
    } catch (error) {
      console.error("DELETE TASK:", error);
      setDeleteError(
        error.message || "Gagal menghapus tugas."
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function createTask(event) {
    event.preventDefault();

    if (!form.subject) {
      return;
    }

    if (!form.title.trim()) {
      return;
    }

    if (!form.description.trim()) {
      return;
    }

    if (!form.deadline) {
      return;
    }

    if (!form.classId) {
      return;
    }

    if (!token) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: form.subject,
            title: form.title.trim(),
            description: form.description.trim(),
            deadline: form.deadline,
            classId: form.classId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal membagikan tugas."
        );
      }

      setForm(EMPTY_FORM);
      setShowCreate(false);

      await loadTasks();

      setActivePage("tasks");
    } catch (error) {
      console.error("CREATE TASK:", error);
    } finally {
      setSaving(false);
    }
  }

  const statistics = useMemo(() => {
    const total = tasks.length;

    const completed = tasks.reduce(
      (sum, task) =>
        sum + Number(task.completedStudents || 0),
      0
    );

    const totalStudents = tasks.reduce(
      (sum, task) =>
        sum + Number(task.totalStudents || 0),
      0
    );

    return {
      total,
      completed,
      totalStudents,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div style={dashboardStyles.loadingPage}>
        <div style={dashboardStyles.loadingIcon}>
          G
        </div>

        <h2 style={dashboardStyles.loadingTitle}>
          PR Reminder
        </h2>

        <p style={dashboardStyles.loadingText}>
          Memuat Dashboard Guru...
        </p>

        <small style={dashboardStyles.loadingWatermark}>
          Made by Rayva
        </small>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.page}>
      {/* HEADER */}

      <header style={dashboardStyles.header}>
        <div style={dashboardStyles.headerLeft}>
          <button
            type="button"
            onClick={() => setActivePage("home")}
            style={dashboardStyles.backButton}
          >
            &lt;
          </button>

          <div style={dashboardStyles.headerText}>
            <div style={dashboardStyles.logo}>
              PR Reminder
            </div>

            <div style={dashboardStyles.headerSub}>
              Dashboard Guru
            </div>
          </div>
        </div>

        <div style={dashboardStyles.headerRight}>
          <button
            type="button"
            onClick={() => setActivePage("profile")}
            style={dashboardStyles.headerUser}
          >
            G
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main style={dashboardStyles.main}>
        {/* ================= HOME ================= */}

        {activePage === "home" ? (
          <>
            <section style={dashboardStyles.welcome}>
              <div style={dashboardStyles.welcomeContent}>
                <small style={dashboardStyles.eyebrow}>
                  RUANG GURU
                </small>

                <h1 style={dashboardStyles.welcomeTitle}>
                  Halo,{" "}
                  {user?.fullName ||
                    user?.username ||
                    "Guru"}
                </h1>

                <p style={dashboardStyles.welcomeText}>
                  Kelola tugas siswa dengan lebih mudah.
                </p>
              </div>

              <div style={dashboardStyles.avatar}>
                G
              </div>
            </section>

            <div style={dashboardStyles.stats}>
              <TeacherStat
                icon="T"
                label="Total Tugas"
                value={statistics.total}
              />

              <TeacherStat
                icon="S"
                label="Siswa Selesai"
                value={statistics.completed}
              />

              <TeacherStat
                icon="D"
                label="Data Siswa"
                value={statistics.totalStudents}
              />
            </div>

            <SectionHeader
              title="Tugas Terbaru"
              action={
                tasks.length
                  ? "Lihat Semua"
                  : null
              }
              onAction={() =>
                setActivePage("tasks")
              }
            />

            {tasks.length === 0 ? (
              <EmptyTeacher />
            ) : (
              <div style={dashboardStyles.taskList}>
                {tasks
                  .slice(0, 3)
                  .map((task) => (
                    <TeacherTaskCard
                      key={task.id}
                      task={task}
                      onClick={() =>
                        setSelectedTask(task)
                      }
                      onDelete={() => {
                        setDeleteError("");
                        setDeleteTarget(task);
                      }}
                      deleting={
                        Number(deletingTaskId) ===
                        Number(task.id)
                      }
                    />
                  ))}
              </div>
            )}
          </>
        ) : null}

        {/* ================= TASKS ================= */}

        {activePage === "tasks" ? (
          <>
            <div style={dashboardStyles.pageHeading}>
              <div style={dashboardStyles.pageHeadingText}>
                <h1 style={dashboardStyles.pageTitle}>
                  Tugas Saya
                </h1>

                <p style={dashboardStyles.pageSubtitle}>
                  Semua tugas yang telah dibagikan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreate(true)
                }
                style={dashboardStyles.createButton}
              >
                + Buat Tugas
              </button>
            </div>

            {tasks.length === 0 ? (
              <EmptyTeacher />
            ) : (
              <div style={dashboardStyles.taskList}>
                {tasks.map((task) => (
                  <TeacherTaskCard
                    key={task.id}
                    task={task}
                    onClick={() =>
                      setSelectedTask(task)
                    }
                    onDelete={() => {
                      setDeleteError("");
                      setDeleteTarget(task);
                    }}
                    deleting={
                      Number(deletingTaskId) ===
                      Number(task.id)
                    }
                  />
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* ================= CLASSES ================= */}

        {activePage === "classes" ? (
          <>
            <div style={dashboardStyles.pageHeading}>
              <div style={dashboardStyles.pageHeadingText}>
                <h1 style={dashboardStyles.pageTitle}>
                  Kelas
                </h1>

                <p style={dashboardStyles.pageSubtitle}>
                  Kelas yang menerima tugas.
                </p>
              </div>
            </div>

            <div style={dashboardStyles.classGrid}>
              {CLASS_OPTIONS.map((classId) => {
                const count = tasks.filter(
                  (task) =>
                    (task.classId ||
                      task.class_id) === classId
                ).length;

                return (
                  <div
                    key={classId}
                    style={dashboardStyles.classCard}
                  >
                    <div
                      style={dashboardStyles.classIcon}
                    >
                      #
                    </div>

                    <strong
                      style={dashboardStyles.className}
                    >
                      {classId}
                    </strong>

                    <small
                      style={dashboardStyles.classCount}
                    >
                      {count} tugas
                    </small>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {/* ================= PROFILE ================= */}

        {activePage === "profile" ? (
          <TeacherProfile
            user={user}
            taskCount={statistics.total}
            onFeedback={() =>
              setShowFeedback(true)
            }
            onLogout={onLogout}
          />
        ) : null}
      </main>

      {/* BOTTOM NAVIGATION */}

      <nav style={dashboardStyles.navigation}>
        <TeacherNav
          icon="H"
          label="Beranda"
          active={activePage === "home"}
          onClick={() =>
            setActivePage("home")
          }
        />

        <TeacherNav
          icon="T"
          label="Tugas"
          active={activePage === "tasks"}
          onClick={() =>
            setActivePage("tasks")
          }
        />

        <TeacherNav
          icon="#"
          label="Kelas"
          active={activePage === "classes"}
          onClick={() =>
            setActivePage("classes")
          }
        />

        <TeacherNav
          icon="G"
          label="Profil"
          active={activePage === "profile"}
          onClick={() =>
            setActivePage("profile")
          }
        />
      </nav>

      <div style={dashboardStyles.watermark}>
        Made by Rayva
      </div>

      {/* CREATE TASK */}

      {showCreate ? (
        <CreateTaskModal
          form={form}
          setForm={setForm}
          classes={classes}
          saving={saving}
          onClose={() =>
            setShowCreate(false)
          }
          onSubmit={createTask}
        />
      ) : null}

      {/* TASK DETAIL */}

      {selectedTask ? (
        <TaskDetailModal
          task={selectedTask}
          onClose={() =>
            setSelectedTask(null)
          }
        />
      ) : null}

      {/* DELETE TASK */}

      {deleteTarget ? (
        <DeleteTaskModal
          task={deleteTarget}
          deleting={deletingTaskId !== null}
          error={deleteError}
          onClose={() => {
            if (deletingTaskId === null) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
          onConfirm={() =>
            deleteTask(
              deleteTarget.id,
              deleteTarget.title
            )
          }
        />
      ) : null}

      {/* FEEDBACK */}

      {showFeedback ? (
        <FeedbackModal
          user={user}
          token={token}
          onClose={() =>
            setShowFeedback(false)
          }
        />
      ) : null}
    </div>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function TeacherProfile({
  user,
  taskCount,
  onFeedback,
  onLogout,
}) {
  return (
    <section style={dashboardStyles.profileCard}>
      <div style={dashboardStyles.profileAvatar}>
        G
      </div>

      <h1 style={dashboardStyles.profileTitle}>
        {user?.fullName ||
          user?.username ||
          "Guru"}
      </h1>

      <p style={dashboardStyles.profileRole}>
        Guru
      </p>

      <InfoRow
        label="Username"
        value={user?.username || "-"}
      />

      <InfoRow
        label="Role"
        value="Guru"
      />

      <InfoRow
        label="Total Tugas"
        value={taskCount}
      />

      <InfoRow
        label="Status"
        value="Aktif"
        green
      />

      <button
        type="button"
        onClick={onFeedback}
        style={dashboardStyles.feedbackButton}
      >
        <span style={dashboardStyles.feedbackIcon}>
          ?
        </span>

        <span style={dashboardStyles.feedbackText}>
          <strong
            style={dashboardStyles.feedbackStrong}
          >
            Masukan / Saran
          </strong>

          <small
            style={dashboardStyles.feedbackSmall}
          >
            Bantu kami terus mengembangkan PR
            Reminder
          </small>
        </span>

        <span style={dashboardStyles.feedbackArrow}>
          &gt;
        </span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        style={dashboardStyles.logout}
      >
        Keluar
      </button>
    </section>
  );
}

/* =========================================================
   FEEDBACK
========================================================= */

function FeedbackModal({
  user,
  token,
  onClose,
}) {
  const [type, setType] = useState("saran");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notification, setNotification] =
    useState(null);

  async function submitFeedback(event) {
    event.preventDefault();

    const cleanMessage = message.trim();

    setNotification(null);

    if (!cleanMessage) {
      setNotification({
        type: "error",
        text: "Masukan belum diisi.",
      });
      return;
    }

    if (cleanMessage.length < 3) {
      setNotification({
        type: "error",
        text: "Masukan minimal 3 karakter.",
      });
      return;
    }

    if (!token) {
      setNotification({
        type: "error",
        text:
          "Sesi Guru tidak ditemukan. Silakan login kembali.",
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        `${API_URL}/api/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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

      setNotification({
        type: "success",
        text: "Masukan berhasil dikirim.",
      });
    } catch (error) {
      console.error(
        "GURU FEEDBACK:",
        error
      );

      setNotification({
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
    <div style={dashboardStyles.overlay}>
      <div
        style={dashboardStyles.feedbackModal}
      >
        <div style={dashboardStyles.modalHeader}>
          <div
            style={dashboardStyles.modalHeaderText}
          >
            <small
              style={dashboardStyles.eyebrow}
            >
              PR REMINDER
            </small>

            <h2
              style={dashboardStyles.modalTitle}
            >
              Masukan / Saran
            </h2>

            <p
              style={dashboardStyles.modalSubtitle}
            >
              Bantu kami terus mengembangkan
              aplikasi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            style={dashboardStyles.close}
          >
            X
          </button>
        </div>

        <form
          onSubmit={submitFeedback}
          style={dashboardStyles.form}
        >
          <label
            style={dashboardStyles.formLabel}
          >
            Jenis Masukan
          </label>

          <div
            style={dashboardStyles.feedbackTypes}
          >
            {[
              ["saran", "Saran"],
              ["bug", "Bug"],
              ["fitur", "Fitur Baru"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={sending}
                onClick={() => {
                  setType(value);
                  setNotification(null);
                }}
                style={{
                  ...dashboardStyles.feedbackType,
                  ...(type === value
                    ? dashboardStyles.feedbackTypeActive
                    : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label
            style={dashboardStyles.formLabel}
          >
            Masukan Anda
          </label>

          <textarea
            rows="5"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setNotification(null);
            }}
            placeholder="Tulis saran, kritik, atau laporan bug..."
            disabled={sending}
            style={dashboardStyles.textarea}
          />

          <div
            style={dashboardStyles.modalActions}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={dashboardStyles.cancel}
            >
              Batal
            </button>

            <div
              style={dashboardStyles.submitArea}
            >
              {notification ? (
                <div
                  style={{
                    ...dashboardStyles.feedbackNotice,
                    color:
                      notification.type ===
                      "error"
                        ? "#dc5059"
                        : "#178d5c",
                  }}
                >
                  {notification.text}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  sending || !message.trim()
                }
                style={dashboardStyles.primary}
              >
                {sending
                  ? "Mengirim..."
                  : "Kirim Masukan"}
              </button>
            </div>
          </div>
        </form>

        <div
          style={
            dashboardStyles.feedbackFooter
          }
        >
          Masukan akan diterima oleh Admin PR
          Reminder.
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CREATE TASK
========================================================= */

function CreateTaskModal({
  form,
  setForm,
  classes,
  saving,
  onClose,
  onSubmit,
}) {
  const availableClasses = classes.length
    ? classes
    : CLASS_OPTIONS.map((id) => ({
        id,
        name: id,
      }));

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div style={dashboardStyles.overlay}>
      <div style={dashboardStyles.modal}>
        <div style={dashboardStyles.modalHeader}>
          <div>
            <small
              style={dashboardStyles.eyebrow}
            >
              GURU
            </small>

            <h2
              style={dashboardStyles.modalTitle}
            >
              Buat Tugas
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={dashboardStyles.close}
          >
            X
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          style={dashboardStyles.form}
        >
          <label
            style={dashboardStyles.formLabel}
          >
            Mata Pelajaran

            <select
              value={form.subject}
              onChange={(event) =>
                update(
                  "subject",
                  event.target.value
                )
              }
              disabled={saving}
              style={dashboardStyles.input}
            >
              {SUBJECT_OPTIONS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label
            style={dashboardStyles.formLabel}
          >
            Nama Tugas

            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                update(
                  "title",
                  event.target.value
                )
              }
              placeholder="Masukkan nama tugas"
              disabled={saving}
              style={dashboardStyles.input}
            />
          </label>

          <label
            style={dashboardStyles.formLabel}
          >
            Deskripsi

            <textarea
              rows="4"
              value={form.description}
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="Masukkan deskripsi tugas"
              disabled={saving}
              style={dashboardStyles.textarea}
            />
          </label>

          <label
            style={dashboardStyles.formLabel}
          >
            Deadline

            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(event) =>
                update(
                  "deadline",
                  event.target.value
                )
              }
              disabled={saving}
              style={dashboardStyles.input}
            />
          </label>

          <label
            style={dashboardStyles.formLabel}
          >
            Kelas Tujuan

            <select
              value={form.classId}
              onChange={(event) =>
                update(
                  "classId",
                  event.target.value
                )
              }
              disabled={saving}
              style={dashboardStyles.input}
            >
              {availableClasses.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name || item.id}
                </option>
              ))}
            </select>
          </label>

          <div
            style={dashboardStyles.formNote}
          >
            Tugas akan dikirim hanya kepada siswa
            pada kelas yang dipilih.
          </div>

          <div
            style={dashboardStyles.modalActions}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={dashboardStyles.cancel}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              style={dashboardStyles.primary}
            >
              {saving
                ? "Menyimpan..."
                : "Bagikan Tugas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   TASK DETAIL
========================================================= */

function TaskDetailModal({
  task,
  onClose,
}) {
  return (
    <div style={dashboardStyles.overlay}>
      <div style={dashboardStyles.modal}>
        <div style={dashboardStyles.modalHeader}>
          <div>
            <small
              style={dashboardStyles.eyebrow}
            >
              DETAIL TUGAS
            </small>

            <h2
              style={dashboardStyles.modalTitle}
            >
              {task.subject}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={dashboardStyles.close}
          >
            X
          </button>
        </div>

        <div
          style={dashboardStyles.detailIcon}
        >
          T
        </div>

        <h3
          style={dashboardStyles.detailTitle}
        >
          {task.title}
        </h3>

        <p
          style={
            dashboardStyles.detailDescription
          }
        >
          {task.description}
        </p>

        <InfoRow
          label="Kelas"
          value={
            task.className ||
            task.classId ||
            "-"
          }
        />

        <InfoRow
          label="Deadline"
          value={formatDateTime(
            task.deadline
          )}
        />

        <InfoRow
          label="Jumlah Siswa"
          value={task.totalStudents || 0}
        />

        <InfoRow
          label="Selesai"
          value={
            task.completedStudents || 0
          }
          green
        />

        <InfoRow
          label="Belum Selesai"
          value={
            task.incompleteStudents || 0
          }
        />

        <button
          type="button"
          onClick={onClose}
          style={dashboardStyles.primaryWide}
        >
          Kembali
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   STAT
========================================================= */

function TeacherStat({
  icon,
  label,
  value,
}) {
  return (
    <div style={dashboardStyles.statCard}>
      <div style={dashboardStyles.statIcon}>
        {icon}
      </div>

      <small style={dashboardStyles.statLabel}>
        {label}
      </small>

      <strong style={dashboardStyles.statValue}>
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  action,
  onAction,
}) {
  return (
    <div
      style={dashboardStyles.sectionHeader}
    >
      <h2
        style={dashboardStyles.sectionTitle}
      >
        {title}
      </h2>

      {action ? (
        <button
          type="button"
          onClick={onAction}
          style={dashboardStyles.linkButton}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

/* =========================================================
   DELETE TASK MODAL
========================================================= */

function DeleteTaskModal({
  task,
  deleting,
  error,
  onClose,
  onConfirm,
}) {
  return (
    <div
      style={dashboardStyles.deleteOverlay}
      onClick={() => {
        if (!deleting) {
          onClose();
        }
      }}
    >
      <div
        style={dashboardStyles.deleteModal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={dashboardStyles.deleteIcon}>
          !
        </div>

        <small style={dashboardStyles.deleteEyebrow}>
          PR REMINDER
        </small>

        <h2 style={dashboardStyles.deleteTitle}>
          Hapus Tugas?
        </h2>

        <p style={dashboardStyles.deleteText}>
          Tugas {""}
          <strong style={dashboardStyles.deleteTaskName}>
            {task?.title || "ini"}
          </strong>
          {" "}akan dihapus secara permanen.
        </p>

        {error ? (
          <div style={dashboardStyles.deleteError}>
            {error}
          </div>
        ) : null}

        <div style={dashboardStyles.deleteActions}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={dashboardStyles.deleteCancel}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={dashboardStyles.deleteConfirm}
          >
            {deleting ? "Menghapus..." : "Hapus Tugas"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TASK CARD
========================================================= */

function TeacherTaskCard({
  task,
  onClick,
  onDelete,
  deleting = false,
}) {
  return (
    <div style={dashboardStyles.taskCard}>
      <button
        type="button"
        onClick={onClick}
        style={dashboardStyles.taskCardMain}
      >
      <div style={dashboardStyles.taskIcon}>
        T
      </div>

      <div style={dashboardStyles.taskBody}>
        <div
          style={dashboardStyles.taskTop}
        >
          <span
            style={dashboardStyles.subject}
          >
            {task.subject}
          </span>

          <span
            style={dashboardStyles.taskClass}
          >
            {task.className ||
              task.classId ||
              "-"}
          </span>
        </div>

        <h3
          style={dashboardStyles.taskTitle}
        >
          {task.title}
        </h3>

        <p
          style={
            dashboardStyles.taskDescription
          }
        >
          {task.description}
        </p>

        <div
          style={dashboardStyles.taskMeta}
        >
          <span>
            Deadline:{" "}
            {formatDateTime(
              task.deadline
            )}
          </span>

          <span>
            Selesai:{" "}
            {task.completedStudents || 0}/
            {task.totalStudents || 0}
          </span>
        </div>
      </div>

        <span
          style={dashboardStyles.taskArrow}
        >
          &gt;
        </span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!deleting) {
            onDelete();
          }
        }}
        disabled={deleting}
        aria-label="Hapus tugas"
        style={{
          ...dashboardStyles.taskDeleteButton,
          ...(deleting
            ? dashboardStyles.taskDeleteButtonDisabled
            : null),
        }}
      >
        {deleting ? "…" : "×"}
      </button>
    </div>
  );
}

/* =========================================================
   BOTTOM NAV
========================================================= */

function TeacherNav({
  icon,
  label,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...dashboardStyles.nav,
        ...(active
          ? dashboardStyles.navActive
          : {}),
      }}
    >
      <span
        style={dashboardStyles.navIcon}
      >
        {icon}
      </span>

      <small
        style={dashboardStyles.navLabel}
      >
        {label}
      </small>
    </button>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
  green = false,
}) {
  return (
    <div style={dashboardStyles.infoRow}>
      <span
        style={dashboardStyles.infoLabel}
      >
        {label}
      </span>

      <strong
        style={{
          ...dashboardStyles.infoValue,
          color: green
            ? "#178d5c"
            : "#234d77",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyTeacher() {
  return (
    <div style={dashboardStyles.empty}>
      <div
        style={dashboardStyles.emptyIcon}
      >
        T
      </div>

      <h3
        style={dashboardStyles.emptyTitle}
      >
        Belum ada tugas
      </h3>

      <p
        style={dashboardStyles.emptyText}
      >
        Buat tugas pertama untuk siswa Anda.
      </p>
    </div>
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* =========================================================
   LOGIN STYLES
========================================================= */

const loginStyles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(145deg,#eef5ff,#fff,#f1f7ff)",
    fontFamily:
      "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },

  blobOne: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: "50%",
    top: -170,
    left: -140,
    background: "rgba(84,161,233,.10)",
  },

  blobTwo: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "50%",
    right: -180,
    bottom: -180,
    background: "rgba(84,161,233,.08)",
  },

  card: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: 430,
    boxSizing: "border-box",
    padding: 24,
    border: "1px solid #dceaf6",
    borderRadius: 24,
    background: "#fff",
    boxShadow:
      "0 25px 70px rgba(44,105,158,.13)",
  },

  back: {
    border: "1px solid #d5e4ef",
    borderRadius: 9,
    padding: "9px 12px",
    background: "#fff",
    color: "#2b75af",
    fontSize: 12,
    fontWeight: 800,
  },

  icon: {
    width: 58,
    height: 58,
    margin: "18px auto 12px",
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background:
      "linear-gradient(135deg,#e8f4ff,#dceeff)",
    color: "#3e72df",
    fontSize: 28,
    fontWeight: 900,
  },

  brand: {
    textAlign: "center",
    color: "#2c83cf",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  title: {
    margin: "6px 0 6px",
    textAlign: "center",
    color: "#1d2f50",
    fontSize: 27,
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "0 0 23px",
    textAlign: "center",
    color: "#7c8da3",
    fontSize: 12,
    lineHeight: 1.5,
  },

  form: {
    display: "grid",
    gap: 10,
  },

  label: {
    color: "#334b68",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.4,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #d2e2ef",
    borderRadius: 11,
    outline: "none",
    background: "#fbfdff",
    color: "#1d3857",
    fontSize: 13,
    lineHeight: 1.4,
  },

  passwordWrap: {
    position: "relative",
    width: "100%",
  },

  showPassword: {
    position: "absolute",
    right: 9,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    color: "#2c7fc2",
    fontSize: 10,
    fontWeight: 800,
  },

  error: {
    marginTop: 2,
    padding: "9px 11px",
    border: "1px solid #f2cccc",
    borderRadius: 9,
    background: "#fff5f5",
    color: "#c44747",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.45,
  },

  submit: {
    width: "100%",
    minHeight: 46,
    marginTop: 4,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#3b6fe5,#4275e7)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 900,
  },

  watermark: {
    marginTop: 20,
    textAlign: "center",
    color: "#a0afbd",
    fontSize: 10,
  },
};

/* =========================================================
   DASHBOARD STYLES
   MOBILE FIRST
========================================================= */

const dashboardStyles = {
  page: {
    minHeight: "100vh",
    paddingBottom:
      "calc(94px + env(safe-area-inset-bottom))",
    background:
      "linear-gradient(180deg,#f2f8ff,#fff)",
    color: "#173d68",
    fontFamily:
      "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    boxSizing: "border-box",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    minHeight: 64,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg,#147df1,#2788ee)",
    boxShadow:
      "0 8px 20px rgba(29,116,210,.17)",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  headerText: {
    minWidth: 0,
  },

  logo: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },

  headerSub: {
    marginTop: 3,
    color: "rgba(255,255,255,.84)",
    fontSize: 9,
    lineHeight: 1.3,
  },

  backButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    border: "none",
    borderRadius: 10,
    background: "rgba(255,255,255,.15)",
    color: "#fff",
    fontSize: 20,
    lineHeight: 1,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },

  headerUser: {
    width: 38,
    height: 38,
    border: "none",
    borderRadius: 10,
    background: "rgba(255,255,255,.15)",
    color: "#fff",
    fontSize: 18,
  },

  main: {
    width: "100%",
    maxWidth: 760,
    margin: "0 auto",
    padding: 16,
    boxSizing: "border-box",
  },

  /* HOME */

  welcome: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: 18,
    boxSizing: "border-box",
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#fff,#edf7ff)",
    border: "1px solid #dcecf8",
  },

  welcomeContent: {
    minWidth: 0,
    flex: 1,
  },

  eyebrow: {
    color: "#2c88d8",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
    lineHeight: 1.4,
  },

  welcomeTitle: {
    margin: "7px 0 7px",
    color: "#183f69",
    fontSize: 21,
    fontWeight: 800,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },

  welcomeText: {
    margin: 0,
    color: "#8193a5",
    fontSize: 11,
    lineHeight: 1.55,
  },

  avatar: {
    width: 58,
    height: 58,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#dceeff",
    color: "#234d77",
    fontSize: 28,
    fontWeight: 800,
  },

  /* STAT */

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 9,
    marginTop: 13,
  },

  statCard: {
    minWidth: 0,
    minHeight: 112,
    padding: 13,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    borderRadius: 15,
    background: "#fff",
    border: "1px solid #e0ebf5",
  },

  statIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#edf6ff",
    color: "#234d77",
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 9,
  },

  statLabel: {
    display: "block",
    margin: 0,
    color: "#8193a5",
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },

  statValue: {
    display: "block",
    marginTop: 5,
    color: "#173d68",
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.1,
  },

  /* SECTION */

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    margin: "25px 0 12px",
  },

  sectionTitle: {
    margin: 0,
    color: "#173d68",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.3,
  },

  linkButton: {
    flexShrink: 0,
    border: "none",
    background: "transparent",
    color: "#237fd0",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1.3,
  },

  /* PAGE HEADING */

  pageHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  pageHeadingText: {
    minWidth: 0,
    flex: 1,
  },

  pageTitle: {
    margin: 0,
    color: "#173d68",
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },

  pageSubtitle: {
    margin: "7px 0 0",
    color: "#8295a7",
    fontSize: 11,
    lineHeight: 1.5,
  },

  createButton: {
    flexShrink: 0,
    border: "none",
    borderRadius: 10,
    padding: "11px 13px",
    background:
      "linear-gradient(135deg,#2185ee,#2275d5)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1.2,
  },

  /* TASK */

  taskList: {
    display: "grid",
    gap: 11,
  },

  taskCardMain: {
    minWidth: 0,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr) 12px",
    gap: 12,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    textAlign: "left",
  },

  taskCard: {
    width: "100%",
    minWidth: 0,
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) 36px",
    gap: 12,
    padding: 14,
    boxSizing: "border-box",
    textAlign: "left",
    border: "1px solid #deebf5",
    borderRadius: 15,
    background: "#fff",
    color: "#173d68",
    WebkitTapHighlightColor:
      "transparent",
  },

  taskDeleteButton: {
    width: 32,
    height: 32,
    alignSelf: "center",
    justifySelf: "center",
    display: "grid",
    placeItems: "center",
    border: "1px solid #ffd6da",
    borderRadius: 10,
    background: "#fff5f6",
    color: "#dc5059",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
  },

  taskDeleteButtonDisabled: {
    opacity: 0.55,
  },

  deleteOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    boxSizing: "border-box",
    background: "rgba(15,43,68,.58)",
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
  },

  deleteModal: {
    width: "100%",
    maxWidth: 390,
    padding: "25px 20px 19px",
    boxSizing: "border-box",
    border: "1px solid #dceaf5",
    borderRadius: 24,
    background: "linear-gradient(180deg,#ffffff,#f8fbff)",
    boxShadow: "0 24px 70px rgba(23,61,104,.24)",
    textAlign: "center",
  },

  deleteIcon: {
    width: 58,
    height: 58,
    margin: "0 auto 13px",
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#fff0f2",
    border: "1px solid #ffd7dc",
    color: "#d94e59",
    fontSize: 25,
    fontWeight: 900,
  },

  deleteEyebrow: {
    color: "#3d70df",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
    lineHeight: 1.4,
  },

  deleteTitle: {
    margin: "6px 0 7px",
    color: "#173d68",
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.3,
  },

  deleteText: {
    margin: 0,
    color: "#71869a",
    fontSize: 11,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },

  deleteTaskName: {
    color: "#315f96",
    fontWeight: 900,
  },

  deleteError: {
    marginTop: 13,
    padding: "9px 10px",
    borderRadius: 10,
    background: "#fff1f2",
    color: "#c74750",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1.45,
  },

  deleteActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1.35fr",
    gap: 8,
    marginTop: 20,
  },

  deleteCancel: {
    minHeight: 44,
    border: "1px solid #d8e5ef",
    borderRadius: 11,
    background: "#fff",
    color: "#637a8f",
    fontSize: 11,
    fontWeight: 800,
  },

  deleteConfirm: {
    minHeight: 44,
    border: "none",
    borderRadius: 11,
    background: "linear-gradient(135deg,#df5b64,#d94752)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    boxShadow: "0 8px 18px rgba(217,71,82,.18)",
  },

  taskIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#edf6ff",
    color: "#234d77",
    fontSize: 18,
    fontWeight: 900,
  },

  taskBody: {
    minWidth: 0,
    width: "100%",
  },

  taskTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    minWidth: 0,
  },

  subject: {
    display: "inline-block",
    maxWidth: "70%",
    padding: "4px 7px",
    boxSizing: "border-box",
    borderRadius: 6,
    background: "#eaf5ff",
    color: "#267fc9",
    fontSize: 9,
    fontWeight: 900,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },

  taskClass: {
    flexShrink: 0,
    color: "#8798a8",
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.4,
  },

  taskTitle: {
    margin: "8px 0 6px",
    color: "#173d68",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },

  taskDescription: {
    margin: "0 0 9px",
    color: "#74899d",
    fontSize: 11,
    lineHeight: 1.55,
    overflowWrap: "anywhere",
  },

  taskMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    color: "#8396a8",
    fontSize: 9,
    lineHeight: 1.45,
  },

  taskArrow: {
    alignSelf: "center",
    color: "#9aa9b7",
    fontSize: 20,
    lineHeight: 1,
  },

  /* =====================================================
     KELAS
     INI YANG DIPERBAIKI: 2 KOLOM MOBILE
  ===================================================== */

  classGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 12,
    width: "100%",
  },

  classCard: {
    minWidth: 0,
    minHeight: 124,
    padding: 17,
    boxSizing: "border-box",
    borderRadius: 16,
    background: "#fff",
    border: "1px solid #dce9f4",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },

  classIcon: {
    width: 47,
    height: 47,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#edf6ff",
    color: "#173d68",
    marginBottom: 12,
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1,
  },

  className: {
    display: "block",
    margin: 0,
    color: "#173d68",
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.25,
  },

  classCount: {
    display: "block",
    marginTop: 5,
    color: "#8193a5",
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.4,
  },

  /* PROFILE */

  profileCard: {
    padding: 21,
    boxSizing: "border-box",
    borderRadius: 20,
    background: "#fff",
    border: "1px solid #dfeaf4",
    textAlign: "center",
  },

  profileAvatar: {
    width: 76,
    height: 76,
    display: "grid",
    placeItems: "center",
    margin: "0 auto 13px",
    borderRadius: 22,
    background: "#dceeff",
    color: "#234d77",
    fontSize: 35,
    fontWeight: 900,
  },

  profileTitle: {
    margin: 0,
    color: "#173d68",
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  },

  profileRole: {
    margin: "5px 0 17px",
    color: "#8295a7",
    fontSize: 11,
    lineHeight: 1.4,
  },

  infoRow: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 13px",
    marginTop: 8,
    boxSizing: "border-box",
    borderRadius: 10,
    background: "#f7fbff",
    textAlign: "left",
    fontSize: 10,
    lineHeight: 1.45,
  },

  infoLabel: {
    flexShrink: 0,
    color: "#8193a5",
    fontSize: 10,
    lineHeight: 1.45,
  },

  infoValue: {
    minWidth: 0,
    maxWidth: "58%",
    textAlign: "right",
    fontSize: 10,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },

  feedbackButton: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 11,
    marginTop: 16,
    padding: 14,
    boxSizing: "border-box",
    border: "1px solid #d8e8f4",
    borderRadius: 12,
    background:
      "linear-gradient(180deg,#fbfdff,#f2f8fd)",
    textAlign: "left",
  },

  feedbackIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#eaf5ff",
    color: "#267fc9",
    fontSize: 17,
    fontWeight: 900,
  },

  feedbackText: {
    minWidth: 0,
    flex: 1,
  },

  feedbackStrong: {
    display: "block",
    color: "#234d77",
    fontSize: 11,
    lineHeight: 1.4,
  },

  feedbackSmall: {
    display: "block",
    marginTop: 4,
    color: "#8193a5",
    fontSize: 9,
    lineHeight: 1.5,
  },

  feedbackArrow: {
    flexShrink: 0,
    color: "#6f899f",
    fontSize: 22,
    lineHeight: 1,
  },

  logout: {
    width: "100%",
    minHeight: 44,
    marginTop: 13,
    border: "none",
    borderRadius: 10,
    background: "#fff0f1",
    color: "#dc5059",
    fontSize: 11,
    fontWeight: 900,
  },

  /* NAV */

  navigation: {
    position: "fixed",
    left: "50%",
    bottom: 0,
    transform: "translateX(-50%)",
    zIndex: 70,
    width: "100%",
    maxWidth: 760,
    minHeight: 67,
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    padding:
      "6px 8px calc(6px + env(safe-area-inset-bottom))",
    boxSizing: "border-box",
    background: "rgba(255,255,255,.98)",
    borderTop: "1px solid #dfeaf3",
  },

  nav: {
    minWidth: 0,
    minHeight: 55,
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "#98a8b7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  navActive: {
    color: "#197ef0",
    background: "#f4f9ff",
  },

  navIcon: {
    fontSize: 17,
    lineHeight: 1,
    fontWeight: 500,
  },

  navLabel: {
    fontSize: 10,
    lineHeight: 1.3,
  },

  watermark: {
    position: "fixed",
    left: "50%",
    bottom:
      "calc(70px + env(safe-area-inset-bottom))",
    transform: "translateX(-50%)",
    color: "#a1b1c0",
    fontSize: 10,
    lineHeight: 1.3,
    zIndex: 71,
    whiteSpace: "nowrap",
  },

  /* MODAL */

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    background: "rgba(15,43,68,.5)",
  },

  modal: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "92vh",
    overflowY: "auto",
    padding:
      "20px 18px calc(22px + env(safe-area-inset-bottom))",
    boxSizing: "border-box",
    borderRadius: "22px 22px 0 0",
    background: "#fff",
  },

  feedbackModal: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92vh",
    overflowY: "auto",
    padding:
      "20px 18px calc(22px + env(safe-area-inset-bottom))",
    boxSizing: "border-box",
    borderRadius: "22px 22px 0 0",
    background: "#fff",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 17,
  },

  modalHeaderText: {
    minWidth: 0,
    flex: 1,
  },

  modalTitle: {
    margin: "6px 0 0",
    color: "#173d68",
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  },

  modalSubtitle: {
    margin: "6px 0 0",
    color: "#8193a5",
    fontSize: 11,
    lineHeight: 1.5,
  },

  close: {
    width: 35,
    height: 35,
    flexShrink: 0,
    border: "none",
    borderRadius: 10,
    background: "#f2f5f8",
    color: "#708499",
    fontSize: 15,
    fontWeight: 900,
  },

  form: {
    display: "grid",
    gap: 11,
  },

  formLabel: {
    display: "block",
    color: "#334b68",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1.45,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 6,
    padding: "11px 12px",
    border: "1px solid #d2e2ef",
    borderRadius: 10,
    background: "#fbfdff",
    color: "#1d3857",
    outline: "none",
    fontSize: 12,
    lineHeight: 1.45,
  },

  textarea: {
    width: "100%",
    minHeight: 110,
    boxSizing: "border-box",
    marginTop: 6,
    padding: "11px 12px",
    border: "1px solid #d2e2ef",
    borderRadius: 10,
    background: "#fbfdff",
    color: "#1d3857",
    outline: "none",
    resize: "vertical",
    fontSize: 12,
    lineHeight: 1.55,
  },

  formNote: {
    padding: 11,
    borderRadius: 9,
    background: "#edf7ff",
    color: "#4a81aa",
    fontSize: 10,
    lineHeight: 1.5,
  },

  modalActions: {
    display: "grid",
    gridTemplateColumns:
      "minmax(90px,0.7fr) minmax(0,1.3fr)",
    alignItems: "end",
    gap: 8,
    marginTop: 5,
  },

  submitArea: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  feedbackNotice: {
    minHeight: 15,
    textAlign: "left",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },

  cancel: {
    width: "100%",
    minHeight: 43,
    border: "1px solid #d8e3eb",
    borderRadius: 10,
    background: "#fff",
    color: "#526a80",
    fontSize: 11,
    fontWeight: 800,
  },

  primary: {
    width: "100%",
    minHeight: 43,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#3e73e2,#4278e7)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
  },

  feedbackTypes: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 7,
  },

  feedbackType: {
    minWidth: 0,
    minHeight: 39,
    border: "1px solid #d9e5ee",
    borderRadius: 9,
    background: "#fff",
    color: "#6f8294",
    fontSize: 10,
    fontWeight: 700,
  },

  feedbackTypeActive: {
    border: "2px solid #3d70df",
    background: "#eef4ff",
    color: "#3564c6",
    fontWeight: 900,
  },

  feedbackFooter: {
    marginTop: 10,
    color: "#9aa9b7",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 1.4,
  },

  /* DETAIL */

  detailIcon: {
    width: 64,
    height: 64,
    margin: "5px auto 13px",
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#edf6ff",
    color: "#234d77",
    fontSize: 29,
    fontWeight: 900,
  },

  detailTitle: {
    margin: 0,
    color: "#173d68",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },

  detailDescription: {
    margin: "8px 0 14px",
    color: "#74899d",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },

  primaryWide: {
    width: "100%",
    minHeight: 44,
    marginTop: 15,
    border: "none",
    borderRadius: 10,
    background: "#197ef0",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
  },

  /* EMPTY */

  empty: {
    padding: 35,
    boxSizing: "border-box",
    textAlign: "center",
    border: "1px dashed #cadce8",
    borderRadius: 15,
    background: "#fbfdff",
  },

  emptyIcon: {
    fontSize: 35,
    fontWeight: 900,
    lineHeight: 1,
  },

  emptyTitle: {
    margin: "12px 0 5px",
    color: "#234d77",
    fontSize: 15,
    lineHeight: 1.35,
  },

  emptyText: {
    margin: 0,
    color: "#8193a5",
    fontSize: 10,
    lineHeight: 1.5,
  },

  /* LOADING */

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    boxSizing: "border-box",
    background: "#f5faff",
    color: "#173e69",
  },

  loadingIcon: {
    width: 64,
    height: 64,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#eaf4ff",
    color: "#2782d1",
    fontSize: 29,
    fontWeight: 900,
  },

  loadingTitle: {
    margin: "14px 0 5px",
    fontSize: 18,
    lineHeight: 1.3,
  },

  loadingText: {
    margin: 0,
    color: "#8193a5",
    fontSize: 11,
    lineHeight: 1.5,
  },

  loadingWatermark: {
    marginTop: 18,
    color: "#a1b1c0",
    fontSize: 10,
  },
};