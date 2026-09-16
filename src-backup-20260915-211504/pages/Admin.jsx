import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const DEFAULT_STATS = {
  totalUsers: 0,
  totalGuru: 0,
  totalSiswa: 0,
  totalBlocked: 0,
  totalClasses: 0,
  totalTasks: 0,
  overdueTasks: 0,
  totalCompleted: 0,
};

const EMPTY_TEACHER_FORM = {
  fullName: "",
  username: "",
  password: "",
};

function getAdminToken() {
  return localStorage.getItem("prReminderAdminToken");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function roleLabel(role) {
  if (role === "guru") {
    return "Guru";
  }

  if (role === "siswa") {
    return "Siswa";
  }

  return role || "-";
}

function statusLabel(status) {
  if (status === "active") {
    return "Aktif";
  }

  if (status === "blocked") {
    return "Diblokir";
  }

  return status || "-";
}

function statusColor(status) {
  if (status === "active") {
    return "#15803d";
  }

  if (status === "blocked") {
    return "#dc2626";
  }

  return "#6b7280";
}

export default function Admin() {
  const [admin, setAdmin] = useState(null);

  const [stats, setStats] = useState(DEFAULT_STATS);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [classes, setClasses] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showTeacherModal, setShowTeacherModal] =
    useState(false);

  const [teacherForm, setTeacherForm] = useState(
    EMPTY_TEACHER_FORM
  );

  const [creatingTeacher, setCreatingTeacher] =
    useState(false);

  const [visiblePassword, setVisiblePassword] =
    useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  const token = getAdminToken();

  const headers = useMemo(() => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  async function handleUnauthorized() {
    localStorage.removeItem("prReminderAdminToken");
    localStorage.removeItem("prReminderAdmin");

    setAdmin(null);

    alert(
      "Sesi Admin sudah berakhir. Silakan login Admin kembali."
    );

    window.location.href = "/";
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      await handleUnauthorized();
      throw new Error(
        "Sesi Admin tidak valid atau sudah kedaluwarsa."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Terjadi kesalahan saat menghubungi server."
      );
    }

    return data;
  }

  async function loadAdmin() {
    try {
      const data = await fetchJson(
        `${API_URL}/api/admin/me`
      );

      if (data.admin) {
        setAdmin(data.admin);
        localStorage.setItem(
          "prReminderAdmin",
          JSON.stringify(data.admin)
        );
      }
    } catch (error) {
      console.error("loadAdmin:", error);
      setErrorMessage(error.message);
    }
  }

  async function loadStats() {
    try {
      const data = await fetchJson(
        `${API_URL}/api/admin/stats`
      );

      setStats({
        ...DEFAULT_STATS,
        ...(data.stats || {}),
      });
    } catch (error) {
      console.error("loadStats:", error);
      setErrorMessage(error.message);
    }
  }

  async function loadUsers(searchValue = search) {
    setLoadingUsers(true);

    try {
      const query = searchValue.trim()
        ? `?search=${encodeURIComponent(
            searchValue.trim()
          )}`
        : "";

      const data = await fetchJson(
        `${API_URL}/api/admin/users${query}`
      );

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error("loadUsers:", error);
      setErrorMessage(error.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadTasks() {
    setLoadingTasks(true);

    try {
      const data = await fetchJson(
        `${API_URL}/api/admin/tasks`
      );

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (error) {
      console.error("loadTasks:", error);
      setErrorMessage(error.message);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadClasses() {
    setLoadingClasses(true);

    try {
      const data = await fetchJson(
        `${API_URL}/api/admin/classes`
      );

      setClasses(
        Array.isArray(data.classes) ? data.classes : []
      );
    } catch (error) {
      console.error("loadClasses:", error);
      setErrorMessage(error.message);
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setErrorMessage("");

    await Promise.all([
      loadAdmin(),
      loadStats(),
      loadUsers(""),
      loadTasks(),
      loadClasses(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    if (!token) {
      window.location.href = "/";
      return;
    }

    loadAll();
  }, []);

  async function handleSearchSubmit(event) {
    event.preventDefault();
    await loadUsers(search);
  }

  async function handleStatusChange(user) {
    const nextStatus =
      user.status === "active"
        ? "blocked"
        : "active";

    const actionText =
      nextStatus === "blocked"
        ? "memblokir"
        : "membuka blokir";

    const confirmed = window.confirm(
      `Yakin ingin ${actionText} akun "${user.fullName || user.username}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");

      const data = await fetchJson(
        `${API_URL}/api/admin/users/${user.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      if (data.user) {
        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item.id === data.user.id
              ? {
                  ...item,
                  ...data.user,
                }
              : item
          )
        );
      }

      await loadStats();

      alert(data.message || "Status akun berhasil diubah.");
    } catch (error) {
      console.error(
        "handleStatusChange:",
        error
      );

      alert(error.message);
    }
  }

  function handleTeacherInputChange(event) {
    const { name, value } = event.target;

    setTeacherForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function closeTeacherModal() {
    if (creatingTeacher) {
      return;
    }

    setShowTeacherModal(false);
    setTeacherForm(EMPTY_TEACHER_FORM);
    setVisiblePassword(false);
  }

  async function handleCreateTeacher(event) {
    event.preventDefault();

    const cleanName =
      teacherForm.fullName.trim();

    const cleanUsername =
      teacherForm.username.trim();

    const password = teacherForm.password;

    if (!cleanName || !cleanUsername || !password) {
      alert(
        "Nama lengkap, username, dan password harus diisi."
      );
      return;
    }

    if (cleanName.length < 2) {
      alert("Nama lengkap terlalu pendek.");
      return;
    }

    if (cleanUsername.length < 3) {
      alert("Username minimal 3 karakter.");
      return;
    }

    if (password.length < 6) {
      alert("Password minimal 6 karakter.");
      return;
    }

    try {
      setCreatingTeacher(true);
      setErrorMessage("");

      const data = await fetchJson(
        `${API_URL}/api/admin/users/teacher`,
        {
          method: "POST",
          body: JSON.stringify({
            fullName: cleanName,
            username: cleanUsername,
            password,
          }),
        }
      );

      alert(
        data.message ||
          "Akun Guru berhasil dibuat."
      );

      setShowTeacherModal(false);
      setTeacherForm(EMPTY_TEACHER_FORM);
      setVisiblePassword(false);

      await Promise.all([
        loadStats(),
        loadUsers(search),
      ]);
    } catch (error) {
      console.error(
        "handleCreateTeacher:",
        error
      );

      alert(error.message);
    } finally {
      setCreatingTeacher(false);
    }
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "Yakin ingin keluar dari Dashboard Admin?"
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem("prReminderAdminToken");
    localStorage.removeItem("prReminderAdmin");

    window.location.href = "/";
  }

  const guruUsers = users.filter(
    (user) => user.role === "guru"
  );

  const siswaUsers = users.filter(
    (user) => user.role === "siswa"
  );

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingPageStyle}>
          <div style={spinnerStyle}>⏳</div>
          <h2 style={{ marginBottom: 8 }}>
            Memuat Dashboard Admin...
          </h2>
          <p style={{ color: "#6b7280" }}>
            Menghubungkan ke server PR Reminder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <div style={brandStyle}>
            PR Reminder
          </div>

          <div style={subtitleStyle}>
            Dashboard Owner / Admin
          </div>
        </div>

        <div style={headerRightStyle}>
          <div style={adminInfoStyle}>
            <span style={adminLabelStyle}>
              Login sebagai
            </span>

            <strong>
              {admin?.username || "Admin"}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={logoutButtonStyle}
          >
            Keluar
          </button>
        </div>
      </header>

      <main style={mainStyle}>
        {errorMessage ? (
          <div style={errorBannerStyle}>
            <div>
              <strong>Terjadi masalah:</strong>{" "}
              {errorMessage}
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage("")}
              style={errorCloseStyle}
            >
              ×
            </button>
          </div>
        ) : null}

        <section style={welcomeCardStyle}>
          <div>
            <div style={eyebrowStyle}>
              CONTROL CENTER
            </div>

            <h1 style={welcomeTitleStyle}>
              Selamat datang di Admin
              Dashboard
            </h1>

            <p style={welcomeTextStyle}>
              Pantau akun, guru, siswa, kelas,
              tugas, dan aktivitas PR Reminder
              dari satu tempat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTeacherForm(
                EMPTY_TEACHER_FORM
              );
              setVisiblePassword(false);
              setShowTeacherModal(true);
            }}
            style={primaryButtonStyle}
          >
            + Tambah Guru
          </button>
        </section>

        <div style={tabBarStyle}>
          <button
            type="button"
            onClick={() =>
              setActiveTab("overview")
            }
            style={{
              ...tabButtonStyle,
              ...(activeTab === "overview"
                ? activeTabButtonStyle
                : {}),
            }}
          >
            Ringkasan
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("users")
            }
            style={{
              ...tabButtonStyle,
              ...(activeTab === "users"
                ? activeTabButtonStyle
                : {}),
            }}
          >
            Akun
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("tasks")
            }
            style={{
              ...tabButtonStyle,
              ...(activeTab === "tasks"
                ? activeTabButtonStyle
                : {}),
            }}
          >
            Tugas
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("classes")
            }
            style={{
              ...tabButtonStyle,
              ...(activeTab === "classes"
                ? activeTabButtonStyle
                : {}),
            }}
          >
            Kelas
          </button>
        </div>

        {activeTab === "overview" ? (
          <>
            <section style={statsGridStyle}>
              <StatCard
                label="Total Akun"
                value={stats.totalUsers}
                icon="👥"
              />

              <StatCard
                label="Total Guru"
                value={stats.totalGuru}
                icon="👨‍🏫"
              />

              <StatCard
                label="Total Siswa"
                value={stats.totalSiswa}
                icon="🎓"
              />

              <StatCard
                label="Diblokir"
                value={stats.totalBlocked}
                icon="🚫"
              />

              <StatCard
                label="Total Kelas"
                value={stats.totalClasses}
                icon="🏫"
              />

              <StatCard
                label="Total Tugas"
                value={stats.totalTasks}
                icon="📚"
              />

              <StatCard
                label="Tugas Terlambat"
                value={stats.overdueTasks}
                icon="⏰"
              />

              <StatCard
                label="Tugas Selesai"
                value={stats.totalCompleted}
                icon="✅"
              />
            </section>

            <section style={sectionCardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>
                    Gambaran Akun
                  </h2>

                  <p style={sectionSubtitleStyle}>
                    Kondisi akun yang tercatat di
                    database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab("users")
                  }
                  style={secondaryButtonStyle}
                >
                  Lihat Semua Akun
                </button>
              </div>

              <div style={summaryGridStyle}>
                <SummaryRow
                  label="Guru"
                  value={stats.totalGuru}
                  icon="👨‍🏫"
                />

                <SummaryRow
                  label="Siswa"
                  value={stats.totalSiswa}
                  icon="🎓"
                />

                <SummaryRow
                  label="Diblokir"
                  value={stats.totalBlocked}
                  icon="🚫"
                />
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "users" ? (
          <section style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  Manajemen Akun
                </h2>

                <p style={sectionSubtitleStyle}>
                  Cari, pantau, blokir, dan buka
                  kembali akun pengguna.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTeacherForm(
                    EMPTY_TEACHER_FORM
                  );
                  setVisiblePassword(false);
                  setShowTeacherModal(true);
                }}
                style={primaryButtonStyle}
              >
                + Tambah Guru
              </button>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              style={searchFormStyle}
            >
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama, username, role, atau kelas..."
                style={searchInputStyle}
              />

              <button
                type="submit"
                style={secondaryButtonStyle}
                disabled={loadingUsers}
              >
                {loadingUsers
                  ? "Mencari..."
                  : "Cari"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setSearch("");
                  await loadUsers("");
                }}
                style={ghostButtonStyle}
              >
                Reset
              </button>
            </form>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <MiniStat
                label="Guru di hasil"
                value={guruUsers.length}
                icon="👨‍🏫"
              />

              <MiniStat
                label="Siswa di hasil"
                value={siswaUsers.length}
                icon="🎓"
              />

              <MiniStat
                label="Total hasil"
                value={users.length}
                icon="👥"
              />
            </div>

            {loadingUsers ? (
              <EmptyState text="Memuat daftar akun..." />
            ) : users.length === 0 ? (
              <EmptyState text="Belum ada akun yang ditemukan." />
            ) : (
              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>
                        Nama
                      </th>

                      <th style={thStyle}>
                        Username
                      </th>

                      <th style={thStyle}>
                        Role
                      </th>

                      <th style={thStyle}>
                        Kelas
                      </th>

                      <th style={thStyle}>
                        Status
                      </th>

                      <th style={thStyle}>
                        Login terakhir
                      </th>

                      <th style={thStyle}>
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td style={tdStyle}>
                          <strong>
                            {user.fullName ||
                              "-"}
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          {user.username}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              ...roleBadgeStyle,
                              background:
                                user.role === "guru"
                                  ? "#eff6ff"
                                  : "#f0fdf4",
                              color:
                                user.role === "guru"
                                  ? "#2563eb"
                                  : "#15803d",
                            }}
                          >
                            {roleLabel(
                              user.role
                            )}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {user.className ||
                            user.classId ||
                            "-"}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              ...statusBadgeStyle,
                              color:
                                statusColor(
                                  user.status
                                ),
                              background:
                                user.status ===
                                "active"
                                  ? "#f0fdf4"
                                  : "#fef2f2",
                            }}
                          >
                            {statusLabel(
                              user.status
                            )}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {formatDate(
                            user.lastLogin
                          )}
                        </td>

                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(
                                user
                              )
                            }
                            style={{
                              ...actionButtonStyle,
                              background:
                                user.status ===
                                "active"
                                  ? "#fef2f2"
                                  : "#f0fdf4",
                              color:
                                user.status ===
                                "active"
                                  ? "#dc2626"
                                  : "#15803d",
                            }}
                          >
                            {user.status ===
                            "active"
                              ? "Blokir"
                              : "Buka"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "tasks" ? (
          <section style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  Semua Tugas
                </h2>

                <p style={sectionSubtitleStyle}>
                  Pantau tugas yang dibuat Guru.
                </p>
              </div>

              <button
                type="button"
                onClick={loadTasks}
                style={secondaryButtonStyle}
              >
                {loadingTasks
                  ? "Memuat..."
                  : "Refresh"}
              </button>
            </div>

            {loadingTasks ? (
              <EmptyState text="Memuat daftar tugas..." />
            ) : tasks.length === 0 ? (
              <EmptyState text="Belum ada tugas." />
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    style={taskCardStyle}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 16,
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <span
                          style={subjectBadgeStyle}
                        >
                          {task.subject}
                        </span>

                        <h3
                          style={{
                            margin:
                              "10px 0 6px",
                            fontSize: 18,
                            color: "#111827",
                          }}
                        >
                          {task.title}
                        </h3>

                        <p
                          style={{
                            margin:
                              "0 0 10px",
                            color: "#6b7280",
                            lineHeight: 1.6,
                          }}
                        >
                          {task.description}
                        </p>
                      </div>

                      <span
                        style={classBadgeStyle}
                      >
                        {task.className ||
                          task.classId ||
                          "-"}
                      </span>
                    </div>

                    <div
                      style={taskMetaGridStyle}
                    >
                      <TaskMeta
                        label="Guru"
                        value={
                          task.creatorFullName ||
                          task.creatorUsername ||
                          "-"
                        }
                      />

                      <TaskMeta
                        label="Deadline"
                        value={formatDate(
                          task.deadline
                        )}
                      />

                      <TaskMeta
                        label="Siswa"
                        value={String(
                          task.totalStudents
                        )}
                      />

                      <TaskMeta
                        label="Selesai"
                        value={String(
                          task.completedStudents
                        )}
                      />

                      <TaskMeta
                        label="Belum"
                        value={String(
                          task.incompleteStudents
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "classes" ? (
          <section style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>
                  Daftar Kelas
                </h2>

                <p style={sectionSubtitleStyle}>
                  Jumlah siswa dan guru per kelas.
                </p>
              </div>

              <button
                type="button"
                onClick={loadClasses}
                style={secondaryButtonStyle}
              >
                {loadingClasses
                  ? "Memuat..."
                  : "Refresh"}
              </button>
            </div>

            {loadingClasses ? (
              <EmptyState text="Memuat daftar kelas..." />
            ) : classes.length === 0 ? (
              <EmptyState text="Belum ada data kelas." />
            ) : (
              <div style={classGridStyle}>
                {classes.map((item) => (
                  <div
                    key={item.id}
                    style={classCardStyle}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          display: "grid",
                          placeItems:
                            "center",
                          background:
                            "#eff6ff",
                          fontSize: 20,
                        }}
                      >
                        🏫
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <MiniInfo
                        label="Siswa"
                        value={
                          item.totalStudents
                        }
                      />

                      <MiniInfo
                        label="Guru"
                        value={
                          item.totalTeachers
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>

      <footer style={footerStyle}>
        ♥ Made by Rayva
      </footer>

      {showTeacherModal ? (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>
                  ADMIN
                </div>

                <h2
                  style={{
                    margin:
                      "4px 0 0",
                    fontSize: 24,
                    color: "#111827",
                  }}
                >
                  Tambah Akun Guru
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#6b7280",
                    lineHeight: 1.5,
                  }}
                >
                  Buat akun Guru baru yang
                  dapat digunakan untuk login.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTeacherModal}
                disabled={creatingTeacher}
                style={modalCloseButtonStyle}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateTeacher}
              style={{
                display: "grid",
                gap: 16,
              }}
            >
              <label style={fieldLabelStyle}>
                Nama Lengkap
                <input
                  type="text"
                  name="fullName"
                  value={teacherForm.fullName}
                  onChange={
                    handleTeacherInputChange
                  }
                  placeholder="Masukkan nama lengkap Guru"
                  autoComplete="name"
                  style={inputStyle}
                  disabled={creatingTeacher}
                />
              </label>

              <label style={fieldLabelStyle}>
                Username
                <input
                  type="text"
                  name="username"
                  value={teacherForm.username}
                  onChange={
                    handleTeacherInputChange
                  }
                  placeholder="Contoh: guru.bahasa"
                  autoComplete="username"
                  style={inputStyle}
                  disabled={creatingTeacher}
                />
              </label>

              <label style={fieldLabelStyle}>
                Password
                <div
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <input
                    type={
                      visiblePassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={teacherForm.password}
                    onChange={
                      handleTeacherInputChange
                    }
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    style={{
                      ...inputStyle,
                      paddingRight: 90,
                    }}
                    disabled={creatingTeacher}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setVisiblePassword(
                        (current) =>
                          !current
                      )
                    }
                    disabled={creatingTeacher}
                    style={{
                      position:
                        "absolute",
                      right: 10,
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      border: "none",
                      background:
                        "transparent",
                      color: "#2563eb",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {visiblePassword
                      ? "Sembunyikan"
                      : "Lihat"}
                  </button>
                </div>
              </label>

              <div
                style={{
                  marginTop: 4,
                  padding: 12,
                  borderRadius: 10,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Akun Guru akan dibuat sebagai
                akun aktif dan langsung dapat
                digunakan untuk login.
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={closeTeacherModal}
                  disabled={creatingTeacher}
                  style={ghostButtonStyle}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={creatingTeacher}
                  style={{
                    ...primaryButtonStyle,
                    minWidth: 150,
                  }}
                >
                  {creatingTeacher
                    ? "Membuat..."
                    : "Buat Akun Guru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}) {
  return (
    <div style={statCardStyle}>
      <div style={statIconStyle}>
        {icon}
      </div>

      <div>
        <div style={statLabelStyle}>
          {label}
        </div>

        <div style={statValueStyle}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  icon,
}) {
  return (
    <div style={summaryRowStyle}>
      <div style={summaryLeftStyle}>
        <span style={summaryIconStyle}>
          {icon}
        </span>

        <span>{label}</span>
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          {label}
        </span>

        <span>{icon}</span>
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 18,
          color: "#111827",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function TaskMeta({
  label,
  value,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 14,
          color: "#111827",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={emptyStateStyle}>
      <div
        style={{
          fontSize: 34,
          marginBottom: 10,
        }}
      >
        📭
      </div>

      <div
        style={{
          color: "#6b7280",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #f8fafc 0%, #f3f6fb 100%)",
  color: "#111827",
};

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  padding: "18px 34px",
  background: "rgba(255,255,255,0.96)",
  borderBottom: "1px solid #e5e7eb",
  backdropFilter: "blur(10px)",
};

const brandStyle = {
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: "-0.4px",
};

const subtitleStyle = {
  marginTop: 3,
  fontSize: 13,
  color: "#6b7280",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const adminInfoStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
  fontSize: 14,
};

const adminLabelStyle = {
  fontSize: 11,
  color: "#6b7280",
};

const logoutButtonStyle = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const mainStyle = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "28px 24px 90px",
};

const welcomeCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  padding: 26,
  borderRadius: 20,
  background:
    "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)",
  color: "#ffffff",
  boxShadow:
    "0 20px 40px rgba(37, 99, 235, 0.18)",
  marginBottom: 22,
};

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "1.2px",
  opacity: 0.75,
};

const welcomeTitleStyle = {
  margin: "7px 0 8px",
  fontSize: 30,
  lineHeight: 1.15,
};

const welcomeTextStyle = {
  maxWidth: 760,
  margin: 0,
  color: "rgba(255,255,255,0.88)",
  lineHeight: 1.6,
};

const primaryButtonStyle = {
  border: "none",
  background: "#111827",
  color: "#ffffff",
  padding: "12px 18px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryButtonStyle = {
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#1d4ed8",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostButtonStyle = {
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#374151",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const tabBarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: 6,
  borderRadius: 14,
  background: "#e5e7eb",
  marginBottom: 22,
};

const tabButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#4b5563",
  padding: "10px 16px",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const activeTabButtonStyle = {
  background: "#ffffff",
  color: "#111827",
  boxShadow:
    "0 2px 8px rgba(15, 23, 42, 0.08)",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const statCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: 18,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 8px 24px rgba(15, 23, 42, 0.05)",
};

const statIconStyle = {
  width: 46,
  height: 46,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "#eff6ff",
  fontSize: 22,
};

const statLabelStyle = {
  color: "#6b7280",
  fontSize: 13,
  marginBottom: 4,
};

const statValueStyle = {
  color: "#111827",
  fontSize: 26,
  fontWeight: 800,
};

const sectionCardStyle = {
  background: "#ffffff",
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  padding: 22,
  boxShadow:
    "0 8px 24px rgba(15, 23, 42, 0.04)",
  marginBottom: 22,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 20,
};

const sectionSubtitleStyle = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: 13,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 16,
  borderRadius: 12,
  background: "#f9fafb",
  border: "1px solid #eef0f4",
};

const summaryLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
};

const summaryIconStyle = {
  fontSize: 18,
};

const searchFormStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) auto auto",
  gap: 10,
  marginBottom: 20,
};

const searchInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  outline: "none",
  fontSize: 14,
  background: "#ffffff",
};

const tableWrapperStyle = {
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1000,
};

const thStyle = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  color: "#6b7280",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  verticalAlign: "middle",
};

const roleBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 9px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 800,
};

const statusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 9px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 800,
};

const actionButtonStyle = {
  border: "none",
  padding: "8px 11px",
  borderRadius: 8,
  fontWeight: 800,
  cursor: "pointer",
};

const taskCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  background: "#ffffff",
};

const subjectBadgeStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: 7,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 800,
};

const classBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 8,
  background: "#f3f4f6",
  color: "#374151",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const taskMetaGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: 14,
  marginTop: 16,
  paddingTop: 14,
  borderTop: "1px solid #eef0f4",
};

const classGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const classCardStyle = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
};

const emptyStateStyle = {
  padding: 40,
  textAlign: "center",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px dashed #d1d5db",
};

const loadingPageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: 30,
  background: "#f8fafc",
};

const spinnerStyle = {
  fontSize: 44,
  marginBottom: 10,
};

const errorBannerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  padding: "12px 14px",
  marginBottom: 18,
  borderRadius: 12,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  fontSize: 13,
};

const errorCloseStyle = {
  border: "none",
  background: "transparent",
  color: "#991b1b",
  fontSize: 22,
  cursor: "pointer",
};

const footerStyle = {
  textAlign: "center",
  padding: "20px 16px 30px",
  color: "#9ca3af",
  fontSize: 13,
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15, 23, 42, 0.58)",
};

const modalStyle = {
  width: "min(520px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: 20,
  background: "#ffffff",
  padding: 24,
  boxShadow:
    "0 30px 80px rgba(15, 23, 42, 0.24)",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 22,
};

const modalCloseButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#374151",
  fontSize: 22,
  cursor: "pointer",
};

const fieldLabelStyle = {
  display: "grid",
  gap: 7,
  fontSize: 13,
  fontWeight: 800,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  outline: "none",
  fontSize: 14,
  color: "#111827",
  background: "#ffffff",
};