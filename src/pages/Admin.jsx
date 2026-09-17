import React, { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://pr-reminder-tau.vercel.app";

const TABS = [
  { id: "summary", label: "Ringkasan" },
  { id: "accounts", label: "Akun" },
  { id: "tasks", label: "Tugas" },
  { id: "classes", label: "Kelas" },
  { id: "feedback", label: "Saran" },
];

const EMPTY_STATS = {
  totalUsers: 0,
  totalGuru: 0,
  totalSiswa: 0,
  totalBlocked: 0,
  totalClasses: 0,
  totalTasks: 0,
  overdueTasks: 0,
  totalCompleted: 0,
};

const EMPTY_FEEDBACK_STATS = {
  total: 0,
  unread: 0,
  fromStudents: 0,
  fromTeachers: 0,
};

function getAdminToken() {
  return localStorage.getItem("prReminderAdminToken") || "";
}

function authHeaders() {
  const token = getAdminToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function feedbackTypeLabel(type) {
  if (type === "bug") return "Bug";
  if (type === "fitur") return "Fitur Baru";
  return "Saran";
}

function roleLabel(role) {
  return role === "guru" ? "Guru" : "Siswa";
}

export default function Admin({ onLogout }) {
  const [activeTab, setActiveTab] = useState("summary");

  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("prReminderAdmin") || "null"
      );
    } catch {
      return null;
    }
  });

  const [stats, setStats] = useState(EMPTY_STATS);

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);

  const [feedback, setFeedback] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(
    EMPTY_FEEDBACK_STATS
  );

  const [search, setSearch] = useState("");

  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackRole, setFeedbackRole] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showTeacherModal, setShowTeacherModal] =
    useState(false);

  const [savingTeacher, setSavingTeacher] = useState(false);

  const [teacherForm, setTeacherForm] = useState({
    fullName: "",
    username: "",
    password: "",
  });

  const [readUpdatingId, setReadUpdatingId] = useState(null);

  const [deletingAllTasks, setDeletingAllTasks] =
    useState(false);

  const [showDeleteTasksModal, setShowDeleteTasksModal] =
    useState(false);

  const accountRows = useMemo(() => users, [users]);

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Permintaan gagal diproses."
      );
    }

    return data;
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        statsData,
        usersData,
        tasksData,
        classesData,
      ] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/users"),
        apiFetch("/api/admin/tasks"),
        apiFetch("/api/admin/classes"),
      ]);

      setStats({
        ...EMPTY_STATS,
        ...(statsData.stats || {}),
      });

      setUsers(usersData.users || []);
      setTasks(tasksData.tasks || []);
      setClasses(classesData.classes || []);
    } catch (err) {
      setError(
        err.message || "Gagal memuat dashboard admin."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFeedback(custom = {}) {
    setLoadingFeedback(true);
    setError("");

    const params = new URLSearchParams();

    const currentSearch =
      custom.search !== undefined
        ? custom.search
        : feedbackSearch;

    const currentRole =
      custom.role !== undefined
        ? custom.role
        : feedbackRole;

    const currentStatus =
      custom.status !== undefined
        ? custom.status
        : feedbackStatus;

    if (currentSearch) {
      params.set("search", currentSearch);
    }

    if (currentRole) {
      params.set("role", currentRole);
    }

    if (currentStatus) {
      params.set("status", currentStatus);
    }

    try {
      const query = params.toString();

      const data = await apiFetch(
        `/api/admin/feedback${query ? `?${query}` : ""}`
      );

      setFeedback(data.feedback || []);

      setFeedbackStats({
        ...EMPTY_FEEDBACK_STATS,
        ...(data.stats || {}),
      });
    } catch (err) {
      setError(
        err.message || "Gagal memuat halaman saran."
      );
    } finally {
      setLoadingFeedback(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === "feedback") {
      loadFeedback();
    }
  }, [activeTab]);

  function handleLogout() {
    localStorage.removeItem("prReminderAdminToken");
    localStorage.removeItem("prReminderAdmin");

    if (typeof onLogout === "function") {
      onLogout();
    }
  }

  async function handleSearchAccounts() {
    setError("");
    setMessage("");

    try {
      const query = search.trim();

      const data = await apiFetch(
        `/api/admin/users${
          query
            ? `?search=${encodeURIComponent(query)}`
            : ""
        }`
      );

      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Gagal mencari akun.");
    }
  }

  async function handleBlockToggle(user) {
    const nextStatus =
      user.status === "blocked"
        ? "active"
        : "blocked";

    setError("");
    setMessage("");

    try {
      await apiFetch(
        `/api/admin/users/${user.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      setMessage(
        nextStatus === "blocked"
          ? `Akun ${user.username} berhasil diblokir.`
          : `Akun ${user.username} berhasil dibuka kembali.`
      );

      await handleSearchAccounts();
      await loadDashboard();
    } catch (err) {
      setError(
        err.message || "Gagal mengubah status akun."
      );
    }
  }

  async function handleCreateTeacher(event) {
    event.preventDefault();

    setSavingTeacher(true);
    setError("");
    setMessage("");

    try {
      await apiFetch("/api/admin/users/teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teacherForm),
      });

      setTeacherForm({
        fullName: "",
        username: "",
        password: "",
      });

      setShowTeacherModal(false);

      setMessage("Akun Guru berhasil dibuat.");

      await loadDashboard();
    } catch (err) {
      setError(
        err.message || "Gagal membuat akun Guru."
      );
    } finally {
      setSavingTeacher(false);
    }
  }

  async function handleDeleteAllTasks() {
    if (deletingAllTasks) return;

    setDeletingAllTasks(true);
    setError("");
    setMessage("");

    try {
      const data = await apiFetch("/api/admin/tasks", {
        method: "DELETE",
      });

      setTasks([]);
      setShowDeleteTasksModal(false);

      setMessage(
        data.message ||
          `${Number(data.deletedCount || 0)} tugas berhasil dihapus.`
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.message || "Gagal menghapus semua tugas."
      );
    } finally {
      setDeletingAllTasks(false);
    }
  }

  async function handleFeedbackStatus(item) {
    const nextStatus =
      item.status === "read"
        ? "unread"
        : "read";

    setReadUpdatingId(item.id);
    setError("");
    setMessage("");

    try {
      await apiFetch(
        `/api/admin/feedback/${item.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      await loadFeedback();

      setMessage(
        nextStatus === "read"
          ? "Saran ditandai sudah dibaca."
          : "Saran ditandai belum dibaca."
      );
    } catch (err) {
      setError(
        err.message || "Gagal mengubah status saran."
      );
    } finally {
      setReadUpdatingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>
            PR Reminder
          </div>

          <div style={styles.headerSubtitle}>
            Dashboard Owner / Admin
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.adminIdentity}>
            <span style={styles.identityLabel}>
              Login sebagai
            </span>

            <strong>
              {admin?.username || "Admin"}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Keluar
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <section style={styles.hero}>
          <div>
            <div style={styles.heroEyebrow}>
              CONTROL CENTER
            </div>

            <h1 style={styles.heroTitle}>
              Selamat datang di Admin Dashboard
            </h1>

            <p style={styles.heroText}>
              Pantau akun, guru, siswa, kelas,
              tugas, dan masukan dari satu tempat.
            </p>
          </div>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() =>
              setShowTeacherModal(true)
            }
          >
            + Tambah Guru
          </button>
        </section>

        {(message || error) && (
          <div
            style={
              error
                ? styles.alertError
                : styles.alertSuccess
            }
          >
            {error || message}
          </div>
        )}

        <nav style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setError("");
                setMessage("");
              }}
              style={
                activeTab === tab.id
                  ? styles.tabActive
                  : styles.tab
              }
            >
              {tab.label}

              {tab.id === "feedback" &&
                feedbackStats.unread > 0 && (
                  <span style={styles.tabBadge}>
                    {feedbackStats.unread}
                  </span>
                )}
            </button>
          ))}
        </nav>

        {loading ? (
          <section style={styles.panel}>
            <div style={styles.empty}>
              Memuat dashboard...
            </div>
          </section>
        ) : (
          <>
            {activeTab === "summary" && (
              <SummaryPanel
                stats={stats}
                onAccounts={() =>
                  setActiveTab("accounts")
                }
              />
            )}

            {activeTab === "accounts" && (
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>
                      Kelola Akun
                    </h2>

                    <p style={styles.panelSubtitle}>
                      Kelola akun Guru dan Siswa.
                    </p>
                  </div>

                  <button
                    type="button"
                    style={styles.darkButton}
                    onClick={() =>
                      setShowTeacherModal(true)
                    }
                  >
                    + Tambah Guru
                  </button>
                </div>

                <div style={styles.searchRow}>
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearchAccounts();
                      }
                    }}
                    placeholder="Cari nama, username, kelas..."
                    style={styles.searchInput}
                  />

                  <button
                    type="button"
                    onClick={handleSearchAccounts}
                    style={styles.secondaryButton}
                  >
                    Cari
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      loadDashboard();
                    }}
                    style={styles.ghostButton}
                  >
                    Reset
                  </button>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>
                          Nama
                        </th>

                        <th style={styles.th}>
                          Username
                        </th>

                        <th style={styles.th}>
                          Role
                        </th>

                        <th style={styles.th}>
                          Kelas
                        </th>

                        <th style={styles.th}>
                          Status
                        </th>

                        <th style={styles.th}>
                          Dibuat
                        </th>

                        <th style={styles.th}>
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {accountRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            style={styles.emptyCell}
                          >
                            Belum ada akun.
                          </td>
                        </tr>
                      ) : (
                        accountRows.map((user) => (
                          <tr key={user.id}>
                            <td style={styles.td}>
                              <strong>
                                {user.fullName ||
                                  "-"}
                              </strong>
                            </td>

                            <td style={styles.td}>
                              {user.username}
                            </td>

                            <td style={styles.td}>
                              <span
                                style={
                                  user.role === "guru"
                                    ? styles.badgeBlue
                                    : styles.badgeGray
                                }
                              >
                                {roleLabel(
                                  user.role
                                )}
                              </span>
                            </td>

                            <td style={styles.td}>
                              {user.className ||
                                user.classId ||
                                "-"}
                            </td>

                            <td style={styles.td}>
                              <span
                                style={
                                  user.status ===
                                  "blocked"
                                    ? styles.badgeRed
                                    : styles.badgeGreen
                                }
                              >
                                {user.status ===
                                "blocked"
                                  ? "Diblokir"
                                  : "Aktif"}
                              </span>
                            </td>

                            <td style={styles.td}>
                              {formatDate(
                                user.createdAt
                              )}
                            </td>

                            <td style={styles.td}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBlockToggle(
                                    user
                                  )
                                }
                                style={
                                  user.status ===
                                  "blocked"
                                    ? styles.unblockButton
                                    : styles.blockButton
                                }
                              >
                                {user.status ===
                                "blocked"
                                  ? "Buka"
                                  : "Blokir"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "tasks" && (
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>
                      Semua Tugas
                    </h2>

                    <p style={styles.panelSubtitle}>
                      Daftar tugas yang dibuat Guru.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDeleteTasksModal(true)
                    }
                    disabled={
                      deletingAllTasks ||
                      tasks.length === 0
                    }
                    style={styles.dangerButton}
                  >
                    Hapus Semua Tugas
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div style={styles.empty}>
                    Belum ada tugas.
                  </div>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>
                            Tugas
                          </th>

                          <th style={styles.th}>
                            Mata Pelajaran
                          </th>

                          <th style={styles.th}>
                            Kelas
                          </th>

                          <th style={styles.th}>
                            Guru
                          </th>

                          <th style={styles.th}>
                            Deadline
                          </th>

                          <th style={styles.th}>
                            Progress
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {tasks.map((task) => {
                          const total =
                            Number(
                              task.totalStudents || 0
                            );

                          const completed =
                            Number(
                              task.completedStudents ||
                                0
                            );

                          return (
                            <tr key={task.id}>
                              <td style={styles.td}>
                                <strong>
                                  {task.title}
                                </strong>

                                <div
                                  style={
                                    styles.rowMuted
                                  }
                                >
                                  {task.description}
                                </div>
                              </td>

                              <td style={styles.td}>
                                {task.subject}
                              </td>

                              <td style={styles.td}>
                                {task.className ||
                                  task.classId ||
                                  "-"}
                              </td>

                              <td style={styles.td}>
                                {task.creatorFullName ||
                                  task.creatorUsername ||
                                  "-"}
                              </td>

                              <td style={styles.td}>
                                {formatDate(
                                  task.deadline
                                )}
                              </td>

                              <td style={styles.td}>
                                <span
                                  style={
                                    completed >=
                                      total &&
                                    total > 0
                                      ? styles.badgeGreen
                                      : styles.badgeOrange
                                  }
                                >
                                  {completed}/{total}{" "}
                                  selesai
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === "classes" && (
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>
                      Daftar Kelas
                    </h2>

                    <p style={styles.panelSubtitle}>
                      Statistik Guru dan Siswa setiap
                      kelas.
                    </p>
                  </div>
                </div>

                {classes.length === 0 ? (
                  <div style={styles.empty}>
                    Belum ada kelas.
                  </div>
                ) : (
                  <div style={styles.classGrid}>
                    {classes.map((item) => (
                      <div
                        key={item.id}
                        style={styles.classCard}
                      >
                        <div
                          style={styles.className}
                        >
                          {item.name}
                        </div>

                        <div
                          style={styles.classRow}
                        >
                          <span>Siswa</span>

                          <strong>
                            {item.totalStudents ||
                              0}
                          </strong>
                        </div>

                        <div
                          style={styles.classRow}
                        >
                          <span>Guru</span>

                          <strong>
                            {item.totalTeachers ||
                              0}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "feedback" && (
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>
                      Masukan / Saran
                    </h2>

                    <p style={styles.panelSubtitle}>
                      Masukan dari Siswa dan Guru.
                    </p>
                  </div>
                </div>

                <div style={styles.miniStatGrid}>
                  <MiniStat
                    label="Total Masukan"
                    value={feedbackStats.total}
                  />

                  <MiniStat
                    label="Belum Dibaca"
                    value={feedbackStats.unread}
                  />

                  <MiniStat
                    label="Dari Siswa"
                    value={feedbackStats.fromStudents}
                  />

                  <MiniStat
                    label="Dari Guru"
                    value={feedbackStats.fromTeachers}
                  />
                </div>

                <div style={styles.feedbackFilters}>
                  <input
                    value={feedbackSearch}
                    onChange={(event) =>
                      setFeedbackSearch(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        loadFeedback();
                      }
                    }}
                    placeholder="Cari nama, username, isi masukan..."
                    style={styles.searchInput}
                  />

                  <select
                    value={feedbackRole}
                    onChange={(event) =>
                      setFeedbackRole(
                        event.target.value
                      )
                    }
                    style={styles.select}
                  >
                    <option value="">
                      Semua Pengirim
                    </option>

                    <option value="siswa">
                      Siswa
                    </option>

                    <option value="guru">
                      Guru
                    </option>
                  </select>

                  <select
                    value={feedbackStatus}
                    onChange={(event) =>
                      setFeedbackStatus(
                        event.target.value
                      )
                    }
                    style={styles.select}
                  >
                    <option value="">
                      Semua Status
                    </option>

                    <option value="unread">
                      Belum Dibaca
                    </option>

                    <option value="read">
                      Sudah Dibaca
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() => loadFeedback()}
                    style={styles.secondaryButton}
                  >
                    Cari
                  </button>
                </div>

                {loadingFeedback ? (
                  <div style={styles.empty}>
                    Memuat masukan...
                  </div>
                ) : feedback.length === 0 ? (
                  <div style={styles.empty}>
                    Belum ada masukan.
                  </div>
                ) : (
                  <div style={styles.feedbackList}>
                    {feedback.map((item) => (
                      <article
                        key={item.id}
                        style={
                          item.status === "unread"
                            ? styles.feedbackCardUnread
                            : styles.feedbackCard
                        }
                      >
                        <div
                          style={
                            styles.feedbackTop
                          }
                        >
                          <div>
                            <div
                              style={
                                styles.feedbackNameRow
                              }
                            >
                              <strong>
                                {item.fullName ||
                                  "-"}
                              </strong>

                              <span
                                style={
                                  item.role ===
                                  "guru"
                                    ? styles.badgeBlue
                                    : styles.badgeGray
                                }
                              >
                                {roleLabel(
                                  item.role
                                )}
                              </span>

                              <span
                                style={
                                  item.type ===
                                  "bug"
                                    ? styles.badgeRed
                                    : item.type ===
                                      "fitur"
                                    ? styles.badgeOrange
                                    : styles.badgeGreen
                                }
                              >
                                {feedbackTypeLabel(
                                  item.type
                                )}
                              </span>

                              {item.status ===
                                "unread" && (
                                <span
                                  style={
                                    styles.badgeRed
                                  }
                                >
                                  Baru
                                </span>
                              )}
                            </div>

                            <div
                              style={
                                styles.feedbackMeta
                              }
                            >
                              @{item.username}
                              {" • "}
                              {item.className ||
                                item.classId ||
                                "Tanpa kelas"}
                              {" • "}
                              {formatDate(
                                item.createdAt
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleFeedbackStatus(
                                item
                              )
                            }
                            disabled={
                              readUpdatingId ===
                              item.id
                            }
                            style={
                              styles.readButton
                            }
                          >
                            {readUpdatingId ===
                            item.id
                              ? "Menyimpan..."
                              : item.status ===
                                "read"
                              ? "Tandai belum dibaca"
                              : "Tandai sudah dibaca"}
                          </button>
                        </div>

                        <div
                          style={
                            styles.feedbackMessage
                          }
                        >
                          {item.message}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <footer style={styles.footer}>
          ♥ Made by Rayva
        </footer>
      </main>

      {showDeleteTasksModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div
                  style={{
                    ...styles.modalEyebrow,
                    color: "#dc2626",
                  }}
                >
                  AREA BERBAHAYA
                </div>

                <h2 style={styles.modalTitle}>
                  Hapus Semua Tugas
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDeleteTasksModal(false)
                }
                disabled={deletingAllTasks}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.deleteWarning}>
              <strong>
                {tasks.length} tugas
              </strong>{" "}
              akan dihapus permanen dari seluruh kelas
              <strong> 7A sampai 9D</strong>.
              <br />
              <br />
              Data progres penyelesaian tugas juga akan
              ikut terhapus. Akun Guru, akun Siswa, dan
              daftar kelas tidak ikut terhapus.
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() =>
                  setShowDeleteTasksModal(false)
                }
                disabled={deletingAllTasks}
                style={styles.ghostButton}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteAllTasks}
                disabled={deletingAllTasks}
                style={styles.dangerButton}
              >
                {deletingAllTasks
                  ? "Menghapus..."
                  : "Ya, Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeacherModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>
                  ADMIN
                </div>

                <h2 style={styles.modalTitle}>
                  Tambah Akun Guru
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTeacherModal(false)
                }
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTeacher}>
              <label style={styles.label}>
                Nama Lengkap

                <input
                  value={teacherForm.fullName}
                  onChange={(event) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      fullName:
                        event.target.value,
                    }))
                  }
                  style={styles.field}
                  placeholder="Nama lengkap Guru"
                  required
                />
              </label>

              <label style={styles.label}>
                Username

                <input
                  value={teacherForm.username}
                  onChange={(event) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      username:
                        event.target.value,
                    }))
                  }
                  style={styles.field}
                  placeholder="Username Guru"
                  required
                />
              </label>

              <label style={styles.label}>
                Password

                <input
                  type="password"
                  value={teacherForm.password}
                  onChange={(event) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      password:
                        event.target.value,
                    }))
                  }
                  style={styles.field}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </label>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() =>
                    setShowTeacherModal(false)
                  }
                  style={styles.ghostButton}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={savingTeacher}
                  style={styles.darkButton}
                >
                  {savingTeacher
                    ? "Menyimpan..."
                    : "Buat Akun Guru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryPanel({ stats, onAccounts }) {
  return (
    <section>
      <div style={styles.statGrid}>
        <StatCard
          label="Total Akun"
          value={stats.totalUsers}
        />

        <StatCard
          label="Total Guru"
          value={stats.totalGuru}
        />

        <StatCard
          label="Total Siswa"
          value={stats.totalSiswa}
        />

        <StatCard
          label="Diblokir"
          value={stats.totalBlocked}
        />

        <StatCard
          label="Total Kelas"
          value={stats.totalClasses}
        />

        <StatCard
          label="Total Tugas"
          value={stats.totalTasks}
        />

        <StatCard
          label="Tugas Terlambat"
          value={stats.overdueTasks}
        />

        <StatCard
          label="Tugas Selesai"
          value={stats.totalCompleted}
        />
      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>
              Gambaran Akun
            </h2>

            <p style={styles.panelSubtitle}>
              Kondisi akun yang tercatat di database.
            </p>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onAccounts}
          >
            Lihat Semua Akun
          </button>
        </div>

        <div style={styles.miniStatGrid}>
          <MiniStat
            label="Guru"
            value={stats.totalGuru}
          />

          <MiniStat
            label="Siswa"
            value={stats.totalSiswa}
          />

          <MiniStat
            label="Diblokir"
            value={stats.totalBlocked}
          />

          <MiniStat
            label="Tugas"
            value={stats.totalTasks}
          />
        </div>
      </section>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>
        {label}
      </span>

      <strong style={styles.statValue}>
        {value ?? 0}
      </strong>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={styles.miniStat}>
      <span>{label}</span>

      <strong>{value ?? 0}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#14213d",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 28px",
    background: "#ffffff",
    borderBottom: "1px solid #e5eaf2",
  },

  brand: {
    fontSize: 22,
    fontWeight: 800,
  },

  headerSubtitle: {
    marginTop: 4,
    color: "#68748a",
    fontSize: 13,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  adminIdentity: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    fontSize: 13,
  },

  identityLabel: {
    color: "#7a8497",
    fontSize: 11,
  },

  logoutButton: {
    border: "1px solid #efb5b5",
    background: "#fff5f5",
    color: "#d92d20",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  container: {
    width: "min(1200px, calc(100% - 40px))",
    margin: "0 auto",
    padding: "28px 0 14px",
  },

  hero: {
    background:
      "linear-gradient(135deg, #2456d6, #4b8bf4)",
    color: "#fff",
    borderRadius: 18,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    boxShadow:
      "0 18px 34px rgba(36,86,214,.18)",
  },

  heroEyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".12em",
    opacity: 0.82,
  },

  heroTitle: {
    margin: "8px 0 7px",
    fontSize: 28,
  },

  heroText: {
    margin: 0,
    opacity: 0.9,
  },

  primaryButton: {
    border: "none",
    background: "#0f172a",
    color: "#fff",
    borderRadius: 10,
    padding: "13px 18px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  tabs: {
    display: "flex",
    gap: 4,
    marginTop: 18,
    padding: 6,
    background: "#e7ebf2",
    borderRadius: 12,
    overflowX: "auto",
  },

  tab: {
    border: "none",
    background: "transparent",
    color: "#536077",
    borderRadius: 9,
    padding: "11px 18px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  tabActive: {
    border: "none",
    background: "#fff",
    color: "#111827",
    borderRadius: 9,
    padding: "11px 18px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 2px 6px rgba(15,23,42,.08)",
    whiteSpace: "nowrap",
  },

  tabBadge: {
    display: "inline-flex",
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
    padding: "0 5px",
    borderRadius: 999,
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
  },

  panel: {
    background: "#fff",
    border: "1px solid #e3e8f0",
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
    boxShadow:
      "0 10px 25px rgba(15,23,42,.04)",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },

  panelTitle: {
    margin: 0,
    fontSize: 20,
  },

  panelSubtitle: {
    margin: "4px 0 0",
    color: "#6b7280",
    fontSize: 13,
  },

  statGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },

  statCard: {
    border: "1px solid #e5eaf2",
    background: "#fff",
    borderRadius: 13,
    padding: 16,
    boxShadow:
      "0 6px 15px rgba(15,23,42,.04)",
  },

  statLabel: {
    display: "block",
    color: "#68748a",
    fontSize: 13,
  },

  statValue: {
    display: "block",
    marginTop: 9,
    fontSize: 24,
  },

  miniStatGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 16,
  },

  miniStat: {
    border: "1px solid #e6eaf1",
    background: "#f9fafc",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  darkButton: {
    border: "none",
    background: "#111827",
    color: "#fff",
    borderRadius: 9,
    padding: "11px 15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  dangerButton: {
    border: "1px solid #dc2626",
    background: "#dc2626",
    color: "#fff",
    borderRadius: 9,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    border: "1px solid #cfd7e6",
    background: "#fff",
    color: "#1d4ed8",
    borderRadius: 9,
    padding: "10px 13px",
    fontWeight: 700,
    cursor: "pointer",
  },

  ghostButton: {
    border: "1px solid #d7dee9",
    background: "#fff",
    color: "#344054",
    borderRadius: 9,
    padding: "10px 13px",
    fontWeight: 700,
    cursor: "pointer",
  },

  searchRow: {
    display: "grid",
    gridTemplateColumns:
      "1fr auto auto",
    gap: 8,
    marginBottom: 16,
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d6deea",
    borderRadius: 9,
    padding: "11px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },

  select: {
    border: "1px solid #d6deea",
    borderRadius: 9,
    padding: "11px 12px",
    fontSize: 14,
    background: "#fff",
  },

  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e5e9ef",
    borderRadius: 12,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 860,
  },

  th: {
    textAlign: "left",
    padding: "11px 12px",
    fontSize: 11,
    color: "#69758a",
    background: "#f8fafc",
    borderBottom:
      "1px solid #e5e9ef",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px 12px",
    borderBottom:
      "1px solid #edf0f4",
    verticalAlign: "top",
    fontSize: 13,
  },

  rowMuted: {
    marginTop: 4,
    color: "#7c8799",
    lineHeight: 1.35,
    maxWidth: 320,
  },

  emptyCell: {
    padding: 30,
    textAlign: "center",
    color: "#7a8497",
  },

  empty: {
    padding: 32,
    textAlign: "center",
    color: "#7a8497",
  },

  badgeGreen: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#ecfdf3",
    color: "#067647",
    fontSize: 11,
    fontWeight: 700,
  },

  badgeBlue: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 700,
  },

  badgeRed: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fff1f1",
    color: "#d92d20",
    fontSize: 11,
    fontWeight: 700,
  },

  badgeGray: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#f2f4f7",
    color: "#475467",
    fontSize: 11,
    fontWeight: 700,
  },

  badgeOrange: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: 11,
    fontWeight: 700,
  },

  blockButton: {
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#dc2626",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  unblockButton: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#15803d",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  classGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },

  classCard: {
    border: "1px solid #e4e9f1",
    background: "#fafbfc",
    borderRadius: 13,
    padding: 16,
  },

  className: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 12,
  },

  classRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderTop:
      "1px solid #edf0f4",
    color: "#667085",
    fontSize: 13,
  },

  feedbackFilters: {
    display: "grid",
    gridTemplateColumns:
      "1fr 180px 180px auto",
    gap: 8,
    marginBottom: 16,
  },

  feedbackList: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
  },

  feedbackCard: {
    border: "1px solid #e4e9f1",
    borderRadius: 13,
    padding: 16,
    background: "#fff",
  },

  feedbackCardUnread: {
    border: "1px solid #bfd6ff",
    borderRadius: 13,
    padding: 16,
    background: "#f8fbff",
  },

  feedbackTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  feedbackNameRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },

  feedbackMeta: {
    marginTop: 7,
    color: "#7a8497",
    fontSize: 12,
  },

  feedbackMessage: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#f8fafc",
    color: "#26344f",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },

  readButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 9,
    padding: "9px 11px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  alertSuccess: {
    marginTop: 14,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    padding: "11px 13px",
    borderRadius: 10,
  },

  alertError: {
    marginTop: 14,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#b42318",
    padding: "11px 13px",
    borderRadius: 10,
  },

  footer: {
    textAlign: "center",
    color: "#8a94a6",
    fontSize: 12,
    padding: "28px 0 10px",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },

  modal: {
    width: "min(520px, 100%)",
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow:
      "0 25px 60px rgba(15,23,42,.25)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  modalEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".12em",
    color: "#2563eb",
  },

  modalTitle: {
    margin: "5px 0 0",
    fontSize: 22,
  },

  deleteWarning: {
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: 11,
    padding: 14,
    lineHeight: 1.55,
    fontSize: 13,
  },

  closeButton: {
    border: "1px solid #d7dee9",
    background: "#fff",
    color: "#344054",
    borderRadius: 9,
    padding: "8px 10px",
    cursor: "pointer",
  },

  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 13,
  },

  field: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 6,
    border: "1px solid #d6deea",
    borderRadius: 9,
    padding: "11px 12px",
    fontSize: 14,
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 18,
  },
};
