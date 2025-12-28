// pages/api/chat.js
const crypto = require("crypto");

/* ================= ENV =================
OPENAI_API_KEY
EXPERIMENT_SECRET
======================================== */

const TEMPLATES = [
  { id: "T1", title: "Akademik Baskı", text: "Akademik performansla ilgili zorlanma." },
  { id: "T2", title: "İlişki Kaygısı", text: "Romantik ilişkide yaşanan duygusal zorlanma." },
  { id: "T3", title: "Aile Baskısı", text: "Aile beklentileri ve sınırlar." },
  { id: "T4", title: "Özgüven", text: "Kendini yetersiz hissetme." },
];

const SENTENCE_COMPLETION_FORM = `
Lütfen aşağıdaki cümleleri **ayrı satırlar halinde** tamamla:

1) Bu durum beni en çok ______ hissettirdi.
2) O sırada aklımdan geçen en baskın düşünce ______ idi.
3) Beni en çok zorlayan şey ______.
4) Şu anda bu konudan beklentim / ihtiyacım ______.
5) Daha önce denediğim şey ______ ve sonucu ______ oldu.
`.trim();

function starterText() {
  return (
    "Kısa bir sohbet yapacağız. Daha iyi anlayabilmem için lütfen aşağıdaki cümleleri tamamla.\n\n" +
    SENTENCE_COMPLETION_FORM
  );
}

function systemPrompt(condition) {
  if (condition === "empathic") {
    return `
You are a short-term emotional support chatbot (not a therapist).
Respond in Turkish.
Style: empathic, warm, validating.
Reflect feelings, normalize, do NOT give advice.
Ask ONE gentle follow-up question.
Length: 90–140 words.
`.trim();
  }
  return `
You are a short-term informational support chatbot (not a therapist).
Respond in Turkish.
Style: structured, solution-focused.
Summarize briefly, give 2–3 practical steps.
Ask ONE clarifying question.
Length: 90–140 words.
`.trim();
}

/* ========== TOKEN HELPERS ========== */
function sign(payload, secret) {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const s = crypto.createHmac("sha256", secret).update(p).digest("base64url");
  return `${p}.${s}`;
}

function verify(token, secret) {
  if (!token) return null;
  const [p, s] = token.split(".");
  const check = crypto.createHmac("sha256", secret).update(p).digest("base64url");
  if (s !== check) return null;
  return JSON.parse(Buffer.from(p, "base64url").toString());
}

/* ========== HANDLER ========== */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type } = req.body || {};

  if (!process.env.OPENAI_API_KEY)
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  if (!process.env.EXPERIMENT_SECRET)
    return res.status(500).json({ error: "Missing EXPERIMENT_SECRET" });

  // ---- templates ----
  if (type === "templates") {
    return res.status(200).json({ templates: TEMPLATES });
  }

  // ---- start ----
  if (type === "start") {
    const { templateId, sessionId } = req.body;
    const condition = Math.random() < 0.5 ? "empathic" : "informational";

    const token = sign(
      { templateId, condition, sessionId, t: Date.now() },
      process.env.EXPERIMENT_SECRET
    );

    return res.status(200).json({
      token,
      reply: starterText(),
    });
  }

  // ---- turn ----
  if (type === "turn") {
    const { token, messages } = req.body;
    const payload = verify(token, process.env.EXPERIMENT_SECRET);
    if (!payload) return res.status(401).json({ error: "Invalid token" });

    const sys = systemPrompt(payload.condition);

    const chatMessages = [
      { role: "system", content: sys },
      ...messages,
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatMessages,
        temperature: 0.6,
      }),
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) return res.status(500).json({ error: "No reply" });

    return res.status(200).json({ reply });
  }

  return res.status(400).json({ error: "Unknown type" });
}
