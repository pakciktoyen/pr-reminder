import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Guru from "./pages/Guru.jsx";
import Siswa from "./pages/Siswa.jsx";
import Admin from "./pages/Admin.jsx";
import OwnerLogin from "./pages/OwnerLogin.jsx";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://pr-reminder-tau.vercel.app";

const OWNER_PATH = "/owner-panel-9f3a";

export default function App() {
  const [page, setPage] = useState("loading");
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const path = window.location.pathname;

    if (path === OWNER_PATH) {
      await restoreAdminSession();
      return;
    }

    const token = localStorage.getItem("prReminderToken");
    const savedUser = localStorage.getItem("prReminderUser");

    if (!token) {
      setPage("home");
      return;
    }

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        if (parsedUser && parsedUser.role) {
          setUser(parsedUser);

          if (parsedUser.role === "guru") {
            setPage("guru");
          } else if (parsedUser.role === "siswa") {
            setPage("siswa");
          }
        }
      } catch {
        localStorage.removeItem("prReminderUser");
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Sesi tidak valid."
        );
      }

      localStorage.setItem(
        "prReminderUser",
        JSON.stringify(data.user)
      );

      setUser(data.user);

      if (data.user.role === "guru") {
        setPage("guru");
      } else if (data.user.role === "siswa") {
        setPage("siswa");
      } else {
        clearUserSession();
      }
    } catch (error) {
      console.error(
        "RESTORE USER SESSION:",
        error
      );

      clearUserSession();
    }
  }

  async function restoreAdminSession() {
    const token =
      localStorage.getItem(
        "prReminderAdminToken"
      );

    if (!token) {
      setPage("owner-login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Sesi Admin tidak valid."
        );
      }

      localStorage.setItem(
        "prReminderAdmin",
        JSON.stringify(data.admin)
      );

      setAdmin(data.admin);
      setPage("admin");
    } catch (error) {
      console.error(
        "RESTORE ADMIN SESSION:",
        error
      );

      clearAdminSession();
    }
  }

  function clearUserSession() {
    localStorage.removeItem(
      "prReminderToken"
    );

    localStorage.removeItem(
      "prReminderUser"
    );

    setUser(null);
    setPage("home");
  }

  function clearAdminSession() {
    localStorage.removeItem(
      "prReminderAdminToken"
    );

    localStorage.removeItem(
      "prReminderAdmin"
    );

    setAdmin(null);
    setPage("owner-login");
  }

  function handleUserLogin(loggedUser) {
    setUser(loggedUser);

    if (loggedUser.role === "guru") {
      setPage("guru");
    } else {
      setPage("siswa");
    }
  }

  function handleAdminLogin(loggedAdmin) {
    setAdmin(loggedAdmin);
    setPage("admin");
  }

  function handleLogout() {
    clearUserSession();
  }

  function handleAdminLogout() {
    clearAdminSession();

    window.history.replaceState(
      {},
      "",
      "/"
    );
  }

  function goHome() {
    setPage("home");
  }

  if (page === "loading") {
    return (
      <div className="app-loading">
        <div className="brand-mark">
          ✓
        </div>

        <h2>PR Reminder</h2>

        <p>Memeriksa sesi...</p>

        <div className="watermark">
          ♥ Made by Rayva
        </div>
      </div>
    );
  }

  if (page === "home") {
    return (
      <Home
        onLogin={() =>
          setPage("login")
        }
        onRegister={() =>
          setPage("register")
        }
      />
    );
  }

  if (page === "login") {
    return (
      <Login
        onLogin={handleUserLogin}
        onRegister={() =>
          setPage("register")
        }
        onGuruLogin={() =>
          setPage("guru-login")
        }
        onBack={goHome}
      />
    );
  }

  if (page === "register") {
    return (
      <Register
        onRegistered={handleUserLogin}
        onBack={() =>
          setPage("login")
        }
      />
    );
  }

  if (page === "guru-login") {
    return (
      <Guru
        loginOnly
        onLogin={handleUserLogin}
        onBack={() =>
          setPage("login")
        }
      />
    );
  }

  if (page === "guru") {
    return (
      <Guru
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (page === "siswa") {
    return (
      <Siswa
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (page === "owner-login") {
    return (
      <OwnerLogin
        onLogin={handleAdminLogin}
      />
    );
  }

  if (page === "admin") {
    return (
      <Admin
        admin={admin}
        onLogout={handleAdminLogout}
      />
    );
  }

  return null;
}

function Home({
  onLogin,
  onRegister,
}) {
  return (
    <div className="home-page">
      <div className="blob a" />
      <div className="blob b" />

      <main className="home-card">
        <div className="hero-art">
          <div className="calendar-art">
            <b>✓</b>
          </div>

          <div className="book-art" />
          <div className="clock-art" />

          <div className="bell-art">
            🔔
          </div>
        </div>

        <span className="brand-pill">
          BELAJAR • TUGAS • MASA DEPAN
        </span>

        <h1>PR Reminder</h1>

        <p className="tagline">
          Jangan Lupa, Raih Masa Depan
        </p>

        <p className="hero-copy">
          Satu tempat untuk menerima
          tugas, mengingat deadline,
          dan menyelesaikan PR tepat
          waktu.
        </p>

        <div className="home-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={onLogin}
          >
            Masuk
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={onRegister}
          >
            Daftar
          </button>
        </div>

        <div className="home-feature-row">
          <span>✓ Sesuai kelas</span>
          <span>◷ Deadline</span>
          <span>✓ Status selesai</span>
        </div>

        <div className="watermark">
          ♥ Made by Rayva
        </div>
      </main>
    </div>
  );
}