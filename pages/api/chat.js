import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const { messages = [], condition = "informational" } = req.body || {};

    const systemPrompt =
      condition === "empathic"
        ? "You are a warm, empathic, supportive conversational partner. Keep responses concise."
        : "You are a neutral, informational assistant. Keep responses concise.";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
    });

    const reply = completion?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: "No reply returned from model" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return res.status(500).json({
      error: err?.message || "Unknown server error",
    });
  }
}
