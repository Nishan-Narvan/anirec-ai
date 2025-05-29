// src/app/api/ai/chat/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  // 1. Get the API Key from your .env.local file
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // 1a. Basic check if the key is even there
  if (!GEMINI_API_KEY) {
    console.error("🔴 Gemini API Key not found in environment variables. Make sure it's in .env.local and the server was restarted if recently added.");
    return NextResponse.json({ error: "AI service not configured. API Key missing." }, { status: 500 });
  }

  try {
    // 2. Get the user's message from the request they sent
    // We expect them to send JSON like: { "prompt": "their message" }
    const reqBody = await request.json();
    const userPrompt = reqBody.prompt;

    // 2a. If they didn't send a prompt, complain.
    if (!userPrompt) {
      console.warn("🟡 No prompt provided in request body.");
      return NextResponse.json({ error: "No prompt provided in request body." }, { status: 400 });
    }

    console.log(`💬 User Prompt received: "${userPrompt}"`);

    // 3. Initialize the Google Gemini AI Client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Using gemini-pro model

    // 4. Send the prompt to Gemini and get the result
    console.log("⏳ Contacting Gemini API...");
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini's Response Text:", text);

    // 5. Send Gemini's reply back to whoever called this API
    return NextResponse.json({ reply: text });

  } catch (error) {
    console.error("🔴 Error during API call or processing request:", error);
    
    let errorMessage = "Failed to get response from AI.";
    let errorStatus = 500; // Internal Server Error by default

    if (error.message) {
        errorMessage = error.message; // Use the error message from the caught error
    }

    // More specific error handling for common issues
    if (error.message && error.message.toLowerCase().includes("api key not valid")) {
        errorMessage = "Gemini API Key is not valid. Please check your .env.local file and ensure it's correct.";
        errorStatus = 401; // Unauthorized
    } else if (error.message && error.message.toLowerCase().includes("quota")) {
        errorMessage = "API quota exceeded. Please check your Google Cloud console.";
        errorStatus = 429; // Too Many Requests
    } else if (error.message && error.message.toLowerCase().includes("model not found")) {
        errorMessage = "The specified AI model was not found. Check the model name.";
        errorStatus = 404; // Not Found
    } else if (error instanceof SyntaxError && error.message.includes("JSON")) {
        // This can happen if request.json() fails because the body isn't valid JSON
        errorMessage = "Invalid JSON in request body.";
        errorStatus = 400; // Bad Request
    }
    
    // It's good practice to not expose raw error objects directly to the client in production
    // For debugging, you might want to log error.stack or the full error object server-side
    console.error("Error details:", error.stack || error);

    return NextResponse.json({ error: errorMessage, details: "See server logs for more information." }, { status: errorStatus });
  }
}