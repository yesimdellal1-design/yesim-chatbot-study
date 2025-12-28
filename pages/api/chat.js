import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, condition } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY",
      });
    }

    const systemPrompt =
      condition === "empathic"
        ? "You are a warm, empathic, supportive conversational partner."
        : "You are a neutral, informational assistant.";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages || []),
      ],
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      error: error.message || "Unknown API error",
    });
  }
}
