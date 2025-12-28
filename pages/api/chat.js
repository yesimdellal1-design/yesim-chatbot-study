import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, step } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive, non-therapeutic chatbot used in an academic study. Do not give therapy or medical advice.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ error: "API error" });
  }
}
