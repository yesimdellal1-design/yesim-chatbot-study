import React, { useEffect, useMemo, useState } from "react";

const TURN_LIMIT = 5;

function randCondition() {
  return Math.random() < 0.5 ? "informational" : "empathic";
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [condition, setCondition] = useState("");

  const [phase, setPhase] = useState("pre"); // pre -> template -> chat -> post -> done
  const [preDistress, setPreDistress] = useState(50);

  const [template, setTemplate] = useState({
    area: "",
    emotion: "",
    thought: "",
    hardMoment: "",
    tried: ""
  });

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [turnCount, setTurnCount] = useState(0);

  const [postDistress, setPostDistress] = useState(50);
  const [mc, setMc] = useState({
    understood: 3,
    empathic: 3,
    practical: 3,
    supportiveTone: 3
  });

  useEffect(() => {
    const sid = crypto.randomUUID();
    setSessionId(sid);
    setCondition(randCondition());
  }, []);

  const canStartChat = useMemo(() => {
    return Object.values(template).every((v) => v.trim().length > 0);
  }, [template]);

  const firstUserMessage = useMemo(() => {
    return [
      `1) Şu alanda zorlanıyorum: ${template.area}`,
      `2) Bu durum bende şu duyguyu yaratıyor: ${template.emotion}`,
      `3) En sık aklıma gelen düşünce: ${template.thought}`,
      `4) En zor an genelde şu olduğunda: ${template.hardMoment}`,
      `5) Şu ana kadar şunu denedim: ${template.tried}`
    ].join("\n");
  }, [template]);

  async function sendMessage(content) {
    setIsSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          condition,
          messages: [...messages, { role: "user", content }]
        })
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const reply = data.reply;

      setMessages((prev) => [
        ...prev,
        { role: "user", content },
        { role: "assistant", content: reply }
      ]);
      setTurnCount((prev) => prev + 1);
    } finally {
      setIsSending(false);
    }
  }

  async function startChat() {
    setPhase("chat");
    await sendMessage(firstUserMessage);
  }

  async function onSend() {
    if (!userInput.trim() || turnCount >= TURN_LIMIT) return;
    const msg = userInput.trim();
    setUserInput("");
    await sendMessage(msg);
    if (turnCount + 1 >= TURN_LIMIT) setPhase("post");
  }

  function downloadJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session_${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function finishStudy() {
    downloadJSON({
      sessionId,
      condition,
      preDistress,
      postDistress,
      manipulationCheck: mc,
      messages,
      timestamp: new Date().toISOString()
    });
    setPhase("done");
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Chatbot Study</h1>
      <p>Bu sohbet bir terapi değildir.</p>

      {phase === "pre" && (
        <>
          <h2>Başlangıç</h2>
          <input
            type="range"
            min="0"
            max="100"
            value={preDistress}
            onChange={(e) => setPreDistress(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <p>{preDistress}</p>
          <button onClick={() => setPhase("template")}>Devam</button>
        </>
      )}

      {phase === "template" && (
        <>
          <h2>Şablon</h2>
          {Object.entries(template).map(([key, value]) => (
            <input
              key={key}
              placeholder={key}
              value={value}
              onChange={(e) =>
                setTemplate((p) => ({ ...p, [key]: e.target.value }))
              }
              style={{ display: "block", width: "100%", marginBottom: 8 }}
            />
          ))}
          <button disabled={!canStartChat} onClick={startChat}>
            Sohbeti Başlat
          </button>
        </>
      )}

      {phase === "chat" && (
        <>
          <h2>Sohbet ({turnCount}/{TURN_LIMIT})</h2>
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            {messages.map((m, i) => (
              <p key={i}>
                <strong>{m.role}:</strong> {m.content}
              </p>
            ))}
          </div>
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            style={{ width: "100%", marginTop: 10 }}
          />
          <button onClick={onSend}>Gönder</button>
        </>
      )}

      {phase === "post" && (
        <>
          <h2>Son</h2>
          <input
            type="range"
            min="0"
            max="100"
            value={postDistress}
            onChange={(e) => setPostDistress(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <p>{postDistress}</p>

          {Object.entries(mc).map(([key, value]) => (
            <input
              key={key}
              type="range"
              min="1"
              max="5"
              value={value}
              onChange={(e) =>
                setMc((p) => ({ ...p, [key]: Number(e.target.value) }))
              }
              style={{ width: "100%" }}
            />
          ))}

          <button onClick={finishStudy}>Bitir</button>
        </>
      )}

      {phase === "done" && <h2>Teşekkürler</h2>}
    </div>
  );
}
