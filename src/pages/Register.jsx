import { useState } from "react";

const API =
  import.meta.env.VITE_API_URL ||
  "https://pr-reminder-tau.vercel.app";

const CLASSES = [
  {
    grade: "7",
    title: "Kelas 7",
    items: ["7A", "7B", "7C", "7D"],
  },
  {
    grade: "8",
    title: "Kelas 8",
    items: ["8A", "8B", "8C", "8D"],
  },
  {
    grade: "9",
    title: "Kelas 9",
    items: ["9A", "9B", "9C", "9D"],
  },
];

export default function Register({
  onRegistered,
  onBack,
}) {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [selectedClass, setSelectedClass] =
    useState("");

  const [loading, setLoading] = useState(false);

  function goToClassPage(event) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanUsername = username.trim();

    if (!cleanName) {
      alert("Nama lengkap harus diisi.");
      return;
    }

    if (cleanName.length < 2) {
      alert("Nama lengkap terlalu pendek.");
      return;
    }

    if (!cleanUsername) {
      alert("Username harus diisi.");
      return;
    }

    if (cleanUsername.length < 3) {
      alert("Username minimal 3 karakter.");
      return;
    }

    if (!password) {
      alert("Password harus diisi.");
      return;
    }

    if (password.length < 6) {
      alert("Password minimal 6 karakter.");
      return;
    }

    setStep(2);
  }

  function backToAccountPage() {
    if (loading) {
      return;
    }

    setStep(1);
  }

  async function submitRegistration() {
    if (!selectedClass) {
      alert("Silakan pilih kelas terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API}/api/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: name.trim(),
            username: username.trim(),
            password,
            classId: selectedClass,
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
        alert(
          data.message ||
            "Pendaftaran akun gagal."
        );
        return;
      }

      localStorage.setItem(
        "prReminderToken",
        data.token
      );

      localStorage.setItem(
        "prReminderUser",
        JSON.stringify(data.user)
      );

      alert(
        "Akun siswa berhasil dibuat."
      );

      onRegistered(data.user);
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      alert(
        "Server tidak dapat dihubungi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card register-card">

        {step === 1 ? (
          <>
            <button
              type="button"
              className="back-link"
              onClick={onBack}
            >
              ← Kembali
            </button>

            <div className="auth-icon">
              ✓
            </div>

            <h1>
              Buat Akun Siswa
            </h1>

            <p className="auth-subtitle">
              Daftarkan akun untuk menerima
              tugas dari guru.
            </p>

            <form
              className="auth-form"
              onSubmit={goToClassPage}
            >
              <label>
                Nama Lengkap
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Masukkan nama lengkap"
                autoComplete="name"
              />

              <label>
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="Buat username"
                autoComplete="username"
              />

              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />

              <button
                type="submit"
                className="primary-btn wide"
              >
                Lanjut
              </button>
            </form>

            <div className="auth-links">
              Sudah punya akun?{" "}
              <button
                type="button"
                onClick={onBack}
              >
                Masuk
              </button>
            </div>

            <div className="watermark">
              ♥ Made by Rayva
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="back-link"
              onClick={backToAccountPage}
              disabled={loading}
            >
              ← Kembali
            </button>

            <div className="auth-icon">
              ✓
            </div>

            <h1>
              Pilih Kelas
            </h1>

            <p className="auth-subtitle">
              Pilih kelas tempat kamu belajar.
            </p>

            <div
              style={{
                marginTop: 22,
              }}
            >
              {CLASSES.map((group) => (
                <div
                  key={group.grade}
                  style={{
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#183b63",
                      marginBottom: 10,
                    }}
                  >
                    {group.title}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, 1fr)",
                      gap: 10,
                    }}
                  >
                    {group.items.map(
                      (classId) => {
                        const selected =
                          selectedClass ===
                          classId;

                        return (
                          <button
                            type="button"
                            key={classId}
                            disabled={loading}
                            onClick={() =>
                              setSelectedClass(
                                classId
                              )
                            }
                            style={{
                              width: "100%",
                              minHeight: 52,
                              border: selected
                                ? "2px solid #2989df"
                                : "1px solid #d6e5f3",
                              borderRadius: 12,
                              background:
                                selected
                                  ? "#eaf5ff"
                                  : "#ffffff",
                              color: selected
                                ? "#1976c9"
                                : "#36536e",
                              fontSize: 15,
                              fontWeight: 800,
                              cursor:
                                loading
                                  ? "not-allowed"
                                  : "pointer",
                              transition:
                                "0.2s ease",
                              boxShadow: selected
                                ? "0 4px 12px rgba(41,137,223,0.15)"
                                : "none",
                            }}
                          >
                            {classId}

                            {selected ? (
                              <span
                                style={{
                                  marginLeft: 7,
                                }}
                              >
                                ✓
                              </span>
                            ) : null}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedClass ? (
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 16,
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#eff8ff",
                  border:
                    "1px solid #cce7fb",
                  color: "#1667a8",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Kelas yang dipilih:{" "}
                <strong>
                  {selectedClass}
                </strong>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 16,
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#f8fafc",
                  border:
                    "1px solid #e5e7eb",
                  color: "#718096",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Silakan pilih salah satu
                kelas.
              </div>
            )}

            <button
              type="button"
              className="primary-btn wide"
              disabled={
                loading || !selectedClass
              }
              onClick={submitRegistration}
            >
              {loading
                ? "Membuat akun..."
                : "Daftar Sekarang"}
            </button>

            <div className="watermark">
              ♥ Made by Rayva
            </div>
          </>
        )}
      </div>
    </div>
  );
}