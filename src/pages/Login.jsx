import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

export default function Login({
  onLogin,
  onRegister,
  onGuruLogin,
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

  function showError(message) {
    setErrorMessage(message);
  }

  function clearError() {
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    clearError();

    const cleanUsername =
      username.trim();

    if (!cleanUsername) {
      showError(
        "Username harus diisi."
      );
      return;
    }

    if (!password) {
      showError(
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
            username: cleanUsername,
            password,
            role: "siswa",
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
        showError(
          data.message ||
            "Username atau password salah."
        );
        return;
      }

      if (
        !data.token ||
        !data.user
      ) {
        showError(
          "Data login dari server tidak lengkap."
        );
        return;
      }

      /*
        SIMPAN SESI
        Pengguna tidak perlu login ulang
        selama token masih valid.
      */
      localStorage.setItem(
        "prReminderToken",
        data.token
      );

      localStorage.setItem(
        "prReminderUser",
        JSON.stringify(data.user)
      );

      onLogin(data.user);
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      showError(
        "Server PR Reminder tidak dapat dihubungi."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleUsernameChange(
    event
  ) {
    setUsername(
      event.target.value
    );

    if (errorMessage) {
      clearError();
    }
  }

  function handlePasswordChange(
    event
  ) {
    setPassword(
      event.target.value
    );

    if (errorMessage) {
      clearError();
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "linear-gradient(145deg, #eef5ff 0%, #ffffff 50%, #f1f7ff 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {/* dekorasi kiri atas */}
      <div
        style={{
          position: "absolute",
          width: 330,
          height: 330,
          borderRadius: "50%",
          background:
            "rgba(84, 161, 233, 0.10)",
          top: -170,
          left: -140,
        }}
      />

      {/* dekorasi kanan bawah */}
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "rgba(84, 161, 233, 0.08)",
          right: -180,
          bottom: -180,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#ffffff",
          border:
            "1px solid #dceaf6",
          borderRadius: 24,
          padding: 28,
          boxShadow:
            "0 25px 70px rgba(44, 105, 158, 0.13)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* TOMBOL BACK */}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          style={{
            border:
              "1px solid #d5e4ef",
            borderRadius: 9,
            padding:
              "8px 11px",
            background: "#ffffff",
            color: "#2b75af",
            fontSize: 12,
            fontWeight: 800,
            cursor: loading
              ? "not-allowed"
              : "pointer",
            marginBottom: 18,
          }}
        >
          ← Kembali
        </button>

        {/* ICON */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 17,
            margin:
              "0 auto 14px",
            display: "grid",
            placeItems: "center",
            background:
              "linear-gradient(135deg, #e8f4ff, #dceeff)",
            color: "#3e72df",
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          ✓
        </div>

        {/* JUDUL */}
        <h1
          style={{
            margin: 0,
            textAlign: "center",
            color: "#1d2f50",
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          PR Reminder
        </h1>

        <p
          style={{
            margin:
              "8px 0 24px",
            textAlign: "center",
            color: "#7c8da3",
            fontSize: 13,
          }}
        >
          Selamat datang kembali 👋
        </p>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          <label
            style={{
              color: "#334b68",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Username
          </label>

          <input
            value={username}
            onChange={
              handleUsernameChange
            }
            placeholder="Masukkan username"
            autoComplete="username"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding:
                "12px 13px",
              border:
                "1px solid #d2e2ef",
              borderRadius: 11,
              outline: "none",
              color: "#1d3857",
              background: "#fbfdff",
              fontSize: 13,
            }}
          />

          <label
            style={{
              color: "#334b68",
              fontSize: 12,
              fontWeight: 800,
              marginTop: 8,
            }}
          >
            Password
          </label>

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
              onChange={
                handlePasswordChange
              }
              placeholder="Masukkan password"
              autoComplete="current-password"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 72px 12px 13px",
                border:
                  "1px solid #d2e2ef",
                borderRadius: 11,
                outline: "none",
                color: "#1d3857",
                background: "#fbfdff",
                fontSize: 13,
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
                cursor: "pointer",
              }}
            >
              {showPassword
                ? "Sembunyikan"
                : "Lihat"}
            </button>
          </div>

          {/* NOTIFIKASI ERROR */}
          {errorMessage ? (
            <div
              style={{
                marginTop: 7,
                marginBottom: 1,
                padding:
                  "9px 11px",
                border:
                  "1px solid #f2cccc",
                borderRadius: 9,
                background: "#fff5f5",
                color: "#c44747",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.45,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  marginRight: 5,
                }}
              >
                ⚠
              </span>

              {errorMessage}
            </div>
          ) : null}

          {/* TOMBOL MASUK */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 46,
              marginTop: 5,
              border: "none",
              borderRadius: 11,
              background:
                "linear-gradient(135deg, #3b6fe5, #4275e7)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              boxShadow:
                "0 10px 24px rgba(62, 111, 224, 0.22)",
              opacity: loading
                ? 0.7
                : 1,
            }}
          >
            {loading
              ? "Memeriksa..."
              : "Masuk"}
          </button>
        </form>

        {/* DAFTAR */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "center",
            alignItems: "center",
            gap: 5,
            marginTop: 18,
            color: "#7b8da1",
            fontSize: 12,
          }}
        >
          <span>
            Belum punya akun?
          </span>

          <button
            type="button"
            onClick={onRegister}
            disabled={loading}
            style={{
              border: "none",
              background:
                "transparent",
              padding: 0,
              color: "#267bc1",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Daftar
          </button>
        </div>

        {/* LOGIN GURU */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 15,
            borderTop:
              "1px solid #edf1f5",
            textAlign: "center",
            color: "#75879a",
            fontSize: 12,
          }}
        >
          <span>
            Anda Guru?
          </span>{" "}
          <button
            type="button"
            onClick={onGuruLogin}
            disabled={loading}
            style={{
              border: "none",
              background:
                "transparent",
              padding: 0,
              color: "#287fc4",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Login di sini →
          </button>
        </div>

        {/* WATERMARK */}
        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            color: "#a0afbd",
            fontSize: 10,
          }}
        >
          ♥ Made by Rayva
        </div>
      </div>
    </div>
  );
}