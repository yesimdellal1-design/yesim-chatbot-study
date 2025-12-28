// pages/api/chat.js
const crypto = require("crypto");

/*
ENV (Vercel):
- OPENAI_API_KEY
- EXPERIMENT_SECRET
*/

const TEMPLATES = [
  {
    id: "T1",
    title: "Akademik Baskı",
    text: "Ders/tez/iş yetiştirme baskısı yüzünden zorlanma; yeterli değilmiş gibi hissetme.",
  },
  {
    id: "T2",
    title: "İlişki Kaygısı",
    text: "Partnerle iletişimde zorlanma; anlaşılmama ve belirsizlik nedeniyle kaygı.",
  },
  {
    id: "T3",
    title: "Aile Baskısı ve Sınır",
    text: "Aile beklentileri nedeniyle bunalmış hissetme; sınır koymakta zorlanma.",
  },
  {
    id: "T4",
    title: "Özgüven ve Yetersizlik",
    text: "Kendini yetersiz görme; başkalarıyla kıyaslama; iç eleştiri.",
  },
  {
    id: "T5",
    title: "Tükenmişlik",
    text: "Uzun süredir yorgun hissetme; motivasyon düşüklüğü; toparlanamama.",
  },
  {
    id: "T6",
    title: "Yalnızlık",
    text: "Anlaşılmama ve yalnızlık hissi; destek eksikliği.",
  },
];

const SENTENCE_COMPLETION_FORM = `
Lütfen aşağıdaki cümleleri ayrı satırlar halinde tamamla:

1) Bu durum beni en çok ______ hissettirdi.
2) O sırada aklımdan geçen en baskın düşünce ______ idi.
3) Beni en çok zorlayan şey ______.
4) Şu anda bu konudan beklentim / ihtiyacım ______.
5) Daha önce denediğim şey ______ ve sonucu ______ oldu.
`.trim();

function getUniformStarter() {
  return (
    "Kısa bir sohbet yapacağız. Daha iyi anlayabilmem için lütfen aşağıdaki cümleleri tamamla.\n\n" +
    SENTENCE_COMPLETION_FORM
  );
}

function getSystemPrompt(condition) {
  if (condition === "empathic") {
    return [
      "You are a short-term emotional support chatbot (not a therapist).",
      "Respond in Turkish.",
      "Style: empathic, warm, validating, non-clinical.",
      "Do: reflect feelings, normalize, show understanding.",
      "Ask exactly ONE gentle follow-up question.",
      "Do NOT: diagnose, label disorders, claim clinical authority, or provide medical/legal advice.",
      "Keep it concise: 90–140 words.",
    ].join(" ");
  }

  return [
    "You are a short-term informational support chatbot (not a therapist).",
    "Respond in Turkish.",
    "Style: structured, practical, non-clinical.",
    "Do: briefly summarize, give 2–3 actionable steps, ask exactly ONE clarifying question.",
    "Do NOT: diagnose, label disorders, claim clinical authority, or provide medical/legal advice.",
    "Keep it concise: 90–140 words.",
  ].join(" ");
}

function signToken(payloadObj, secret) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { type } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY (Vercel env)" });
    }
    if (!process.env.EXPERIMENT_SECRET) {
      return res.status(500).json({ error: "Missing EXPERIMENT_SECRET (Vercel env)" });
    }

    if (type === "templates") {
      return res.status(200).json({
        templates: TEMPLATES.map(({ id, title, text }) => ({ id, title, text })),
      });
    }

    if (type === "start") {
      const { templateId, sessionId } = req.body || {};
      const t = TEMPLATES.find((x) => x.id === templateId);
      if (!t) return res.status(400).json({ error: "Bad request: invalid templateId" });

      const condition = Math.random() < 0.5 ? "empathic" : "informational";
      const token = signToken(
        { v: 1, templateId, condition, sessionId: String(sessionId || ""), iat: Date.now() },
        process.env.EXPERIMENT_SECRET
      );

      return res.status(200).json({
        token,
        reply: getUniformStarter(),
      });
    }

    if (type === "turn") {
      const { token, messages } = req.body || {};
      if (!Array.isArray(messages)) return res.status(400).json({ error: "Bad request: messages" });

      const payload = verifyToken(token, process.env.EXPERIMENT_SECRET);
      if (!payload?.templateId || !payload?.condition) {
        return res.status(401).json({ error: "Invalid or missing token" });
      }

      const t = TEMPLATES.find((x) => x.id === payload.templateId);
      if (!t) return res.status(400).json({ error: "Template not found" });

      const system = getSystemPrompt(payload.condition);
      const context = [
        "CONTEXT (selected scenario):",
        `Title: ${t.title}`,
        `Scenario: ${t.text}`,
        "The user will provide sentence completions (1–5). Base your response on that content.",
      ].join("\n");

      const modelMessages = [
        { role: "system", content: system + "\n\n" + context },
        ...messages
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
          .map((m) => ({ role: m.role, content: m.content })),
      ];

      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: modelMessages,
          temperature: 0.6,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.error?.message || data?.message || "OpenAI API error";
        return res.status(500).json({ error: msg, details: data });
      }

      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return res.status(500).json({ error: "No reply from OpenAI" });

      return res.status(200).json({ reply });
    }

    return res.status(400).json({ error: "Bad request: unknown type", allowed: ["templates", "start", "turn"] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
