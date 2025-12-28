import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("loading"); // loading | choose | chat
  const [error, setError] = useState("");

  const canStart = useMemo(() => !!selectedTemplateId && !token, [selectedTemplateId, token]);
  const canSend = useMemo(() => !!token && input.trim().length > 0, [token, input]);

  // A) Load templates on mount
  useEffect(() => {
    (async () => {
      setError("");
      setPhase("loading");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "templates" }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Template yükleme hatası");

        setTemplates(Array.isArray(data.templates) ? data.templates : []);
        setPhase("choose");
      } catch (e) {
        setError(e?.message || "Bilinmeyen hata");
        setPhase("choose");
      }
    })();
  }, []);

  // Helper: safe session id
  function newSessionId() {
    try {
      return crypto.randomUUID();
    } catch {
      return String(Date.now());
    }
  }

  // B) Start chat: assigns condition on server, returns token + starter reply
  async function handleStart() {
    setError("");
    if (!selectedTemplateId) {
      setError("Lütfen bir metin seç.");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "start",
          sessionId: newSessionId(),
          templateId: selectedTemplateId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Start isteği başarısız");

      if (!data.token || !data.reply) throw new Error("Start yanıtı eksik (token/reply).");

      setToken(data.token);
      setMessages([{ role: "assistant", content: data.reply }]);
      setPhase("chat");
      setInput("");
    } catch (e) {
      setError(e?.message || "Bilinmeyen hata");
    }
  }

  // C) Send a turn
  async function handleSend() {
    setError("");
    if (!token) {
      setError("Önce sohbeti başlatmalısın.");
      return;
    }
    const text = input.trim();
    if (!text) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "turn",
          token,
          messages: nextMessages,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Turn isteği başarısız");

      if (!data.reply) throw new Error("Model yanıtı boş döndü.");

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e?.message || "Bilinmeyen hata");
    }
  }

  // Reset (optional)
  function handleReset() {
    setError("");
    setToken(null);
    setMessages([]);
    setInput("");
    setPhase("choose");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.h1}>Deney Arayüzü</h1>
          <p style={styles.p}>
            1) Metin seç → 2) Sohbeti başlat → 3) Mesaj yaz. Koşul (empatik/bilgilendirici) sistem tarafından otomatik atanır.
          </p>
        </header>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {phase !== "chat" ? (
          <section style={styles.card}>
            <h2 style={styles.h2}>1) Bir metin seç</h2>

            {phase === "loading" ? (
              <div style={styles.muted}>Yükleniyor...</div>
            ) : (
              <div style={styles.templateList}>
                {templates.map((t) => (
                  <label key={t.id} style={styles.templateItem}>
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={selectedTemplateId === t.id}
                      onChange={() => setSelectedTemplateId(t.id)}
                      style={styles.radio}
                    />
                    <div>
                      <div style={styles.templateTitle}>{t.title}</div>
                      <div style={styles.templateText}>{t.text}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={styles.actions}>
              <button onClick={handleStart} disabled={!canStart} style={buttonStyle(canStart)}>
                2) Sohbeti Başlat
              </button>
            </div>

            <div style={styles.note}>
              Not: Eğer “Bad request: unknown type” görürsen, frontend eski istek tiplerini gönderiyor demektir.
              Bu sayfa sadece templates/start/turn kullanır.
            </div>
          </section>
        ) : (
          <section style={styles.card}>
            <div style={styles.chatHeader}>
              <h2 style={styles.h2}>3) Sohbet</h2>
              <button onClick={handleReset} style={styles.resetBtn}>
                Yeni katılımcı / sıfırla
              </button>
            </div>

            <div style={styles.chatBox}>
              {messages.map((m, i) => (
                <div key={i} style={m.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
                  <div style={styles.bubbleRole}>{m.role === "user" ? "Sen" : "Bot"}</div>
                  <div style={styles.bubbleText}>{m.content}</div>
                </div>
              ))}
            </div>

            <div style={styles.inputRow}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mesajını yaz"
                style={styles.input}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) handleSend();
                  }
                }}
              />
              <button onClick={handleSend} disabled={!canSend} style={buttonStyle(canSend)}>
                Gönder
              </button>
            </div>

            <div style={styles.noteSmall}>
              Enter: gönder. Shift+Enter: yeni satır.
            </div>
          </section>
        )}

        <footer style={styles.footer}>
          <div style={styles.mutedSmall}>
            Backend endpoint: <code>/api/chat</code> (types: templates, start, turn)
          </div>
        </footer>
      </div>
    </div>
  );
}

function buttonStyle(enabled) {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #111",
    background: enabled ? "#111" : "#777",
    color: "#fff",
    cursor: enabled ? "pointer" : "not-allowed",
    fontWeight: 600,
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f6f6",
    padding: 24,
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
  },
  header: {
    marginBottom: 16,
  },
  h1: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.2,
  },
  h2: {
    margin: "0 0 12px 0",
    fontSize: 18,
  },
  p: {
    margin: "8px 0 0 0",
    color: "#444",
  },
  card: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  errorBox: {
    background: "#ffe5e5",
    border: "1px solid #ffb3b3",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    color: "#7a0000",
  },
  templateList: {
    display: "grid",
    gap: 10,
  },
  templateItem: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    border: "1px solid #e6e6e6",
    borderRadius: 12,
    padding: 12,
    cursor: "pointer",
  },
  radio: { marginTop: 4 },
  templateTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  templateText: {
    color: "#444",
    lineHeight: 1.35,
  },
  actions: {
    marginTop: 12,
    display: "flex",
    gap: 10,
  },
  note: {
    marginTop: 12,
    color: "#666",
    fontSize: 12,
    lineHeight: 1.4,
  },
  noteSmall: {
    marginTop: 10,
    color: "#666",
    fontSize: 12,
  },
  muted: {
    color: "#666",
  },
  mutedSmall: {
    color: "#666",
    fontSize: 12,
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  resetBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #bbb",
    background: "#fff",
    cursor: "pointer",
  },
  chatBox: {
    height: 360,
    overflowY: "auto",
    border: "1px solid #e6e6e6",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "78%",
    background: "#111",
    color: "#fff",
    borderRadius: 14,
    padding: "10px 12px",
  },
  bubbleBot: {
    alignSelf: "flex-start",
    maxWidth: "78%",
    background: "#fff",
    color: "#111",
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid #e6e6e6",
  },
  bubbleRole: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 6,
    fontWeight: 700,
  },
  bubbleText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.35,
  },
  inputRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ccc",
    outline: "none",
    fontSize: 14,
  },
  footer: {
    marginTop: 14,
    textAlign: "center",
  },
};
