import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, condition, messages, template } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing",
      });
    }

    let systemPrompt = `
You are a chatbot used in a psychology research study.
This is NOT therapy.
Do not give diagnoses or instructions.
Be supportive but neutral.
Limit responses to 3-5 sentences.
Language: Turkish.
`;

    if (condition === "empathic") {
      systemPrompt += `
Tone: empathic, validating emotions, reflective.
`;
    } else {
      systemPrompt += `
Tone: informational, neutral, structured.
`;
    }

    if (template) {
      systemPrompt += `
Context provided by user:
- Area: ${template.area}
- Emotion: ${template.emotion}
- Thought: ${template.thought}
- Hard moment: ${template.hardMoment}
- Tried before: ${template.tried}
`;
    }

    let chatMessages = [
      { role: "system", content: systemPrompt },
    ];

    if (type === "init") {
      chatMessages.push({
        role: "assistant",
        content:
          "Merhaba. İstersen yaşadığın durumu birkaç cümleyle paylaşabilirsin.",
      });
    } else {
      chatMessages = chatMessages.concat(messages);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 200,
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "OpenAI request failed",
    });
  }
}
