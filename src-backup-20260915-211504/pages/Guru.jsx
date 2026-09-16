�import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

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
    return (
      <GuruLogin
        onLogin={onLogin}
        onBack={onBack}
      />
    );
  }

  return (
    <GuruDashboard
      user={user}
      onLogout={onLogout}
    />
  );
}

/* =========================================================
   LOGIN GURU
========================================================= */

function GuruLogin({
  onLogin,
  onBack,
}) {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function submit(event) {
    event.preventDefault();

    setErrorMessage("");

    if (!username.trim()) {
      setErrorMessage(
        "Username harus diisi."
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Password harus diisi."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username:
              username.trim(),
            password,
            role: "guru",
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
        setErrorMessage(
          data.message ||
            "Username atau password Guru salah."
        );
        return;
      }

      if (
        !data.token ||
        !data.user
      ) {
        setErrorMessage(
          "Data login dari server tidak lengkap."
        );
        return;
      }

      localStorage.setItem(
        "prReminderToken",
        data.token
      );

      localStorage.setItem(
        "prReminderUser",
        JSON.stringify(
          data.user
        )
      );

      onLogin(data.user);
    } catch (error) {
      console.error(
        "GURU LOGIN:",
        error
      );

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
          � � Kembali
        </button>

        <div style={loginStyles.icon}>
          G
        </div>

        <div style={loginStyles.brand}>
          PR REMINDER
        </div>

        <h1 style={loginStyles.title}>
          Login Guru
        </h1>

        <p style={loginStyles.subtitle}>
          Masuk ke akun Guru Anda.
        </p>

        <form
          onSubmit={submit}
          style={loginStyles.form}
        >
          <label
            style={loginStyles.label}
          >
            Username
          </label>

          <input
            value={username}
            onChange={(event) => {
              setUsername(
                event.target.value
              );
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
              marginTop: 8,
            }}
          >
            Password
          </label>

          <div
            style={
              loginStyles.passwordWrap
            }
          >
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value
                );
                setErrorMessage("");
              }}
              placeholder="Masukkan password"
              autoComplete="current-password"
              disabled={loading}
              style={{
                ...loginStyles.input,
                paddingRight: 75,
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }
              style={
                loginStyles.showPassword
              }
            >
              {showPassword
                ? "Sembunyikan"
                : "Lihat"}
            </button>
          </div>

          {errorMessage ? (
            <div
              style={
                loginStyles.error
              }
            >
              �a� {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={
              loginStyles.submit
            }
          >
            {loading
              ? "Memeriksa..."
              : "Masuk"}
          </button>
        </form>

        <div
          style={
            loginStyles.watermark
          }
        >
          �"� Made by Rayva
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD GURU
========================================================= */

function GuruDashboard({
  user,
  onLogout,
}) {
  const [activePage, setActivePage] =
    useState("home");

  const [tasks, setTasks] =
    useState([]);

  const [classes, setClasses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [showFeedback, setShowFeedback] =
    useState(false);

  const [feedbackType, setFeedbackType] =
    useState("saran");

  const [feedbackMessage, setFeedbackMessage] =
    useState("");

  const [sendingFeedback, setSendingFeedback] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const token =
    localStorage.getItem(
      "prReminderToken"
    );

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
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal mengambil tugas."
        );
      }

      setTasks(
        Array.isArray(data.tasks)
          ? data.tasks
          : []
      );
    } catch (error) {
      console.error(
        "GURU TASKS:",
        error
      );
    }
  }

  async function loadClasses() {
    try {
      const response = await fetch(
        `${API_URL}/api/classes`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal mengambil kelas."
        );
      }

      if (
        Array.isArray(
          data.classes
        )
      ) {
        setClasses(
          data.classes
        );
      } else {
        setClasses(
          CLASS_OPTIONS.map(
            (id) => ({
              id,
              name: id,
            })
          )
        );
      }
    } catch (error) {
      console.error(
        "GURU CLASSES:",
        error
      );

      setClasses(
        CLASS_OPTIONS.map(
          (id) => ({
            id,
            name: id,
          })
        )
      );
    }
  }

  async function createTask(
    event
  ) {
    event.preventDefault();

    if (!form.subject) {
      alert(
        "Mata pelajaran belum dipilih."
      );
      return;
    }

    if (!form.title.trim()) {
      alert(
        "Nama tugas belum diisi."
      );
      return;
    }

    if (
      !form.description.trim()
    ) {
      alert(
        "Deskripsi belum diisi."
      );
      return;
    }

    if (!form.deadline) {
      alert(
        "Deadline belum diisi."
      );
      return;
    }

    if (!form.classId) {
      alert(
        "Kelas tujuan belum dipilih."
      );
      return;
    }

    if (!token) {
      alert(
        "Sesi Guru tidak ditemukan. Silakan login kembali."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject:
              form.subject,
            title:
              form.title.trim(),
            description:
              form.description.trim(),
            deadline:
              form.deadline,
            classId:
              form.classId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal membagikan tugas."
        );
      }

      setForm(
        EMPTY_FORM
      );

      setShowCreate(false);

      await loadTasks();

      setActivePage("tasks");

      alert(
        "Tugas berhasil dibagikan!"
      );
    } catch (error) {
      console.error(
        "CREATE TASK:",
        error
      );

      alert(
        error.message ||
          "Gagal membagikan tugas."
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitFeedback(
    event
  ) {
    event.preventDefault();

    const cleanMessage =
      feedbackMessage.trim();

    if (!cleanMessage) {
      return;
    }

    setSendingFeedback(true);

    try {
      const response = await fetch(
        `${API_URL}/api/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: feedbackType,
            message:
              cleanMessage,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Gagal mengirim masukan."
        );
      }

      setFeedbackMessage("");
      setFeedbackType("saran");
      setShowFeedback(false);

      alert(
        "Terima kasih! Masukan Anda berhasil dikirim."
      );
    } catch (error) {
      console.error(
        "GURU FEEDBACK:",
        error
      );

      alert(
        error.message ||
          "Gagal mengirim masukan."
      );
    } finally {
      setSendingFeedback(false);
    }
  }

  const statistics =
    useMemo(() => {
      const total =
        tasks.length;

      const completed =
        tasks.reduce(
          (sum, task) =>
            sum +
            Number(
              task.completedStudents ||
                0
            ),
          0
        );

      const totalStudents =
        tasks.reduce(
          (sum, task) =>
            sum +
            Number(
              task.totalStudents ||
                0
            ),
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
      <div
        style={
          dashboardStyles.loadingPage
        }
      >
        <div
          style={
            dashboardStyles.loadingIcon
          }
        >
          �S
        </div>

        <h2>
          PR Reminder
        </h2>

        <p>
          Memuat Dashboard Guru...
        </p>

        <small>
          �"� Made by Rayva
        </small>
      </div>
    );
  }

  return (
    <div
      style={
        dashboardStyles.page
      }
    >
      <header
        style={
          dashboardStyles.header
        }
      >
        <div
          style={
            dashboardStyles.headerLeft
          }
        >
          <button
            type="button"
            onClick={() =>
              setActivePage(
                "home"
              )
            }
            style={
              dashboardStyles.backButton
            }
          >
            � �
          </button>

          <div>
            <div
              style={
                dashboardStyles.logo
              }
            >
              PR Reminder
            </div>

            <div
              style={
                dashboardStyles.headerSub
              }
            >
              Dashboard Guru
            </div>
          </div>
        </div>

        <div
          style={
            dashboardStyles.headerRight
          }
        >
          <button
            type="button"
            onClick={() =>
              setActivePage(
                "profile"
              )
            }
            style={
              dashboardStyles.headerUser
            }
          >
            �x�
          </button>
        </div>
      </header>

      <main
        style={
          dashboardStyles.main
        }
      >
        {activePage === "home" ? (
          <>
            <section
              style={
                dashboardStyles.welcome
              }
            >
              <div>
                <small
                  style={
                    dashboardStyles.eyebrow
                  }
                >
                  RUANG GURU
                </small>

                <h1>
                  Halo,{" "}
                  {user?.fullName ||
                    user?.username ||
                    "Guru"}{" "}
                  �x9
                </h1>

                <p>
                  Kelola tugas siswa
                  dengan lebih mudah.
                </p>
              </div>

              <div
                style={
                  dashboardStyles.avatar
                }
              >
                �x�⬍�x��
              </div>
            </section>

            <div
              style={
                dashboardStyles.stats
              }
            >
              <TeacherStat
                icon="�xa"
                label="Total Tugas"
                value={
                  statistics.total
                }
              />

              <TeacherStat
                icon="�S&"
                label="Siswa Selesai"
                value={
                  statistics.completed
                }
              />

              <TeacherStat
                icon="�x�"
                label="Data Siswa"
                value={
                  statistics.totalStudents
                }
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
                setActivePage(
                  "tasks"
                )
              }
            />

            {tasks.length === 0 ? (
              <EmptyTeacher />
            ) : (
              <div
                style={
                  dashboardStyles.taskList
                }
              >
                {tasks
                  .slice(0, 3)
                  .map(
                    (task) => (
                      <TeacherTaskCard
                        key={
                          task.id
                        }
                        task={
                          task
                        }
                        onClick={() =>
                          setSelectedTask(
                            task
                          )
                        }
                      />
                    )
                  )}
              </div>
            )}
          </>
        ) : null}

        {activePage ===
        "tasks" ? (
          <>
            <div
              style={
                dashboardStyles.pageHeading
              }
            >
              <div>
                <h1>
                  Tugas Saya
                </h1>

                <p>
                  Semua tugas yang
                  telah dibagikan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreate(
                    true
                  )
                }
                style={
                  dashboardStyles.createButton
                }
              >
                + Buat Tugas
              </button>
            </div>

            {tasks.length === 0 ? (
              <EmptyTeacher />
            ) : (
              <div
                style={
                  dashboardStyles.taskList
                }
              >
                {tasks.map(
                  (task) => (
                    <TeacherTaskCard
                      key={
                        task.id
                      }
                      task={
                        task
                      }
                      onClick={() =>
                        setSelectedTask(
                          task
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </>
        ) : null}

        {activePage ===
        "classes" ? (
          <>
            <div
              style={
                dashboardStyles.pageHeading
              }
            >
              <div>
                <h1>
                  Kelas
                </h1>

                <p>
                  Kelas yang menerima
                  tugas.
                </p>
              </div>
            </div>

            <div
              style={
                dashboardStyles.classGrid
              }
            >
              {CLASS_OPTIONS.map(
                (classId) => {
                  const count =
                    tasks.filter(
                      (task) =>
                        (task.classId ||
                          task.class_id) ===
                        classId
                    ).length;

                  return (
                    <div
                      key={
                        classId
                      }
                      style={
                        dashboardStyles.classCard
                      }
                    >
                      <div
                        style={
                          dashboardStyles.classIcon
                        }
                      >
                        �x��
                      </div>

                      <strong>
                        {classId}
                      </strong>

                      <small>
                        {count} tugas
                      </small>
                    </div>
                  );
                }
              )}
            </div>
          </>
        ) : null}

        {activePage ===
        "profile" ? (
          <TeacherProfile
            user={user}
            taskCount={
              statistics.total
            }
            onFeedback={() =>
              setShowFeedback(
                true
              )
            }
            onLogout={onLogout}
          />
        ) : null}
      </main>

      <nav
        style={
          dashboardStyles.navigation
        }
      >
        <TeacherNav
          icon="�R"
          label="Beranda"
          active={
            activePage ===
            "home"
          }
          onClick={() =>
            setActivePage(
              "home"
            )
          }
        />

        <TeacherNav
          icon="�ܷ"
          label="Tugas"
          active={
            activePage ===
            "tasks"
          }
          onClick={() =>
            setActivePage(
              "tasks"
            )
          }
        />

        <TeacherNav
          icon="�"""
          label="Kelas"
          active={
            activePage ===
            "classes"
          }
          onClick={() =>
            setActivePage(
              "classes"
            )
          }
        />

        <TeacherNav
          icon="�x�"
          label="Profil"
          active={
            activePage ===
            "profile"
          }
          onClick={() =>
            setActivePage(
              "profile"
            )
          }
        />
      </nav>

      <div
        style={
          dashboardStyles.watermark
        }
      >
        �"� Made by Rayva
      </div>

      {showCreate ? (
        <CreateTaskModal
          form={form}
          setForm={setForm}
          classes={classes}
          saving={saving}
          onClose={() =>
            setShowCreate(
              false
            )
          }
          onSubmit={
            createTask
          }
        />
      ) : null}

      {selectedTask ? (
        <TaskDetailModal
          task={selectedTask}
          onClose={() =>
            setSelectedTask(null)
          }
        />
      ) : null}

      {showFeedback ? (
        <FeedbackModal
          type={feedbackType}
          setType={setFeedbackType}
          message={feedbackMessage}
          setMessage={
            setFeedbackMessage
          }
          loading={
            sendingFeedback
          }
          onClose={() =>
            setShowFeedback(
              false
            )
          }
          onSubmit={
            submitFeedback
          }
        />
      ) : null}
    </div>
  );
}

/* =========================================================
   TEACHER PROFILE
========================================================= */

function TeacherProfile({
  user,
  taskCount,
  onFeedback,
  onLogout,
}) {
  return (
    <section
      style={
        dashboardStyles.profileCard
      }
    >
      <div
        style={
          dashboardStyles.profileAvatar
        }
      >
        �x�⬍�x��
      </div>

      <h1>
        {user?.fullName ||
          user?.username ||
          "Guru"}
      </h1>

      <p>
        Guru
      </p>

      <InfoRow
        label="Username"
        value={
          user?.username || "-"
        }
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
        style={
          dashboardStyles.feedbackButton
        }
      >
        <span
          style={
            dashboardStyles.feedbackIcon
          }
        >
          �x�
        </span>

        <span
          style={
            dashboardStyles.feedbackText
          }
        >
          <strong>
            Masukan / Saran
          </strong>

          <small>
            Bantu kami terus
            mengembangkan PR Reminder
          </small>
        </span>

        <span
          style={
            dashboardStyles.feedbackArrow
          }
        >
          ⬺
        </span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        style={
          dashboardStyles.logout
        }
      >
        Keluar
      </button>
    </section>
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
  const availableClasses =
    classes.length
      ? classes
      : CLASS_OPTIONS.map(
          (id) => ({
            id,
            name: id,
          })
        );

  function update(
    key,
    value
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  return (
    <div
      style={
        dashboardStyles.overlay
      }
    >
      <div
        style={
          dashboardStyles.modal
        }
      >
        <div
          style={
            dashboardStyles.modalHeader
          }
        >
          <div>
            <small
              style={
                dashboardStyles.eyebrow
              }
            >
              GURU
            </small>

            <h2>
              Buat Tugas
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={
              dashboardStyles.close
            }
          >
            �
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          style={
            dashboardStyles.form
          }
        >
          <label>
            Mata Pelajaran

            <select
              value={form.subject}
              onChange={(event) =>
                update(
                  "subject",
                  event.target
                    .value
                )
              }
              disabled={saving}
              style={
                dashboardStyles.input
              }
            >
              {SUBJECT_OPTIONS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
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
              style={
                dashboardStyles.input
              }
            />
          </label>

          <label>
            Deskripsi

            <textarea
              rows="4"
              value={
                form.description
              }
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="Masukkan deskripsi tugas"
              disabled={saving}
              style={
                dashboardStyles.textarea
              }
            />
          </label>

          <label>
            Deadline

            <input
              type="datetime-local"
              value={
                form.deadline
              }
              onChange={(event) =>
                update(
                  "deadline",
                  event.target.value
                )
              }
              disabled={saving}
              style={
                dashboardStyles.input
              }
            />
          </label>

          <label>
            Kelas Tujuan

            <select
              value={
                form.classId
              }
              onChange={(event) =>
                update(
                  "classId",
                  event.target.value
                )
              }
              disabled={saving}
              style={
                dashboardStyles.input
              }
            >
              {availableClasses.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name ||
                      item.id}
                  </option>
                )
              )}
            </select>
          </label>

          <div
            style={
              dashboardStyles.formNote
            }
          >
            Tugas akan dikirim hanya
            kepada siswa pada kelas
            yang dipilih.
          </div>

          <div
            style={
              dashboardStyles.modalActions
            }
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={
                dashboardStyles.cancel
              }
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              style={
                dashboardStyles.primary
              }
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
   FEEDBACK
========================================================= */

function FeedbackModal({
  type,
  setType,
  message,
  setMessage,
  loading,
  onClose,
  onSubmit,
}) {
  return (
    <div
      style={
        dashboardStyles.overlay
      }
    >
      <div
        style={
          dashboardStyles.feedbackModal
        }
      >
        <div
          style={
            dashboardStyles.modalHeader
          }
        >
          <div>
            <small
              style={
                dashboardStyles.eyebrow
              }
            >
              PR REMINDER
            </small>

            <h2>
              Masukan / Saran
            </h2>

            <p
              style={
                dashboardStyles.modalSubtitle
              }
            >
              Bantu kami terus
              mengembangkan aplikasi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={
              dashboardStyles.close
            }
          >
            �
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          style={
            dashboardStyles.form
          }
        >
          <label>
            Jenis Masukan
          </label>

          <div
            style={
              dashboardStyles.feedbackTypes
            }
          >
            <button
              type="button"
              onClick={() =>
                setType("saran")
              }
              style={{
                ...dashboardStyles.feedbackType,
                ...(type === "saran"
                  ? dashboardStyles.feedbackTypeActive
                  : {}),
              }}
            >
              Saran
            </button>

            <button
              type="button"
              onClick={() =>
                setType("bug")
              }
              style={{
                ...dashboardStyles.feedbackType,
                ...(type === "bug"
                  ? dashboardStyles.feedbackTypeActive
                  : {}),
              }}
            >
              Bug
            </button>

            <button
              type="button"
              onClick={() =>
                setType("fitur")
              }
              style={{
                ...dashboardStyles.feedbackType,
                ...(type === "fitur"
                  ? dashboardStyles.feedbackTypeActive
                  : {}),
              }}
            >
              Fitur Baru
            </button>
          </div>

          <label>
            Masukan Anda
          </label>

          <textarea
            rows="5"
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value
              )
            }
            placeholder="Tulis saran, kritik, atau laporan bug..."
            disabled={loading}
            style={
              dashboardStyles.textarea
            }
          />

          <div
            style={
              dashboardStyles.modalActions
            }
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={
                dashboardStyles.cancel
              }
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !message.trim()
              }
              style={
                dashboardStyles.primary
              }
            >
              {loading
                ? "Mengirim..."
                : "Kirim Masukan"}
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
    <div
      style={
        dashboardStyles.overlay
      }
    >
      <div
        style={
          dashboardStyles.modal
        }
      >
        <div
          style={
            dashboardStyles.modalHeader
          }
        >
          <div>
            <small
              style={
                dashboardStyles.eyebrow
              }
            >
              DETAIL TUGAS
            </small>

            <h2>
              {task.subject}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={
              dashboardStyles.close
            }
          >
            �
          </button>
        </div>

        <div
          style={
            dashboardStyles.detailIcon
          }
        >
          �xa
        </div>

        <h3
          style={
            dashboardStyles.detailTitle
          }
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
          value={
            formatDateTime(
              task.deadline
            )
          }
        />

        <InfoRow
          label="Jumlah Siswa"
          value={
            task.totalStudents ||
            0
          }
        />

        <InfoRow
          label="Selesai"
          value={
            task.completedStudents ||
            0
          }
          green
        />

        <InfoRow
          label="Belum Selesai"
          value={
            task.incompleteStudents ||
            0
          }
        />

        <button
          type="button"
          onClick={onClose}
          style={
            dashboardStyles.primaryWide
          }
        >
          Kembali
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function TeacherStat({
  icon,
  label,
  value,
}) {
  return (
    <div
      style={
        dashboardStyles.statCard
      }
    >
      <div
        style={
          dashboardStyles.statIcon
        }
      >
        {icon}
      </div>

      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}) {
  return (
    <div
      style={
        dashboardStyles.sectionHeader
      }
    >
      <h2>
        {title}
      </h2>

      {action ? (
        <button
          type="button"
          onClick={onAction}
          style={
            dashboardStyles.linkButton
          }
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function TeacherTaskCard({
  task,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        dashboardStyles.taskCard
      }
    >
      <div
        style={
          dashboardStyles.taskIcon
        }
      >
        �x
      </div>

      <div
        style={
          dashboardStyles.taskBody
        }
      >
        <div
          style={
            dashboardStyles.taskTop
          }
        >
          <span
            style={
              dashboardStyles.subject
            }
          >
            {task.subject}
          </span>

          <span
            style={
              dashboardStyles.taskClass
            }
          >
            {task.className ||
              task.classId ||
              "-"}
          </span>
        </div>

        <h3>
          {task.title}
        </h3>

        <p>
          {task.description}
        </p>

        <div
          style={
            dashboardStyles.taskMeta
          }
        >
          <span>
            �x&{" "}
            {formatDateTime(
              task.deadline
            )}
          </span>

          <span>
            �S&{" "}
            {task.completedStudents ||
              0}
            /
            {task.totalStudents ||
              0}
          </span>
        </div>
      </div>

      <span
        style={
          dashboardStyles.taskArrow
        }
      >
        ⬺
      </span>
    </button>
  );
}

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
      <span>
        {icon}
      </span>

      <small>
        {label}
      </small>
    </button>
  );
}

function InfoRow({
  label,
  value,
  green = false,
}) {
  return (
    <div
      style={
        dashboardStyles.infoRow
      }
    >
      <span>
        {label}
      </span>

      <strong
        style={{
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

function EmptyTeacher() {
  return (
    <div
      style={
        dashboardStyles.empty
      }
    >
      <div
        style={
          dashboardStyles.emptyIcon
        }
      >
        �xa
      </div>

      <h3>
        Belum ada tugas
      </h3>

      <p>
        Buat tugas pertama untuk
        siswa Anda.
      </p>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
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
    padding: 20,
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(145deg,#eef5ff,#fff,#f1f7ff)",
    fontFamily:
      'Inter,system-ui,sans-serif',
  },

  blobOne: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: "50%",
    top: -170,
    left: -140,
    background:
      "rgba(84,161,233,.10)",
  },

  blobTwo: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "50%",
    right: -180,
    bottom: -180,
    background:
      "rgba(84,161,233,.08)",
  },

  card: {
    position: "relative",
    zIndex: 2,
    width: "min(430px,100%)",
    padding: 28,
    border:
      "1px solid #dceaf6",
    borderRadius: 24,
    background: "#fff",
    boxShadow:
      "0 25px 70px rgba(44,105,158,.13)",
  },

  back: {
    border:
      "1px solid #d5e4ef",
    borderRadius: 9,
    padding: "8px 11px",
    background: "#fff",
    color: "#2b75af",
    fontSize: 12,
    fontWeight: 800,
  },

  icon: {
    width: 58,
    height: 58,
    margin:
      "18px auto 12px",
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
    margin:
      "5px 0 5px",
    textAlign: "center",
    color: "#1d2f50",
    fontSize: 27,
  },

  subtitle: {
    margin:
      "0 0 23px",
    textAlign: "center",
    color: "#7c8da3",
    fontSize: 12,
  },

  form: {
    display: "grid",
    gap: 7,
  },

  label: {
    color: "#334b68",
    fontSize: 11,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border:
      "1px solid #d2e2ef",
    borderRadius: 11,
    outline: "none",
    background: "#fbfdff",
    color: "#1d3857",
    fontSize: 13,
  },

  passwordWrap: {
    position: "relative",
  },

  showPassword: {
    position: "absolute",
    right: 9,
    top: "50%",
    transform:
      "translateY(-50%)",
    border: "none",
    background:
      "transparent",
    color: "#2c7fc2",
    fontSize: 10,
    fontWeight: 800,
  },

  error: {
    marginTop: 7,
    padding: "9px 11px",
    border:
      "1px solid #f2cccc",
    borderRadius: 9,
    background: "#fff5f5",
    color: "#c44747",
    fontSize: 11,
    fontWeight: 700,
  },

  submit: {
    width: "100%",
    minHeight: 46,
    marginTop: 7,
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
========================================================= */

const dashboardStyles = {
  page: {
    minHeight: "100vh",
    paddingBottom: 88,
    background:
      "linear-gradient(180deg,#f2f8ff,#fff)",
    color: "#173d68",
    fontFamily:
      'Inter,system-ui,sans-serif',
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    height: 64,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding: "0 17px",
    background:
      "linear-gradient(135deg,#147df1,#2788ee)",
    boxShadow:
      "0 8px 20px rgba(29,116,210,.17)",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  logo: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 900,
  },

  headerSub: {
    marginTop: 2,
    color:
      "rgba(255,255,255,.82)",
    fontSize: 9,
  },

  backButton: {
    width: 38,
    height: 38,
    border: "none",
    borderRadius: 10,
    background:
      "rgba(255,255,255,.15)",
    color: "#fff",
    fontSize: 20,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
  },

  headerUser: {
    width: 38,
    height: 38,
    border: "none",
    borderRadius: 10,
    background:
      "rgba(255,255,255,.15)",
    color: "#fff",
    fontSize: 18,
  },

  main: {
    width:
      "min(760px,100%)",
    margin: "0 auto",
    padding: 15,
  },

  welcome: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 15,
    padding: 18,
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#fff,#edf7ff)",
    border:
      "1px solid #dcecf8",
  },

  eyebrow: {
    color: "#2c88d8",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  'welcome h1': {
    margin: "5px 0 4px",
    color: "#183f69",
    fontSize: 22,
  },

  'welcome p': {
    margin: 0,
    color: "#8193a5",
    fontSize: 11,
  },

  avatar: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#dceeff",
    fontSize: 28,
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 9,
    marginTop: 12,
  },

  statCard: {
    minHeight: 105,
    padding: 11,
    borderRadius: 15,
    background: "#fff",
    border:
      "1px solid #e0ebf5",
  },

  statIcon: {
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#edf6ff",
    fontSize: 16,
    marginBottom: 7,
  },

  sectionHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    margin:
      "23px 0 11px",
  },

  'sectionHeader h2': {
    margin: 0,
    fontSize: 18,
  },

  linkButton: {
    border: "none",
    background:
      "transparent",
    color: "#237fd0",
    fontSize: 10,
    fontWeight: 900,
  },

  pageHeading: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 15,
  },

  'pageHeading h1': {
    margin: 0,
    fontSize: 22,
  },

  'pageHeading p': {
    margin:
      "5px 0 0",
    color: "#8295a7",
    fontSize: 11,
  },

  createButton: {
    border: "none",
    borderRadius: 10,
    padding:
      "10px 13px",
    background:
      "linear-gradient(135deg,#2185ee,#2275d5)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
  },

  taskList: {
    display: "grid",
    gap: 10,
  },

  taskCard: {
    width: "100%",
    display: "grid",
    gridTemplateColumns:
      "42px 1fr 15px",
    gap: 10,
    padding: 12,
    textAlign: "left",
    border:
      "1px solid #deebf5",
    borderRadius: 15,
    background: "#fff",
  },

  taskIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#edf6ff",
    fontSize: 18,
  },

  taskBody: {
    minWidth: 0,
  },

  taskTop: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 8,
  },

  subject: {
    padding: "4px 7px",
    borderRadius: 6,
    background: "#eaf5ff",
    color: "#267fc9",
    fontSize: 9,
    fontWeight: 900,
  },

  taskClass: {
    color: "#8798a8",
    fontSize: 9,
  },

  taskMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
    color: "#8396a8",
    fontSize: 9,
  },

  taskArrow: {
    alignSelf: "center",
    color: "#9aa9b7",
    fontSize: 22,
  },

  classGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 10,
  },

  classCard: {
    padding: 15,
    borderRadius: 15,
    background: "#fff",
    border:
      "1px solid #e0ebf5",
  },

  classIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#edf6ff",
    marginBottom: 8,
  },

  profileCard: {
    padding: 21,
    borderRadius: 20,
    background: "#fff",
    border:
      "1px solid #dfeaf4",
    textAlign: "center",
  },

  profileAvatar: {
    width: 76,
    height: 76,
    display: "grid",
    placeItems: "center",
    margin:
      "0 auto 12px",
    borderRadius: 22,
    background: "#dceeff",
    fontSize: 35,
  },

  infoRow: {
    display: "flex",
    justifyContent:
      "space-between",
    padding:
      "11px 12px",
    marginTop: 7,
    borderRadius: 10,
    background: "#f7fbff",
    textAlign: "left",
    fontSize: 10,
  },

  feedbackButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
    padding: 12,
    border:
      "1px solid #d8e8f4",
    borderRadius: 12,
    background:
      "linear-gradient(180deg,#fbfdff,#f2f8fd)",
    textAlign: "left",
  },

  feedbackIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: 10,
    background: "#eaf5ff",
  },

  feedbackText: {
    flex: 1,
  },

  feedbackArrow: {
    color: "#6f899f",
    fontSize: 22,
  },

  logout: {
    width: "100%",
    minHeight: 44,
    marginTop: 13,
    border: "none",
    borderRadius: 10,
    background: "#fff0f1",
    color: "#dc5059",
    fontWeight: 900,
  },

  navigation: {
    position: "fixed",
    left: "50%",
    bottom: 0,
    transform:
      "translateX(-50%)",
    zIndex: 70,
    width:
      "min(760px,100%)",
    minHeight: 67,
    display: "grid",
    gridTemplateColumns:
      "repeat(4,1fr)",
    padding:
      "6px 8px calc(6px + env(safe-area-inset-bottom))",
    background:
      "rgba(255,255,255,.97)",
    borderTop:
      "1px solid #dfeaf3",
  },

  nav: {
    border: "none",
    background:
      "transparent",
    color: "#98a8b7",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    gap: 3,
  },

  navActive: {
    color: "#197ef0",
  },

  watermark: {
    position: "fixed",
    left: "50%",
    bottom: 70,
    transform:
      "translateX(-50%)",
    color: "#a1b1c0",
    fontSize: 10,
    zIndex: 71,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    background:
      "rgba(15,43,68,.5)",
  },

  modal: {
    width:
      "min(600px,100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    padding: 20,
    borderRadius:
      "22px 22px 0 0",
    background: "#fff",
  },

  feedbackModal: {
    width:
      "min(460px,100%)",
    padding: 20,
    borderRadius:
      "22px 22px 0 0",
    background: "#fff",
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },

  modalSubtitle: {
    margin:
      "5px 0 0",
    color: "#8193a5",
    fontSize: 11,
  },

  close: {
    width: 35,
    height: 35,
    border: "none",
    borderRadius: 10,
    background: "#f2f5f8",
    color: "#708499",
    fontSize: 21,
  },

  form: {
    display: "grid",
    gap: 10,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 5,
    padding: "11px 12px",
    border:
      "1px solid #d2e2ef",
    borderRadius: 10,
    background: "#fbfdff",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 5,
    padding: "11px 12px",
    border:
      "1px solid #d2e2ef",
    borderRadius: 10,
    background: "#fbfdff",
    outline: "none",
    resize: "vertical",
  },

  formNote: {
    padding: 10,
    borderRadius: 9,
    background: "#edf7ff",
    color: "#4a81aa",
    fontSize: 10,
  },

  modalActions: {
    display: "flex",
    gap: 8,
    marginTop: 5,
  },

  cancel: {
    flex: 1,
    minHeight: 43,
    border:
      "1px solid #d8e3eb",
    borderRadius: 10,
    background: "#fff",
  },

  primary: {
    flex: 1,
    minHeight: 43,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#3e73e2,#4278e7)",
    color: "#fff",
    fontWeight: 900,
  },

  feedbackTypes: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 7,
  },

  feedbackType: {
    minHeight: 38,
    border:
      "1px solid #d9e5ee",
    borderRadius: 9,
    background: "#fff",
    color: "#6f8294",
  },

  feedbackTypeActive: {
    border:
      "2px solid #3d70df",
    background: "#eef4ff",
    color: "#3564c6",
    fontWeight: 900,
  },

  detailIcon: {
    width: 64,
    height: 64,
    margin:
      "5px auto 12px",
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#edf6ff",
    fontSize: 29,
  },

  detailTitle: {
    textAlign: "center",
  },

  detailDescription: {
    color: "#74899d",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 1.6,
  },

  primaryWide: {
    width: "100%",
    minHeight: 44,
    marginTop: 15,
    border: "none",
    borderRadius: 10,
    background: "#197ef0",
    color: "#fff",
    fontWeight: 900,
  },

  empty: {
    padding: 35,
    textAlign: "center",
    border:
      "1px dashed #cadce8",
    borderRadius: 15,
    background: "#fbfdff",
  },

  emptyIcon: {
    fontSize: 35,
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
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
};
