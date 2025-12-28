import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, messages, condition, template } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    let systemPrompt = `
You are a research chatbot.
This is NOT therapy.
Condition: ${condition}

User context:
- Area: ${template?.area || "-"}
- Emotion: ${template?.emotion || "-"}
- Thought: ${template?.thought || "-"}
- Hard moment: ${template?.hardMoment || "-"}
- Tried before: ${template?.tried || "-"}
`;

    if (condition === "empathic") {
      systemPrompt += `
Respond in an empathic, validating, emotionally supportive way.
Do NOT give advice.
Ask gentle follow-up questions.
`;
    } else {
      systemPrompt += `
Respond in a neutral, informational, structured way.
No emotional validation.
`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // en stabil
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages || []),
      ],
      temperature: condition === "empathic" ? 0.7 : 0.3,
      max_tokens: 200,
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({
      error: "OpenAI API error",
      details: err.message,
    });
  }
}
