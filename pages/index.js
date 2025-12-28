// pages/index.js
import { useEffect, useRef, useState } from "react";

const FORM_PROMPT = `Lütfen aşağıdaki cümleleri ayrı satırlar halinde tamamla:

1) Bu durum beni en çok ______ hissettirdi.
2) O sırada aklımdan geçen en baskın düşünce ______ idi.
3) Beni en çok zorlayan şey ______.
4) Şu anda bu konudan beklentim / ihtiyacım ______.
5) Daha önce denediğim şey ______ ve sonucu ______ oldu.`;

export default function Home() {
  // pretest → select → form → chat → manipulation → posttest → done
  const [phase, setPhase] = useState("pretest");

  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);

  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);

  const [formText, setFormText] = useState("");
  const [chatText, setChatText] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre / Post stress (0–100 VAS)
  const [preStress, setPreStress] = useState(50);
  const [postStress, setPostStress] = useState(50);

  // Manipulation check (1–7)
  const [perceivedEmpathy, setPerceivedEmpathy] = useState(4);
  const [perceivedInfo, setPerceivedInfo] = useState(4);

  // 10 min limit (chat phase)
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "templates" }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "Template’ler yüklenemedi.");
        setTemplates(d.templates || []);
      } catch (e) {
        setError(e?.message || "Template’ler yüklenemedi.");
      }
    })();
  }, []);

  // start timer when entering chat
  useEffect(() => {
    if (phase !== "chat") return;

    startTimeRef.current = Date.now();
    setTimeLeft(600);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = 600 - elapsed;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setPhase("manipulation");
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  function resetAll() {
    setPhase("pretest");
    setSelected(null);
    setToken(null);
    setMessages([]);
    setFormText("");
    setChatText("");
    setError("");
    setLoading(false);
    setPreStress(50);
    setPostStress(50);
    setPerceivedEmpathy(4);
    setPerceivedInfo(4);
    clearInterval(timerRef.current);
    setTimeLeft(600);
  }

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
      if (!r.ok) throw new Error(d?.error || "Start hatası");

      setToken(d.token);
      setMessages([{ role: "assistant", content: d.reply }]);
      setPhase("form");
      setFormText("");
    } catch (e) {
      setError(e?.message || "Start hatası");
    } finally {
      setLoading(false);
    }
  }

  function isFormValid(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // En az 5 satır ve 1)–5) içermesi (esnek)
    const has1 = lines.some((l) => l.startsWith("1"));
    const has2 = lines.some((l) => l.startsWith("2"));
    const has3 = lines.some((l) => l.startsWith("3"));
    const has4 = lines.some((l) => l.startsWith("4"));
    const has5 = lines.some((l) => l.startsWith("5"));
    return lines.length >= 5 && has1 && has2 && has3 && has4 && has5;
  }

  async function submitFormToBot() {
    setError("");
    if (!token) return setError("Token yok. Baştan başla.");
    if (!isFormValid(formText)) {
      return setError("Lütfen 1)–5) maddelerini ayrı satırlarda doldur.");
    }

    const next = [...messages, { role: "user", content: formText.trim() }];
    setMessages(next);
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "turn", token, messages: next }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Turn hatası");
      if (!d.reply) throw new Error("Bot yanıtı boş geldi.");

      setMessages([...next, { role: "assistant", content: d.reply }]);
      setFormText("");
      setPhase("chat"); // timer burada başlar
    } catch (e) {
      setError(e?.message || "Turn hatası");
    } finally {
      setLoading(false);
    }
  }

  async function sendChatMessage() {
    setError("");
    if (!token) return setError("Token yok.");
    if (timeLeft <= 0) return;
    const text = chatText.trim();
    if (!text) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setChatText("");
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "turn", token, messages: next }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Turn hatası");
      if (!d.reply) throw new Error("Bot yanıtı boş geldi.");

      setMessages([...next, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setError(e?.message || "Turn hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20, fontFamily: "system-ui, -apple-system" }}>
      <h1>Chatbot Deneyi</h1>

      <button onClick={resetAll} style={{ marginBottom: 12 }}>
        Baştan Başla
      </button>

      {error && (
        <div style={{ background: "#ffe5e5", border: "1px solid #ffb3b3", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          <b>Hata:</b> {error}
        </div>
      )}

      {/* PRETEST */}
      {phase === "pretest" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>Pre-test</h3>
          <p>Şu anda ne kadar stresli / kaygılı hissediyorsun?</p>
          <input type="range" min="0" max="100" value={preStress} onChange={(e) => setPreStress(Number(e.target.value))} />
          <p><b>{preStress}</b></p>
          <button onClick={() => setPhase("select")}>Devam</button>
        </div>
      )}

      {/* SELECT */}
      {phase === "select" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>1) Bir durum seç</h3>
          {templates.map((t) => (
            <label key={t.id} style={{ display: "block", marginBottom: 10 }}>
              <input type="radio" checked={selected?.id === t.id} onChange={() => setSelected(t)} />{" "}
              <b>{t.title}</b>
              <div style={{ marginLeft: 22, opacity: 0.85 }}>{t.text}</div>
            </label>
          ))}
          <button disabled={!selected || loading} onClick={startChat}>
            {loading ? "Başlatılıyor..." : "Sohbeti Başlat"}
          </button>
        </div>
      )}

      {/* FORM */}
      {phase === "form" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>2) Cümleleri tamamla</h3>
          <div style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 10, borderRadius: 8, marginBottom: 10 }}>
            {FORM_PROMPT}
          </div>

          <textarea
            rows={8}
            value={formText}
            onChange={(e) => setFormText(e.target.value)}
            placeholder={"Örn:\n1) ...\n2) ...\n3) ...\n4) ...\n5) ..."}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            disabled={loading}
          />

          <button onClick={submitFormToBot} disabled={loading} style={{ marginTop: 10 }}>
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>

          <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Sohbet</h3>
            <div style={{ whiteSpace: "pre-wrap" }}>
              {messages.map((m, i) => (
                <p key={i} style={{ margin: "10px 0" }}>
                  <b>{m.role === "user" ? "Sen" : "Bot"}:</b> {m.content}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      {phase === "chat" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>3) Sohbet (10 dakika)</h3>
          <p><b>Kalan süre:</b> {timeLeft} sn</p>

          <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8, minHeight: 180, whiteSpace: "pre-wrap" }}>
            {messages.map((m, i) => (
              <p key={i} style={{ margin: "10px 0" }}>
                <b>{m.role === "user" ? "Sen" : "Bot"}:</b> {m.content}
              </p>
            ))}
          </div>

          <textarea
            rows={3}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            disabled={loading || timeLeft <= 0}
            placeholder="Mesaj yaz"
          />

          <button onClick={sendChatMessage} disabled={loading || timeLeft <= 0} style={{ marginTop: 10 }}>
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>

          <button onClick={() => setPhase("manipulation")} style={{ marginLeft: 10 }}>
            Süreyi beklemeden bitir
          </button>
        </div>
      )}

      {/* MANIPULATION */}
      {phase === "manipulation" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>Manipülasyon Kontrolü</h3>

          <p>Bot yanıtları ne kadar empatikti? (1–7)</p>
          <input type="range" min="1" max="7" value={perceivedEmpathy} onChange={(e) => setPerceivedEmpathy(Number(e.target.value))} />
          <p><b>{perceivedEmpathy}</b></p>

          <p>Bot yanıtları ne kadar bilgilendirici / çözüm odaklıydı? (1–7)</p>
          <input type="range" min="1" max="7" value={perceivedInfo} onChange={(e) => setPerceivedInfo(Number(e.target.value))} />
          <p><b>{perceivedInfo}</b></p>

          <button onClick={() => setPhase("posttest")}>Devam</button>
        </div>
      )}

      {/* POSTTEST */}
      {phase === "posttest" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>Post-test</h3>
          <p>Şu anda ne kadar stresli / kaygılı hissediyorsun?</p>
          <input type="range" min="0" max="100" value={postStress} onChange={(e) => setPostStress(Number(e.target.value))} />
          <p><b>{postStress}</b></p>
          <button onClick={() => setPhase("done")}>Bitir</button>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && (
        <div style={{ border: "1px solid #ddd", padding: 14, borderRadius: 10 }}>
          <h3>Teşekkürler</h3>
          <p>Katılımın için teşekkür ederiz.</p>
        </div>
      )}
    </div>
  );
}
