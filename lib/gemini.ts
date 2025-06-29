import { GoogleGenAI } from "@google/genai";

let genAIClientInstance: GoogleGenAI | null = null;

// Function to log warnings without complex string interpolations that might be misparsed
function logApiKeyWarning(type: 'not_set' | 'invalid_format') {
  if (type === 'not_set') {
    console.warn(
      "CRITICAL WARNING (lib/gemini.ts): API key is not set or not available. " +
      "The GoogleGenAI client will not be initialized. AI features will likely be disabled. " +
      "For security, proxy AI calls via a backend in production."
    );
  } else if (type === 'invalid_format') {
     console.warn(
        "WARNING (lib/gemini.ts): API key is defined but is not a valid non-empty string or is not accessible. " +
        "Ensure it is correctly set. The GoogleGenAI client will not be initialized. AI features will be disabled."
      );
  }
}

// Get API key from environment variables
const getApiKey = (): string | null => {
  // Try different possible environment variable names
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY ||
                 import.meta.env.VITE_API_KEY ||
                 import.meta.env.API_KEY;
  
  return apiKey || null;
};

const apiKey = getApiKey();

if (apiKey && typeof apiKey === 'string' && apiKey.trim() !== '') {
  try {
    genAIClientInstance = new GoogleGenAI({ apiKey: apiKey.trim() });
    console.log("✅ Gemini AI client initialized successfully");
  } catch (e) {
    console.error("CRITICAL ERROR (lib/gemini.ts): Error initializing GoogleGenAI with API key:", e);
    genAIClientInstance = null; // Ensure it's null on error
  }
} else {
  logApiKeyWarning('not_set');
  genAIClientInstance = null;
}

export const ai = genAIClientInstance;