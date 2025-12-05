import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard } from '../types';

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
        systemInstruction: "You are an expert tutor helper. Your goal is to create high-quality study materials.",
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
  mimeType: string
): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    Analyze the attached document/image again.
    Provide a comprehensive, well-structured markdown summary of the key concepts.
    Focus on clarity and educational value.
    Ensure the summary is detailed, complete, and does not stop abruptly.
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
        systemInstruction: "You are an expert tutor helper.",
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
  
  // For simplicity in this demo, we are sending the doc context with every message or starting a fresh chat with context.
  // A more advanced version would cache the context. 
  // Here, we'll use generateContent with the history + new message + doc for stateless simplicity or construct a proper chat history.
  
  // Construct the chat history for the API
  // We need to inject the document into the FIRST user message effectively.
  
  const contents = [];
  
  // Add the document to the first message or as context
  // To keep it simple and robust, we will just send the document as part of the current turn's context if the history is short, 
  // or rely on the model's ability to handle the document if we start a chat session.
  
  // Let's use the chat API properly.
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: "You are a helpful study assistant. Answer questions based on the provided document.",
    },
  });

  // Since we can't easily "upload" the file to a persistent history in the REST API without caching,
  // we will prepend the document data to the very first message of the conversation logic.
  // However, since we are doing a single turn request here essentially (or managing history manually),
  // let's just use generateContent for the "chat" response to ensure the image/pdf is always in context.
  
  const chatHistoryParts = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  // Current message with document context
  const parts: any[] = [{ text: newMessage }];
  
  // If this is the first message or we want to ensure context, attach the file.
  // Gemini 2.5 Flash has a large context window, so sending the base64 again is usually fine for small docs.
  // Optimization: In a real app, use File API or Caching. Here, we send it every time to be safe and stateless.
  parts.unshift({
    inlineData: {
      mimeType: mimeType,
      data: base64Data
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
       ...chatHistoryParts, // Past history (text only to save bandwidth/tokens usually, but here we just rely on the new request having the image)
       { role: 'user', parts: parts }
    ]
  });

  return response.text || "I couldn't generate a response.";
};