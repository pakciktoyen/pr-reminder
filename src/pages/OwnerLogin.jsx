import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://pr-reminder-tau.vercel.app";

export default function OwnerLogin({
  onLogin,
}) {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanUsername =
      username.trim();

    if (!cleanUsername) {
      alert("Username Owner harus diisi.");
      return;
    }

    if (!password) {
      alert("Password Owner harus diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username: cleanUsername,
            password,
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
            "Login Owner gagal."
        );
        return;
      }

      if (!data.token || !data.admin) {
        alert(
          "Respons login Owner tidak lengkap."
        );
        return;
      }

      localStorage.setItem(
        "prReminderAdminToken",
        data.token
      );

      localStorage.setItem(
        "prReminderAdmin",
        JSON.stringify(data.admin)
      );

      onLogin(data.admin);
    } catch (error) {
      console.error(
        "OWNER LOGIN ERROR:",
        error
      );

      alert(
        "Server PR Reminder tidak dapat dihubungi."
      );
    } finally {
      setLoading(false);
    }
  }

  function goHome() {
    window.history.replaceState(
      {},
      "",
      "/"
    );

    window.location.reload();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #eef6ff 0%, #f8fbff 50%, #eef5ff 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background:
            "rgba(59, 130, 246, 0.08)",
          top: -100,
          left: -80,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "rgba(37, 99, 235, 0.06)",
          bottom: -150,
          right: -100,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#ffffff",
          borderRadius: 22,
          padding: 30,
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
          boxShadow:
            "0 24px 70px rgba(30, 64, 175, 0.14)",
          border:
            "1px solid rgba(59,130,246,0.12)",
        }}
      >
        <button
          type="button"
          onClick={goHome}
          disabled={loading}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            color: "#2785d3",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 25,
          }}
        >
          ← Kembali
        </button>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            margin:
              "0 auto 18px",
            display: "grid",
            placeItems: "center",
            background:
              "linear-gradient(135deg, #e8f4ff, #dbeeff)",
            color: "#2584d7",
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          🔐
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              color: "#2a87d6",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "1.4px",
              marginBottom: 7,
            }}
          >
            PRIVATE ACCESS
          </div>

          <h1
            style={{
              margin: 0,
              color: "#173b62",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            Owner / Admin
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#718096",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Halaman khusus pengelola
            PR Reminder.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 7,
              color: "#36536e",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Username Owner

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="Masukkan username Owner"
              autoComplete="username"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "13px 14px",
                border:
                  "1px solid #cfe0ee",
                borderRadius: 11,
                outline: "none",
                fontSize: 14,
                color: "#173b62",
                background: "#fbfdff",
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 7,
              color: "#36536e",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Password

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Masukkan password Owner"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "13px 92px 13px 14px",
                  border:
                    "1px solid #cfe0ee",
                  borderRadius: 11,
                  outline: "none",
                  fontSize: 14,
                  color: "#173b62",
                  background: "#fbfdff",
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
                disabled={loading}
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
                  color: "#2584d7",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {showPassword
                  ? "Sembunyikan"
                  : "Lihat"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              border: "none",
              borderRadius: 11,
              padding:
                "13px 16px",
              background:
                "linear-gradient(135deg, #2588dc, #2276c8)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 14,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              boxShadow:
                "0 10px 22px rgba(37,136,220,0.22)",
              opacity: loading
                ? 0.7
                : 1,
            }}
          >
            {loading
              ? "Memeriksa..."
              : "Masuk ke Dashboard"}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            padding: 12,
            borderRadius: 10,
            background: "#f4f9fe",
            border:
              "1px solid #e0edf8",
            color: "#64809a",
            fontSize: 12,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          Halaman ini khusus Owner /
          Admin dan tidak ditampilkan
          pada login siswa.
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            color: "#a0aec0",
            fontSize: 12,
          }}
        >
          ♥ Made by Rayva
        </div>
      </div>
    </div>
  );
}