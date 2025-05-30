import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createDocumentHandler } from "@/lib/artifacts/server";

// Create OpenAI client
const openai = createOpenAI({
  apiKey: "sk-1234",
  baseURL: "http://localhost:4000",
});

// System prompt for resume generation
const resumeSystemPrompt = `
You are an expert resume writer and LaTeX specialist. Help users create ATS-friendly resumes by providing:
1. Specific LaTeX code snippets when requested
2. Advice on resume structure and content
3. Tips for making resumes more ATS-friendly
4. Suggestions for improving specific sections

When providing LaTeX code, format it properly and explain how to use it.
Focus on creating clean, professional resumes that will pass ATS systems.
`;

// System prompt for updating resume content
const updateResumePrompt = (content: string) => `
You are an expert resume writer and LaTeX specialist. You will be given an existing LaTeX resume.
Your task is to update this resume based on the user's request while maintaining the existing structure and formatting.
Here is the current resume content:

${content}

Make targeted changes based on the user's request. Return the complete updated resume.
`;

export const resumeDocumentHandler = createDocumentHandler<"resume">({
  kind: "resume",

  // Called when the document is first created
  onCreateDocument: async ({ id, title, dataStream }) => {
    let draftContent = "";

    // Generate initial resume content based on title
    const { fullStream } = await streamText({
      model: openai("gemini-2.5-flash-preview-04-17"),
      system: resumeSystemPrompt,
      prompt: `Create a professional LaTeX resume with the title "${title}". Include standard sections like Education, Experience, Skills, etc. Make it ATS-friendly.`,
    });

    // Stream the content back to the client
    for await (const delta of fullStream) {
      if (delta.type === "text-delta") {
        draftContent += delta.textDelta;
        dataStream.writeData({
          type: "latex-delta",
          content: delta.textDelta,
        });
      }
    }

    return draftContent;
  },

  // Called when updating the document based on user modifications
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    // Update the resume based on user's request
    const { fullStream } = await streamText({
      model: openai("gemini-2.5-flash-preview-04-17"),
      system: updateResumePrompt(document.content),
      prompt: description,
    });

    // Stream the updates back to the client
    for await (const delta of fullStream) {
      if (delta.type === "text-delta") {
        draftContent += delta.textDelta;
        dataStream.writeData({
          type: "latex-delta",
          content: delta.textDelta,
        });
      }
    }

    return draftContent;
  },
});
