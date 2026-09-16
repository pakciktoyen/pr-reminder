import {
  useEffect,
  useState,
} from "react";

import { Capacitor } from "@capacitor/core";

import {
  PushNotifications,
} from "@capacitor/push-notifications";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Guru from "./pages/Guru.jsx";
import Siswa from "./pages/Siswa.jsx";
import Admin from "./pages/Admin.jsx";
import OwnerLogin from "./pages/OwnerLogin.jsx";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const OWNER_PATH =
  "/owner-panel-9f3a";

const PUSH_CHANNEL_ID =
  "pr_reminder";

export default function App() {
  const [page, setPage] =
    useState("loading");

  const [user, setUser] =
    useState(null);

  const [admin, setAdmin] =
    useState(null);

  /*
    Key ini dipakai untuk memaksa
    dashboard Siswa mengambil ulang
    daftar tugas ketika push masuk.
  */
  const [
    studentRefreshKey,
    setStudentRefreshKey,
  ] = useState(0);

  useEffect(() => {
    restoreSession();
  }, []);

  /*
    ========================================================
    PUSH NOTIFICATION ANDROID
    ========================================================
  */

  useEffect(() => {
    if (
      Capacitor.getPlatform() !==
      "android"
    ) {
      return undefined;
    }

    if (
      !user ||
      user.role !== "siswa"
    ) {
      return undefined;
    }

    let registrationHandle =
      null;

    let registrationErrorHandle =
      null;

    let notificationReceivedHandle =
      null;

    let notificationActionHandle =
      null;

    let appStateHandle =
      null;

    async function registerFcmToken() {
      try {
        const authToken =
          localStorage.getItem(
            "prReminderToken"
          );

        if (!authToken) {
          return;
        }

        const permission =
          await PushNotifications.checkPermissions();

        if (
          permission.receive !==
          "granted"
        ) {
          const requested =
            await PushNotifications.requestPermissions();

          if (
            requested.receive !==
            "granted"
          ) {
            console.warn(
              "Izin notifikasi Android ditolak."
            );

            return;
          }
        }

        /*
          Channel Android untuk heads-up
          + suara custom.
        */

        try {
          await PushNotifications.createChannel(
            {
              id: PUSH_CHANNEL_ID,

              name: "PR Reminder",

              description:
                "Notifikasi tugas baru dari Guru.",

              importance: 5,

              visibility: 1,

              sound:
                "pr_reminder_notification",

              vibration: true,

              lights: true,
            }
          );
        } catch (error) {
          console.warn(
            "Gagal membuat push channel:",
            error
          );
        }

        /*
          Local notification channel.
          Dipakai ketika app sedang terbuka.
        */

        try {
          const localPermission =
            await LocalNotifications.checkPermissions();

          if (
            localPermission.display !==
            "granted"
          ) {
            const requestedLocal =
              await LocalNotifications.requestPermissions();

            if (
              requestedLocal.display !==
              "granted"
            ) {
              console.warn(
                "Izin local notification ditolak."
              );
            }
          }

          await LocalNotifications.createChannel(
            {
              id: PUSH_CHANNEL_ID,

              name: "PR Reminder",

              description:
                "Notifikasi tugas baru dari Guru.",

              importance: 5,

              visibility: 1,

              sound:
                "pr_reminder_notification",

              vibration: true,

              lights: true,
            }
          );
        } catch (error) {
          console.warn(
            "Local notification:",
            error
          );
        }

        /*
          Listener registration harus dipasang
          sebelum register().
        */

        registrationHandle =
          await PushNotifications.addListener(
            "registration",
            async (event) => {
              try {
                const fcmToken =
                  String(
                    event?.value || ""
                  ).trim();

                if (!fcmToken) {
                  console.warn(
                    "FCM token kosong."
                  );

                  return;
                }

                console.log(
                  "FCM TOKEN DITERIMA"
                );

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

                      body: JSON.stringify(
                        {
                          token:
                            fcmToken,

                          platform:
                            "android",
                        }
                      ),
                    }
                  );

                const data =
                  await response
                    .json()
                    .catch(
                      () => ({})
                    );

                if (!response.ok) {
                  throw new Error(
                    data.message ||
                      `Gagal menyimpan token (${response.status})`
                  );
                }

                console.log(
                  "FCM TOKEN BERHASIL DISIMPAN"
                );
              } catch (error) {
                console.error(
                  "REGISTER FCM TOKEN:",
                  error
                );
              }
            }
          );

        registrationErrorHandle =
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
          FOREGROUND PUSH
          ====================================================
        */

        notificationReceivedHandle =
          await PushNotifications.addListener(
            "pushNotificationReceived",
            async (notification) => {
              try {
                console.log(
                  "PUSH DITERIMA DI FOREGROUND:",
                  notification
                );

                const data =
                  notification?.data ||
                  {};

                const taskId =
                  data.taskId
                    ? String(
                        data.taskId
                      )
                    : "";

                if (taskId) {
                  localStorage.setItem(
                    "prReminderOpenTaskId",
                    taskId
                  );
                }

                /*
                  Ini bagian penting:
                  dashboard Siswa akan dibuat ulang
                  sehingga /api/tasks dipanggil lagi.
                */

                setStudentRefreshKey(
                  (value) =>
                    value + 1
                );

                const title =
                  notification?.title ||
                  "Tugas Baru!";

                const teacherName =
                  data.teacherName ||
                  "Guru";

                const body =
                  notification?.body ||
                  `Ada tugas baru dari ${teacherName}.`;

                try {
                  const localPermission =
                    await LocalNotifications.checkPermissions();

                  if (
                    localPermission.display ===
                    "granted"
                  ) {
                    await LocalNotifications.schedule(
                      {
                        notifications: [
                          {
                            id:
                              Math.floor(
                                Date.now() %
                                  2147483647
                              ),

                            title,

                            body,

                            channelId:
                              PUSH_CHANNEL_ID,

                            sound:
                              "pr_reminder_notification",

                            smallIcon:
                              "ic_launcher",

                            extra: {
                              type:
                                "new_task",

                              taskId,

                              classId:
                                data.classId ||
                                "",

                              teacherName:
                                String(
                                  teacherName
                                ),
                            },
                          },
                        ],
                      }
                    );
                  }
                } catch (error) {
                  console.error(
                    "LOCAL NOTIFICATION:",
                    error
                  );
                }
              } catch (error) {
                console.error(
                  "FOREGROUND PUSH:",
                  error
                );
              }
            }
          );

        /*
          ====================================================
          PUSH DITEKAN
          ====================================================
        */

        notificationActionHandle =
          await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (event) => {
              try {
                console.log(
                  "PUSH DITEKAN:",
                  event
                );

                const data =
                  event?.notification
                    ?.data ||
                  {};

                const taskId =
                  data.taskId
                    ? String(
                        data.taskId
                      )
                    : "";

                if (taskId) {
                  localStorage.setItem(
                    "prReminderOpenTaskId",
                    taskId
                  );
                }

                setStudentRefreshKey(
                  (value) =>
                    value + 1
                );

                setPage(
                  "siswa"
                );
              } catch (error) {
                console.error(
                  "PUSH ACTION:",
                  error
                );
              }
            }
          );

        /*
          Register device ke FCM.
        */

        await PushNotifications.register();

        console.log(
          "PUSH NOTIFICATION AKTIF"
        );
      } catch (error) {
        console.error(
          "SETUP PUSH:",
          error
        );
      }
    }

    /*
      Saat app aktif kembali dari background,
      register lagi supaya token tetap tersimpan.
    */

    async function handleAppResume() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        try {
          await registerFcmToken();
        } catch (error) {
          console.error(
            "PUSH RESUME:",
            error
          );
        }
      }
    }

    registerFcmToken();

    document.addEventListener(
      "visibilitychange",
      handleAppResume
    );

    appStateHandle =
      handleAppResume;

    return () => {
      document.removeEventListener(
        "visibilitychange",
        appStateHandle
      );

      try {
        registrationHandle?.remove();
      } catch {}

      try {
        registrationErrorHandle?.remove();
      } catch {}

      try {
        notificationReceivedHandle?.remove();
      } catch {}

      try {
        notificationActionHandle?.remove();
      } catch {}
    };
  }, [user]);

  /*
    ========================================================
    SESSION
    ========================================================
  */

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const path =
      window.location.pathname;

    /*
      OWNER / ADMIN
    */

    if (
      path === OWNER_PATH
    ) {
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

    if (!token) {
      setPage("home");
      return;
    }

    if (savedUser) {
      try {
        const parsedUser =
          JSON.parse(
            savedUser
          );

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
          } else if (
            parsedUser.role ===
            "siswa"
          ) {
            setPage("siswa");
          }
        }
      } catch {
        localStorage.removeItem(
          "prReminderUser"
        );
      }
    }

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
        JSON.stringify(
          data.user
        )
      );

      setUser(
        data.user
      );

      if (
        data.user.role ===
        "guru"
      ) {
        setPage("guru");
      } else if (
        data.user.role ===
        "siswa"
      ) {
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

  function clearUserSession() {
    localStorage.removeItem(
      "prReminderToken"
    );

    localStorage.removeItem(
      "prReminderUser"
    );

    localStorage.removeItem(
      "prReminderOpenTaskId"
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

  function handleUserLogin(
    loggedUser
  ) {
    setUser(
      loggedUser
    );

    if (
      loggedUser.role ===
      "guru"
    ) {
      setPage("guru");
    } else {
      setPage("siswa");
    }
  }

  function handleAdminLogin(
    loggedAdmin
  ) {
    setAdmin(
      loggedAdmin
    );

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

  if (
    page === "loading"
  ) {
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

  if (
    page === "home"
  ) {
    return (
      <Home
        onLogin={() =>
          setPage("login")
        }
        onRegister={() =>
          setPage(
            "register"
          )
        }
      />
    );
  }

  if (
    page === "login"
  ) {
    return (
      <Login
        onLogin={
          handleUserLogin
        }
        onRegister={() =>
          setPage(
            "register"
          )
        }
        onGuruLogin={() =>
          setPage(
            "guru-login"
          )
        }
        onBack={goHome}
      />
    );
  }

  if (
    page === "register"
  ) {
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

  if (
    page === "guru-login"
  ) {
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

  if (
    page === "guru"
  ) {
    return (
      <Guru
        user={user}
        onLogout={
          handleLogout
        }
      />
    );
  }

  if (
    page === "siswa"
  ) {
    return (
      <Siswa
        key={
          `siswa-${studentRefreshKey}`
        }
        user={user}
        onLogout={
          handleLogout
        }
      />
    );
  }

  if (
    page === "owner-login"
  ) {
    return (
      <OwnerLogin
        onLogin={
          handleAdminLogin
        }
      />
    );
  }

  if (
    page === "admin"
  ) {
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