import { useState } from "react";

export default function FeedbackForm() {
  const [feedbackType, setFeedbackType] = useState("saran");
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackSending, setFeedbackSending] = useState(false);

  const handleSubmitFeedback = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setFeedbackMessage({
        type: "error",
        text: "Sesi login tidak ditemukan.",
      });
      return;
    }

    if (!message.trim()) {
      setFeedbackMessage({
        type: "error",
        text: "Masukan tidak boleh kosong.",
      });
      return;
    }

    if (message.trim().length < 3) {
      setFeedbackMessage({
        type: "error",
        text: "Masukan minimal 3 karakter.",
      });
      return;
    }

    try {
      setFeedbackSending(true);
      setFeedbackMessage(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: feedbackType,
            message: message.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengirim masukan.");
      }

      setMessage("");

      setFeedbackMessage({
        type: "success",
        text: "Masukan berhasil dikirim.",
      });
    } catch (error) {
      setFeedbackMessage({
        type: "error",
        text: error.message || "Gagal mengirim masukan.",
      });
    } finally {
      setFeedbackSending(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          padding: 20,
          border: "1px solid #e8edf4",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 18,
            color: "#172033",
          }}
        >
          Masukan / Saran
        </h3>

        <p
          style={{
            margin: "0 0 18px",
            fontSize: 13,
            color: "#8190a7",
            lineHeight: 1.5,
          }}
        >
          Sampaikan saran, laporan bug, atau ide fitur baru untuk PR Reminder.
        </p>

        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#344054",
          }}
        >
          Jenis Masukan
        </label>

        <select
          value={feedbackType}
          onChange={(event) => setFeedbackType(event.target.value)}
          disabled={feedbackSending}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px solid #d9e0ea",
            padding: "0 12px",
            background: "#fff",
            color: "#172033",
            outline: "none",
            marginBottom: 14,
          }}
        >
          <option value="saran">Saran</option>
          <option value="bug">Bug</option>
          <option value="fitur">Fitur Baru</option>
        </select>

        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#344054",
          }}
        >
          Masukan
        </label>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={feedbackSending}
          placeholder="Tulis masukan kamu di sini..."
          rows={6}
          maxLength={5000}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            minHeight: 130,
            borderRadius: 12,
            border: "1px solid #d9e0ea",
            padding: 12,
            fontFamily: "inherit",
            fontSize: 14,
            color: "#172033",
            outline: "none",
            marginBottom: 10,
          }}
        />

        <div
          style={{
            fontSize: 12,
            color: "#98a2b3",
            textAlign: "right",
            marginBottom: 12,
          }}
        >
          {message.length}/5000
        </div>

        {/* Notifikasi HANYA di sini, tepat di atas tombol */}
        {feedbackMessage && (
          <div
            style={{
              marginBottom: 10,
              fontSize: 13,
              lineHeight: 1.4,
              color:
                feedbackMessage.type === "error"
                  ? "#dc2626"
                  : "#16a34a",
              textAlign: "left",
            }}
          >
            {feedbackMessage.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmitFeedback}
          disabled={feedbackSending}
          style={{
            width: "100%",
            height: 44,
            border: "none",
            borderRadius: 12,
            background: feedbackSending ? "#9ca3af" : "#2563eb",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 700,
            cursor: feedbackSending ? "not-allowed" : "pointer",
          }}
        >
          {feedbackSending ? "Mengirim..." : "Kirim Masukan"}
        </button>
      </div>
    </div>
  );
}