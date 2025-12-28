// pages/api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { type, sessionId, condition, template, messages } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY (Vercel env)" });
    }

    // Basit system prompt (condition'a göre)
    const systemPrompt =
      condition === "empathic"
        ? "You are an empathic, supportive chatbot. Keep responses short, warm, and non-clinical. Do not claim to be a therapist."
        : "You are an informational, practical chatbot. Ask clarifying questions and offer actionable steps. Do not claim to be a therapist.";

    // init'te kullanıcı mesajı yokken de bir başlangıç mesajı üret
    if (type === "init") {
      const starter =
        condition === "empathic"
          ? "Merhaba. Burada kısa bir sohbet yapacağız. İstersen şu an seni en çok zorlayan şeyi 1-2 cümleyle yaz."
          : "Merhaba. İstersen hangi konuda destek istediğini 1-2 cümleyle yaz, birkaç soru sorup daha netleştireyim.";

      return res.status(200).json({ reply: starter });
    }

    // turn ise messages zorunlu
    if (type !== "turn" || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Bad request: type/messages" });
    }

    const templateText = template
      ? `Context (template):
- area: ${template.area || ""}
- emotion: ${template.emotion || ""}
- thought: ${template.thought || ""}
- hardMoment: ${template.hardMoment || ""}
- tried: ${template.tried || ""}`
      : "";

    const modelMessages = [
      { role: "system", content: systemPrompt + (templateText ? "\n\n" + templateText : "") },
      // UI'dan gelen konuşma
      ...messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
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
        temperature: 0.7,
      }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      // Vercel Runtime Logs'ta net görünsün diye error'u aynen geçiriyoruz
      const msg = data?.error?.message || data?.message || "OpenAI API error";
      return res.status(500).json({ error: msg, details: data });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(500).json({ error: "No reply from OpenAI", details: data });

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
