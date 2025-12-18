import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, RegenerateOptions } from '../types';

// Initialize the client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSummaryAndFlashcards = async (
  base64Data: string,
  mimeType: string
): Promise<{ summary: string; flashcards: Flashcard[]; title: string }> => {
  const ai = getAiClient();
  
  // We will ask for a structured response with both summary and flashcards
  // We use a specific prompt to guide the model.
  const prompt = `
    Analyze the attached document/image.
    1. Generate a clear, engaging, and descriptive title for this content (do not use the filename).
    2. Provide a comprehensive, well-structured markdown summary of the key concepts. Focus on clarity and educational value. Ensure the summary is detailed, complete, and does not stop abruptly.
    3. Generate a list of 10-15 flashcards for studying this material. 
       - Each flashcard must have a clear question and a concise answer.
       - Provide 4 distinct options for the answer (one correct, three plausible distractors) for a multiple-choice mode.
  `;

  // Define the schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A descriptive title based on the document content.",
      },
      summary: {
        type: Type.STRING,
        description: "A detailed markdown summary of the content.",
      },
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 4 options including the correct answer.",
            }
          },
          required: ["question", "answer", "options"],
        },
      },
    },
    required: ["title", "summary", "flashcards"],
  };

  try {
    // Using Gemini 2.5 Flash as requested
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert university tutor. Your goal is to create high-quality, academic-grade study materials. Prioritize accuracy, depth, and clear structure.",
        maxOutputTokens: 8192,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text);
    
    // Add IDs to flashcards
    const flashcardsWithIds = result.flashcards.map((fc: any, index: number) => ({
      ...fc,
      id: `fc-${Date.now()}-${index}`,
    }));

    return {
      title: result.title || "Untitled Document",
      summary: result.summary,
      flashcards: flashcardsWithIds,
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

export const regenerateSummary = async (
  base64Data: string,
  mimeType: string,
  options: RegenerateOptions
): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    Analyze the attached document/image again and generate a new summary based on these settings:
    
    - Length: ${options.length}
    - Focus: ${options.focus}
    - Tone: ${options.tone}

    Guidelines:
    - If Focus is 'Overview': Provide a high-level summary of the main points.
    - If Focus is 'Exam-prep': Highlight key facts, dates, formulas, and potential exam questions.
    - If Focus is 'Definitions & Concepts': Focus on defining terms and explaining core concepts clearly.
    - If Focus is 'Deep-dive': Go into detail, explaining nuances and connections between topics.
    
    - If Tone is 'Concise': Use bullet points and short sentences.
    - If Tone is 'Explanatory': Use full paragraphs and connecting ideas.
    - If Tone is 'Step-by-step': Break down processes logically.

    Ensure the summary is well-structured in Markdown.
  `;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "A detailed markdown summary of the content.",
      },
    },
    required: ["summary"],
  };

  try {
      // Using Gemini 2.5 Flash as requested
      const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert university tutor.",
        maxOutputTokens: 8192,
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(text);
    return result.summary;

  } catch (error) {
    console.error("Error regenerating summary:", error);
    throw error;
  }
}

export const chatWithDocument = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  base64Data: string,
  mimeType: string
) => {
  const ai = getAiClient();
  
  // Using Gemini 2.5 Flash as requested
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      // Robust system instruction to prevent persona drift
      systemInstruction: "You are an intelligent study assistant for university students. You explain concepts clearly and accurately. When asked to simplify, use simple analogies but do not adopt a childish persona. Always return to a professional, academic tone for subsequent questions unless explicitly asked otherwise.",
    },
  });

  const chatHistoryParts = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  // Current message with document context
  const parts: any[] = [{ text: newMessage }];
  
  // We attach the file context to the latest message to ensure the model sees it immediately
  parts.unshift({
    inlineData: {
      mimeType: mimeType,
      data: base64Data
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
       ...chatHistoryParts, 
       { role: 'user', parts: parts }
    ]
  });

  return response.text || "I couldn't generate a response.";
};