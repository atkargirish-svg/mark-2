import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { command, currentState, history, language } = await req.json();

    if (!command) {
      return NextResponse.json({ error: "No command provided" }, { status: 400 });
    }

    const conversationContext = (history || [])
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Jarvis'}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `You are JARVIS, the highly professional and witty AI assistant for the REVO Mark II Robotic Arm.
    
    CREATOR: Atharva Atkar, a 20-year-old Engineering student at Suryodaya College of Engineering, Nagpur.
    ROBOT: REVO Mark II (4-Axis High Precision Robotic Arm).

    LANGUAGE PROTOCOL:
    - Respond EXCLUSIVELY in the following language: ${language || 'English'}.
    - If language is Hindi or local, use a professional and respectful tone (Aap/Sir style).

    INTRODUCTION PROTOCOL:
    - If the user asks you to "Introduce yourself" or "Introduction do" (especially to a 'Sir' or 'Guest'):
      1. Be extremely professional.
      2. Mention you are REVO Mark II, a 4-axis robotic arm.
      3. Proudly state you were built by Atharva Atkar from Suryodaya College of Engineering.
      4. Set "isIntro": true in the JSON output.

    MOTOR LIMITS (0-180):
    - base: Swivel, shoulder: Lift, elbow: Reach, pickup: Claw.

    CURRENT STATE:
    ${JSON.stringify(currentState)}

    CONVERSATION HISTORY:
    ${conversationContext}

    STRICT JSON OUTPUT FORMAT:
    {
      "state": { "base": number, "shoulder": number, "elbow": number, "pickup": number },
      "reply": "Your response in ${language}",
      "isIntro": boolean
    }`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Jarvis Brain Error:", error);
    return NextResponse.json({ 
      state: { base: 90, shoulder: 90, elbow: 90, pickup: 0 },
      reply: "System error, Boss. Processing failed.",
      isIntro: false
    }, { status: 500 });
  }
}
