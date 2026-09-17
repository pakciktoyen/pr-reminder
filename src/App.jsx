import { useEffect, useState } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Guru from "./pages/Guru.jsx";
import Siswa from "./pages/Siswa.jsx";
import Admin from "./pages/Admin.jsx";
import OwnerLogin from "./pages/OwnerLogin.jsx";
import "./App.css";

/*
  ==========================================================
  PRODUCTION API
  ==========================================================
*/

const API_URL =
  "https://pr-reminder-tau.vercel.app";

/*
  ==========================================================
  OWNER PATH
  ==========================================================
*/

const OWNER_PATH =
  "/owner-panel-9f3a";

/*
  ==========================================================
  NOTIFICATION CHANNEL
  ==========================================================
*/

const NOTIFICATION_CHANNEL_ID =
  "pr_reminder_v3";

let pushListenersReady = false;

/*
  ==========================================================
  SETUP PUSH NOTIFICATIONS
  SISWA ONLY
  ==========================================================
*/

async function setupPushNotifications(user) {
  if (!user) {
    return;
  }

  if (user.role !== "siswa") {
    return;
  }

  try {
    /*
      ------------------------------------------------------
      PUSH PERMISSION
      ------------------------------------------------------
    */

    const pushPermission =
      await PushNotifications.checkPermissions();

    let receivePermission =
      pushPermission.receive;

    if (receivePermission !== "granted") {
      const requested =
        await PushNotifications.requestPermissions();

      receivePermission =
        requested.receive;
    }

    if (receivePermission !== "granted") {
      console.warn(
        "Izin notifikasi belum diberikan."
      );

      return;
    }

    /*
      ------------------------------------------------------
      LOCAL NOTIFICATION PERMISSION
      ------------------------------------------------------
    */

    try {
      const localPermission =
        await LocalNotifications.checkPermissions();

      if (
        localPermission.display !==
        "granted"
      ) {
        await LocalNotifications.requestPermissions();
      }
    } catch (error) {
      console.warn(
        "LOCAL NOTIFICATION PERMISSION:",
        error
      );
    }

    /*
      ------------------------------------------------------
      ANDROID CHANNEL
      ------------------------------------------------------
    */

    try {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,

        name: "PR Reminder",

        description:
          "Notifikasi tugas baru dari guru",

        importance: 5,

        visibility: 1,

        sound:
          "pr_reminder_notification",

        vibration: true,

        lights: true,
      });
    } catch (error) {
      console.warn(
        "CREATE NOTIFICATION CHANNEL:",
        error
      );
    }

    /*
      ------------------------------------------------------
      LISTENER HANYA SEKALI
      ------------------------------------------------------
    */

    if (!pushListenersReady) {
      pushListenersReady = true;

      /*
        ====================================================
        FCM REGISTRATION
        ====================================================
      */

      await PushNotifications.addListener(
        "registration",
        async (token) => {
          console.log(
            "FCM TOKEN:",
            token.value
          );

          const authToken =
            localStorage.getItem(
              "prReminderToken"
            );

          if (!authToken) {
            console.warn(
              "Token login tidak ditemukan."
            );

            return;
          }

          try {
            const response =
              await fetch(
                `${API_URL}/api/push/register-token`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",

                    Authorization:
                      `Bearer ${authToken}`,
                  },

                  body: JSON.stringify({
                    token: token.value,

                    platform: "android",
                  }),
                }
              );

            const data =
              await response.json();

            console.log(
              "PUSH TOKEN REGISTER:",
              data
            );
          } catch (error) {
            console.error(
              "REGISTER PUSH TOKEN:",
              error
            );
          }
        }
      );

      /*
        ====================================================
        FCM REGISTRATION ERROR
        ====================================================
      */

      await PushNotifications.addListener(
        "registrationError",
        (error) => {
          console.error(
            "FCM REGISTRATION ERROR:",
            error
          );
        }
      );

      /*
        ====================================================
        PUSH SAAT APP SEDANG TERBUKA
        ====================================================
      */

      await PushNotifications.addListener(
        "pushNotificationReceived",
        async (notification) => {
          console.log(
            "PUSH RECEIVED:",
            notification
          );

          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id:
                    Math.floor(
                      Date.now() %
                        2147483647
                    ),

                  title:
                    notification.title ||
                    "Tugas Baru!",

                  body:
                    notification.body ||
                    "Ada tugas baru dari guru.",

                  channelId:
                    NOTIFICATION_CHANNEL_ID,

                  sound:
                    "pr_reminder_notification",

                  schedule: {
                    at: new Date(
                      Date.now() + 500
                    ),
                  },

                  extra:
                    notification.data ||
                    {},
                },
              ],
            });

            console.log(
              "LOCAL NOTIFICATION BERHASIL"
            );
          } catch (error) {
            console.error(
              "LOCAL NOTIFICATION ERROR:",
              error
            );
          }
        }
      );

      /*
        ====================================================
        SAAT USER MENEKAN NOTIFIKASI
        ====================================================
      */

      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (event) => {
          console.log(
            "PUSH ACTION:",
            event
          );
        }
      );
    }

    /*
      ------------------------------------------------------
      REGISTER FCM
      ------------------------------------------------------
    */

    await PushNotifications.register();

    console.log(
      "FCM REGISTER REQUESTED"
    );
  } catch (error) {
    console.error(
      "SETUP PUSH ERROR:",
      error
    );
  }
}

/*
  ==========================================================
  APP
  ==========================================================
*/

export default function App() {
  const [page, setPage] =
    useState("loading");

  const [user, setUser] =
    useState(null);

  const [admin, setAdmin] =
    useState(null);

  /*
    Memaksa dashboard siswa
    dimuat ulang setelah push.
  */

  const [
    studentRefreshKey,
    setStudentRefreshKey,
  ] = useState(0);

  /*
    ========================================================
    INITIAL SESSION
    ========================================================
  */

  useEffect(() => {
    restoreSession();
  }, []);

  /*
    ========================================================
    APP KEMBALI AKTIF
    ========================================================
  */

  useEffect(() => {
    const handleVisibility =
      async () => {
        if (
          document.visibilityState ===
            "visible" &&
          user?.role === "siswa"
        ) {
          await setupPushNotifications(
            user
          );

          setStudentRefreshKey(
            (value) => value + 1
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [user]);

  /*
    ========================================================
    RESTORE USER SESSION
    ========================================================
  */

  async function restoreSession() {
    const path =
      window.location.pathname;

    /*
      OWNER / ADMIN
    */

    if (path === OWNER_PATH) {
      await restoreAdminSession();

      return;
    }

    /*
      USER
    */

    const token =
      localStorage.getItem(
        "prReminderToken"
      );

    const savedUser =
      localStorage.getItem(
        "prReminderUser"
      );

    /*
      Tidak ada session.
    */

    if (!token) {
      setPage("home");

      return;
    }

    /*
      Pulihkan user lokal terlebih dahulu.
    */

    if (savedUser) {
      try {
        const parsedUser =
          JSON.parse(savedUser);

        if (
          parsedUser &&
          parsedUser.role
        ) {
          setUser(parsedUser);

          if (
            parsedUser.role ===
            "guru"
          ) {
            setPage("guru");
          }

          if (
            parsedUser.role ===
            "siswa"
          ) {
            setPage("siswa");

            setupPushNotifications(
              parsedUser
            );
          }
        }
      } catch {
        localStorage.removeItem(
          "prReminderUser"
        );
      }
    }

    /*
      Validasi session ke backend production.
    */

    try {
      const response =
        await fetch(
          `${API_URL}/api/me`,
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
            "Sesi tidak valid."
        );
      }

      localStorage.setItem(
        "prReminderUser",
        JSON.stringify(data.user)
      );

      setUser(data.user);

      if (
        data.user.role === "guru"
      ) {
        setPage("guru");
      } else if (
        data.user.role === "siswa"
      ) {
        setPage("siswa");

        await setupPushNotifications(
          data.user
        );
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

  /*
    ========================================================
    RESTORE ADMIN SESSION
    ========================================================
  */

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
      const response =
        await fetch(
          `${API_URL}/api/admin/me`,
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
            "Sesi Admin tidak valid."
        );
      }

      localStorage.setItem(
        "prReminderAdmin",
        JSON.stringify(
          data.admin
        )
      );

      setAdmin(
        data.admin
      );

      setPage("admin");
    } catch (error) {
      console.error(
        "RESTORE ADMIN SESSION:",
        error
      );

      clearAdminSession();
    }
  }

  /*
    ========================================================
    CLEAR USER
    ========================================================
  */

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

  /*
    ========================================================
    CLEAR ADMIN
    ========================================================
  */

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

  /*
    ========================================================
    USER LOGIN
    ========================================================
  */

  async function handleUserLogin(
    loggedUser
  ) {
    setUser(loggedUser);

    if (
      loggedUser.role ===
      "guru"
    ) {
      setPage("guru");

      return;
    }

    setPage("siswa");

    await setupPushNotifications(
      loggedUser
    );
  }

  /*
    ========================================================
    ADMIN LOGIN
    ========================================================
  */

  function handleAdminLogin(
    loggedAdmin
  ) {
    setAdmin(loggedAdmin);

    setPage("admin");
  }

  /*
    ========================================================
    LOGOUT
    ========================================================
  */

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

  /*
    ========================================================
    HOME
    ========================================================
  */

  function goHome() {
    setPage("home");
  }

  /*
    ========================================================
    LOADING
    ========================================================
  */

  if (page === "loading") {
    return (
      <div className="app-loading">
        <div className="brand-mark">
          ✓
        </div>

        <h2>
          PR Reminder
        </h2>

        <p>
          Memeriksa sesi...
        </p>

        <div className="watermark">
          ♥ Made by Rayva
        </div>
      </div>
    );
  }

  /*
    ========================================================
    HOME
    ========================================================
  */

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

  /*
    ========================================================
    LOGIN
    ========================================================
  */

  if (page === "login") {
    return (
      <Login
        onLogin={
          handleUserLogin
        }
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

  /*
    ========================================================
    REGISTER
    ========================================================
  */

  if (page === "register") {
    return (
      <Register
        onRegistered={
          handleUserLogin
        }
        onBack={() =>
          setPage("login")
        }
      />
    );
  }

  /*
    ========================================================
    GURU LOGIN
    ========================================================
  */

  if (page === "guru-login") {
    return (
      <Guru
        loginOnly
        onLogin={
          handleUserLogin
        }
        onBack={() =>
          setPage("login")
        }
      />
    );
  }

  /*
    ========================================================
    GURU
    ========================================================
  */

  if (page === "guru") {
    return (
      <Guru
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  /*
    ========================================================
    SISWA
    ========================================================
  */

  if (page === "siswa") {
    return (
      <Siswa
        key={`siswa-${studentRefreshKey}`}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  /*
    ========================================================
    OWNER LOGIN
    ========================================================
  */

  if (page === "owner-login") {
    return (
      <OwnerLogin
        onLogin={
          handleAdminLogin
        }
      />
    );
  }

  /*
    ========================================================
    ADMIN
    ========================================================
  */

  if (page === "admin") {
    return (
      <Admin
        admin={admin}
        onLogout={
          handleAdminLogout
        }
      />
    );
  }

  return null;
}

/*
  ==========================================================
  HOME COMPONENT
  ==========================================================
*/

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

        <h1>
          PR Reminder
        </h1>

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
          <span>
            ✓ Sesuai kelas
          </span>

          <span>
            ◷ Deadline
          </span>

          <span>
            ✓ Status selesai
          </span>
        </div>

        <div className="watermark">
          ♥ Made by Rayva
        </div>
      </main>
    </div>
  );
}