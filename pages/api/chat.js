import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, messages, condition, template } = req.body;

    // 🔴 messages kontrolü
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // 🔴 son user mesajını güvenli şekilde al
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    if (type === "turn" && !lastUserMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 🔹 sistem promptu
    const systemPrompt = `
You are a research chatbot.
Condition: ${condition}

Rules:
- This is NOT therapy.
- Be neutral, ethical, and supportive.
- Ask at most one question per turn.
- Do not give medical advice.
`;

    // 🔹 OpenAI mesaj formatı
    const chatMessages = [
      { role: "system", content: systemPrompt },

      ...(type === "init"
        ? [
            {
              role: "assistant",
              content:
                "Merhaba. İstersen yaşadığın durumu kısaca anlatabilirsin.",
            },
          ]
        : messages),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: "Empty reply from model" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "API error",
      detail: err.message,
    });
  }
}
