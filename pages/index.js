import { useEffect, useState } from "react";

export default function Home() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  // load templates
  useEffect(() => {
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "templates" }),
    })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setError("Template yüklenemedi"));
  }, []);

  async function startChat() {
    if (!selected) return;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "start",
        sessionId: Date.now().toString(),
        templateId: selected.id,
      }),
    });

    const data = await res.json();
    setToken(data.token);
    setMessages([{ role: "assistant", content: data.reply }]);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "turn",
        token,
        messages: next,
      }),
    });

    const data = await res.json();
    setMessages([...next, { role: "assistant", content: data.reply }]);
  }

  return (
    <div style={{ padding: 30, maxWidth: 800, margin: "auto" }}>
      <h1>Chatbot Deneyi</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!token && (
        <>
          <h3>1) Bir durum seç</h3>
          {templates.map((t) => (
            <div key={t.id} style={{ marginBottom: 10 }}>
              <label>
                <input
                  type="radio"
                  name="template"
                  onChange={() => setSelected(t)}
                />{" "}
                <strong>{t.title}</strong> – {t.text}
              </label>
            </div>
          ))}
          <button onClick={startChat} disabled={!selected}>
            Sohbeti Başlat
          </button>
        </>
      )}

      {token && (
        <>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginTop: 20,
              minHeight: 200,
            }}
          >
            {messages.map((m, i) => (
              <p key={i}>
                <b>{m.role === "user" ? "Sen" : "Bot"}:</b> {m.content}
              </p>
            ))}
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mesaj yaz"
            style={{ width: "100%", marginTop: 10 }}
          />
          <button onClick={sendMessage} style={{ marginTop: 10 }}>
            Gönder
          </button>
        </>
      )}
    </div>
  );
}
