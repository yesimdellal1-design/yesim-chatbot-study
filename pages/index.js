// pages/index.js
import { useEffect, useState } from "react";

export default function Home() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);

  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "templates" }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(d?.error || "Template yüklenemedi");
          return;
        }
        setTemplates(d.templates || []);
      } catch (e) {
        setError(e?.message || "Network hatası");
      }
    })();
  }, []);

  async function startChat() {
    setError("");
    if (!selected) return;

    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "start",
          templateId: selected.id,
          sessionId: Date.now().toString(),
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d?.error || "Start hatası");
        return;
      }
      if (!d.token || !d.reply) {
        setError("Start yanıtı eksik (token/reply yok).");
        return;
      }

      setToken(d.token);
      setMessages([{ role: "assistant", content: d.reply }]);
    } catch (e) {
      setError(e?.message || "Network hatası");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    setError("");
    if (!token) {
      setError("Token yok. Önce sohbeti başlatmalısın.");
      return;
    }

    const text = input.trim();
    if (!text) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "turn",
          token,
          messages: next,
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d?.error || "Turn hatası");
        return;
      }
      if (!d.reply) {
        setError("Sunucudan reply gelmedi (boş).");
        return;
      }

      setMessages([...next, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setError(e?.message || "Network hatası");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setToken(null);
    setMessages([]);
    setInput("");
    setError("");
    setSelected(null);
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>Chatbot Deneyi</h1>

      {error && (
        <div style={{ background: "#ffe5e5", border: "1px solid #ffb3b3", padding: 10, marginBottom: 12 }}>
          <b>Hata:</b> {error}
        </div>
      )}

      {!token && (
        <>
          <h3>1) Bir durum seç</h3>
          {templates.map((t) => (
            <label key={t.id} style={{ display: "block", marginBottom: 10 }}>
              <input
                type="radio"
                name="template"
                checked={selected?.id === t.id}
                onChange={() => setSelected(t)}
              />{" "}
              <b>{t.title}</b> — <span style={{ color: "#444" }}>{t.text}</span>
            </label>
          ))}

          <button onClick={startChat} disabled={!selected || loading}>
            {loading ? "Başlatılıyor..." : "Sohbeti Başlat"}
          </button>
        </>
      )}

      {token && (
        <>
          <div style={{ marginTop: 16, marginBottom: 10 }}>
            <button onClick={resetAll} disabled={loading}>
              Baştan Başla
            </button>
          </div>

          <div style={{ border: "1px solid #ccc", padding: 12, minHeight: 220 }}>
            {messages.map((m, i) => (
              <p key={i} style={{ margin: "10px 0" }}>
                <b>{m.role === "user" ? "Sen" : "Bot"}:</b> {m.content}
              </p>
            ))}
          </div>

          <textarea
            rows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Boşluk doldurma yanıtlarını buraya yaz (1–5 maddeleri ayrı satır yapman iyi olur)."
            style={{ width: "100%", marginTop: 10, padding: 10 }}
            disabled={loading}
          />

          <button onClick={sendMessage} style={{ marginTop: 10 }} disabled={loading}>
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </>
      )}
    </div>
  );
}
