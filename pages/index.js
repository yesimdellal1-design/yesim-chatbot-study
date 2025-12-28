// pages/index.js
import { useEffect, useRef, useState } from "react";

export default function Home() {
  /* ===================== STATES ===================== */
  const [phase, setPhase] = useState("pretest"); 
  // pretest → select → form → chat → manipulation → posttest → done

  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);

  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre / Post stress
  const [preStress, setPreStress] = useState(50);
  const [postStress, setPostStress] = useState(50);

  // Manipulation check
  const [perceivedEmpathy, setPerceivedEmpathy] = useState(4);
  const [perceivedInfo, setPerceivedInfo] = useState(4);

  // Time limit
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 dakika = 600 sn

  /* ===================== EFFECTS ===================== */
  useEffect(() => {
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "templates" }),
    })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setError("Template’ler yüklenemedi."));
  }, []);

  useEffect(() => {
    if (phase === "chat") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = 600 - elapsed;
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          setPhase("manipulation");
        }
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [phase]);

  /* ===================== HANDLERS ===================== */

  async function startChat() {
    if (!selected) return;
    setLoading(true);
    setError("");

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
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);

      setToken(d.token);
      setMessages([{ role: "assistant", content: d.reply }]);
      setPhase("form");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !token || timeLeft <= 0) return;

    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "turn", token, messages: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);

      setMessages([...next, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setError(e.message);
    }
  }

  /* ===================== UI ===================== */

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>Chatbot Deneyi</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* PRE-TEST */}
      {phase === "pretest" && (
        <>
          <h3>Başlamadan önce</h3>
          <p>Şu anda ne kadar stresli / kaygılı hissediyorsun?</p>
          <input
            type="range"
            min="0"
            max="100"
            value={preStress}
            onChange={(e) => setPreStress(e.target.value)}
          />
          <p>{preStress}</p>
          <button onClick={() => setPhase("select")}>Devam</button>
        </>
      )}

      {/* TEMPLATE SELECT */}
      {phase === "select" && (
        <>
          <h3>1) Bir durum seç</h3>
          {templates.map((t) => (
            <label key={t.id} style={{ display: "block", marginBottom: 8 }}>
              <input
                type="radio"
                checked={selected?.id === t.id}
                onChange={() => setSelected(t)}
              />{" "}
              <b>{t.title}</b> — {t.text}
            </label>
          ))}
          <button disabled={!selected} onClick={startChat}>
            Sohbeti Başlat
          </button>
        </>
      )}

      {/* FORM (STANDARD INPUT) */}
      {phase === "form" && (
        <>
          <h3>2) Cümleleri tamamla</h3>
          <textarea
            rows={6}
            placeholder="1–5 maddeleri ayrı satırlarda doldur"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ width: "100%" }}
          />
          <button
            onClick={() => {
              setMessages([...messages, { role: "user", content: input }]);
              setInput("");
              setPhase("chat");
            }}
          >
            Gönder
          </button>
        </>
      )}

      {/* CHAT */}
      {phase === "chat" && (
        <>
          <p><b>Kalan süre:</b> {timeLeft} saniye</p>
          <div style={{ border: "1px solid #ccc", padding: 12 }}>
            {messages.map((m, i) => (
              <p key={i}>
                <b>{m.role === "user" ? "Sen" : "Bot"}:</b> {m.content}
              </p>
            ))}
          </div>
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ width: "100%", marginTop: 10 }}
          />
          <button onClick={sendMessage}>Gönder</button>
        </>
      )}

      {/* MANIPULATION CHECK */}
      {phase === "manipulation" && (
        <>
          <h3>Son birkaç soru</h3>

          <p>Bot yanıtları ne kadar empatikti?</p>
          <input type="range" min="1" max="7" value={perceivedEmpathy}
            onChange={(e) => setPerceivedEmpathy(e.target.value)} />
          <p>{perceivedEmpathy}</p>

          <p>Bot yanıtları ne kadar bilgilendirici / çözüm odaklıydı?</p>
          <input type="range" min="1" max="7" value={perceivedInfo}
            onChange={(e) => setPerceivedInfo(e.target.value)} />
          <p>{perceivedInfo}</p>

          <button onClick={() => setPhase("posttest")}>Devam</button>
        </>
      )}

      {/* POST-TEST */}
      {phase === "posttest" && (
        <>
          <h3>Son olarak</h3>
          <p>Şu anda ne kadar stresli / kaygılı hissediyorsun?</p>
          <input
            type="range"
            min="0"
            max="100"
            value={postStress}
            onChange={(e) => setPostStress(e.target.value)}
          />
          <p>{postStress}</p>
          <button onClick={() => setPhase("done")}>Bitir</button>
        </>
      )}

      {/* DONE */}
      {phase === "done" && (
        <>
          <h3>Teşekkürler</h3>
          <p>Katılımın için teşekkür ederiz.</p>
        </>
      )}
    </div>
  );
}
