import React, { useEffect, useMemo, useRef, useState } from "react";

const TURN_LIMIT = 5;

function randCondition() {
  return Math.random() < 0.5 ? "informational" : "empathic";
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [condition, setCondition] = useState("");
  const [phase, setPhase] = useState("pre"); // pre -> template -> chat -> post

  // pre / post ölçümleri (0-100)
  const [preDistress, setPreDistress] = useState(50);
  const [postDistress, setPostDistress] = useState(50);

  // template (problem yapılandırma)
  const [template, setTemplate] = useState({
    area: "",
    emotion: "",
    thought: "",
    hardMoment: "",
    tried: "",
  });

  // chat
  const [messages, setMessages] = useState([]); // [{role:'user'|'assistant'|'system', content:string}]
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // chat'e girince botu 1 kere başlatmak için
  const chatStartedRef = useRef(false);

  // ilk yüklemede session + condition üret
  useEffect(() => {
    const sid =
      (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
      `s_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    setSessionId(sid);
    setCondition(randCondition());
  }, []);

  const turnsUsed = useMemo(() => {
    return messages.filter((m) => m.role === "user").length;
  }, [messages]);

  async function callChatAPI(payload) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || data?.message || "API hatası";
      throw new Error(msg);
    }
    if (!data?.reply) throw new Error("API reply dönmedi");
    return data.reply;
  }

  // chat phase'e geçince botun ilk mesajını otomatik getir
  useEffect(() => {
    if (phase !== "chat") return;
    if (chatStartedRef.current) return;

    chatStartedRef.current = true;
    setIsLoading(true);
    setErrorText("");

    (async () => {
      try {
        const reply = await callChatAPI({
          type: "init",
          sessionId,
          condition,
          template,
          messages: [],
        });

        setMessages([{ role: "assistant", content: reply }]);
      } catch (err) {
        setErrorText(err?.message || "Başlatma hatası");
        // chat yine de açılsın, kullanıcı yazınca tekrar deneyeceğiz
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function goToTemplate() {
    setPhase("template");
  }

  function startChat() {
    // minimum kontrol: boş bırakmışsa da ilerlesin (istersen burada zorunlu yaparız)
    setPhase("chat");
  }

  async function handleSend() {
    if (!userInput.trim()) return;
    if (isLoading) return;

    // 5 tur dolduysa göndermeyi kapat
    if (turnsUsed >= TURN_LIMIT) return;

    const userMsg = { role: "user", content: userInput.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setUserInput("");
    setIsLoading(true);
    setErrorText("");

    try {
      const reply = await callChatAPI({
        type: "turn",
        sessionId,
        condition,
        template,
        messages: nextMessages,
      });

      const assistantMsg = { role: "assistant", content: reply };
      const after = [...nextMessages, assistantMsg];
      setMessages(after);

      // kullanıcı turu 5 olduysa otomatik post'a geç
      const nextTurns = after.filter((m) => m.role === "user").length;
      if (nextTurns >= TURN_LIMIT) {
        setPhase("post");
      }
    } catch (err) {
      setErrorText(err?.message || "Mesaj gönderme hatası");
    } finally {
      setIsLoading(false);
    }
  }

  function resetStudy() {
    chatStartedRef.current = false;
    setPhase("pre");
    setPreDistress(50);
    setPostDistress(50);
    setTemplate({ area: "", emotion: "", thought: "", hardMoment: "", tried: "" });
    setMessages([]);
    setUserInput("");
    setErrorText("");
    // yeni session + condition
    const sid =
      (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
      `s_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    setSessionId(sid);
    setCondition(randCondition());
  }

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ marginBottom: 6 }}>Chatbot Study</h1>
      <div style={{ color: "#444", marginBottom: 18 }}>Bu sohbet bir terapi değildir.</div>

      {phase === "pre" && (
        <section>
          <h2 style={{ marginTop: 0 }}>Başlangıç</h2>

          <div style={{ margin: "12px 0 6px" }}>Şu anki sıkıntı düzeyi (0-100)</div>
          <input
            type="range"
            min="0"
            max="100"
            value={preDistress}
            onChange={(e) => setPreDistress(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ marginTop: 6 }}>{preDistress}</div>

          <button onClick={goToTemplate} style={{ marginTop: 14 }}>
            Devam
          </button>
        </section>
      )}

      {phase === "template" && (
        <section>
          <h2 style={{ marginTop: 0 }}>Şablon</h2>

          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="area"
              value={template.area}
              onChange={(e) => setTemplate((t) => ({ ...t, area: e.target.value }))}
            />
            <input
              placeholder="emotion"
              value={template.emotion}
              onChange={(e) => setTemplate((t) => ({ ...t, emotion: e.target.value }))}
            />
            <input
              placeholder="thought"
              value={template.thought}
              onChange={(e) => setTemplate((t) => ({ ...t, thought: e.target.value }))}
            />
            <input
              placeholder="hardMoment"
              value={template.hardMoment}
              onChange={(e) => setTemplate((t) => ({ ...t, hardMoment: e.target.value }))}
            />
            <input
              placeholder="tried"
              value={template.tried}
              onChange={(e) => setTemplate((t) => ({ ...t, tried: e.target.value }))}
            />
          </div>

          <button onClick={startChat} style={{ marginTop: 12 }}>
            Sohbeti Başlat
          </button>
        </section>
      )}

      {phase === "chat" && (
        <section>
          <h2 style={{ marginTop: 0 }}>Sohbet ({Math.min(turnsUsed, TURN_LIMIT)}/{TURN_LIMIT})</h2>

          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minHeight: 180, marginBottom: 10 }}>
            {messages.length === 0 && !isLoading && (
              <div style={{ color: "#666" }}>Sohbet başlatılıyor.</div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: 10 }}>
                <strong>{m.role === "user" ? "Sen" : "Bot"}: </strong>
                <span>{m.content}</span>
              </div>
            ))}

            {isLoading && <div style={{ color: "#666" }}>Yükleniyor.</div>}
            {errorText && <div style={{ color: "crimson" }}>{errorText}</div>}
          </div>

          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Mesaj yaz"
            style={{ width: "100%", marginBottom: 8 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={turnsUsed >= TURN_LIMIT || isLoading}
          />

          <button onClick={handleSend} disabled={turnsUsed >= TURN_LIMIT || isLoading}>
            Gönder
          </button>

          {turnsUsed >= TURN_LIMIT && (
            <div style={{ marginTop: 10, color: "#444" }}>
              5 tur tamamlandı, son ölçüme geçiliyor.
            </div>
          )}
        </section>
      )}

      {phase === "post" && (
        <section>
          <h2 style={{ marginTop: 0 }}>Son</h2>

          <div style={{ margin: "12px 0 6px" }}>Şu anki sıkıntı düzeyi (0-100)</div>
          <input
            type="range"
            min="0"
            max="100"
            value={postDistress}
            onChange={(e) => setPostDistress(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ marginTop: 6 }}>{postDistress}</div>

          <div style={{ marginTop: 12, color: "#444" }}>
            Teşekkürler. Oturum kaydı: {sessionId}
          </div>

          <button onClick={resetStudy} style={{ marginTop: 12 }}>
            Yeniden başlat
          </button>
        </section>
      )}

      <hr style={{ margin: "24px 0" }} />

      <details>
        <summary>Teknik bilgi</summary>
        <div style={{ marginTop: 10, color: "#444" }}>
          Condition: <code>{condition || "-"}</code>
          <br />
          Session: <code>{sessionId || "-"}</code>
        </div>
      </details>
    </div>
  );
}
