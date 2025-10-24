import { GoogleGenAI, Type, Content as GeminiChatMessage } from "@google/genai";
import { Task, Importance, ChatMessage, Project, AnalysisReport } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Safely parses a JSON string that might be wrapped in markdown backticks.
 * @param rawText The raw text response from the model.
 * @returns The parsed JSON object.
 */
const safeParseJson = <T>(rawText: string): T => {
    const cleanedText = rawText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
    try {
        return JSON.parse(cleanedText) as T;
    } catch (error) {
        console.error("Failed to parse JSON from Gemini:", cleanedText);
        throw new Error("Invalid JSON response from AI.");
    }
};

const getSmartTaskSchema = {
  type: Type.OBJECT,
  properties: {
    content: {
      type: Type.STRING,
      description: "The main content or description of the task. This should be the user's input, used verbatim, without any corrections or modifications.",
    },
    contact: { type: Type.STRING, description: 'Any person or contact associated with the task.' },
    importance: { type: Type.STRING, enum: Object.values(Importance), description: 'The importance level of the task.' },
    dueDate: {
        type: Type.STRING,
        description: "The due date and time for the task in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). Extract this from phrases like 'tomorrow at 5pm', 'next Friday', etc. Use the current date for context if needed.",
    }
  },
  required: ['content', 'importance'],
};

const getSmartUpdateSchema = {
    type: Type.OBJECT,
    properties: {
        content: { type: Type.STRING, description: "The final, clean content of the task, with any instructional phrases removed. Only return this field if the core task description has changed." },
        contact: { type: Type.STRING },
        importance: { type: Type.STRING, enum: Object.values(Importance) },
        dueDate: { type: Type.STRING },
        projectId: { type: Type.STRING, description: "The ID of the project to move the task to, if mentioned." }
    },
};

const analyzeTasksSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A brief, encouraging, and actionable summary of the user's tasks." },
        priorities: {
            type: Type.ARRAY,
            description: "A list of the top 3 priority task descriptions based on importance and due dates.",
            items: { type: Type.STRING }
        }
    },
    required: ['summary', 'priorities'],
};


const getSmartTask = async (prompt: string): Promise<Partial<Task>> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the following user input and extract task details. Today's date is ${new Date().toDateString()}. Use the user's input verbatim as the 'content' field. Do NOT proofread or correct the user's text. Based on the original text, determine the task content, associated contact (if any), a single importance level, and a specific due date (if mentioned). \n\nUser Input: "${prompt}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: getSmartTaskSchema,
        },
    });
    
    const result = safeParseJson<Partial<Task>>(response.text);
    // Always use the user's original input for the task content to ensure it's not accidentally modified by the AI.
    result.content = prompt;
    return result;
};

const getSmartUpdate = async (prompt: string, originalTask: Task, projects: Project[]): Promise<Partial<Task>> => {
    const projectList = projects.map(p => `"${p.name}" (ID: ${p.id})`).join(', ');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the user's command to update a task. Today is ${new Date().toDateString()}. Your goal is to extract structured data and determine the final, clean 'content'. The final content should be the core task description, with ALL instructional phrases (like 'make it due by', 'add contact', 'change importance to', 'move to project') completely removed. ONLY return fields that have changed. If the user's update was ONLY to change metadata (like due date or project), DO NOT return the content field. \n\nAvailable projects: [${projectList}]\n\nOriginal Task Content: "${originalTask.content}"\n\nUser's Updated Text: "${prompt}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: getSmartUpdateSchema,
        },
    });

    return safeParseJson<Partial<Task>>(response.text);
};


const analyzeTasks = async (tasks: Task[]): Promise<AnalysisReport> => {
    const activeTasks = tasks.filter(task => !task.completed);
    
    if (activeTasks.length === 0) {
        return {
            summary: "You have no active tasks. Great job staying on top of things!",
            priorities: [],
        };
    }

    const taskDescriptions = activeTasks.map(t => `- "${t.content}" (Importance: ${t.importance}${t.dueDate ? `, Due: ${new Date(t.dueDate).toLocaleString()}` : ''})`).join('\n');
    
    const prompt = `Here is a list of today's tasks:\n${taskDescriptions}\n\nProvide a brief, encouraging, and actionable summary. Identify the top 3 priorities based on importance and upcoming due dates.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: analyzeTasksSchema,
        },
    });

    return safeParseJson<AnalysisReport>(response.text);
};

const getFocusTask = async (tasks: Task[]): Promise<string | null> => {
    const activeTasks = tasks.filter(task => !task.completed);
    if (activeTasks.length < 2) {
        return activeTasks[0]?.id || null;
    }
    const taskDescriptions = activeTasks.map(t => `ID: ${t.id}, CONTENT: "${t.content}", IMPORTANCE: ${t.importance}, DUE: ${t.dueDate ? new Date(t.dueDate).toISOString() : 'None'}`).join('\n');
    const prompt = `Given the following list of tasks, identify the single most important and urgent task to focus on right now. Consider both importance and due date proximity. Respond with only the ID of that task. Today is ${new Date().toISOString()}.\n\nTASKS:\n${taskDescriptions}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const focusedId = response.text.trim();
    return activeTasks.some(t => t.id === focusedId) ? focusedId : activeTasks[0].id;
};


const getChatResponse = async (history: ChatMessage[], newMessage: string, tasks: Task[], projects: Project[]): Promise<string> => {
    const taskContext = tasks.length > 0
        ? `Here is the user's current list of tasks:\n${tasks.map(t => `- [${t.completed ? 'X' : ' '}] ${t.content} (ID: ${t.id}, Importance: ${t.importance}, Project: ${projects.find(p=>p.id === t.projectId)?.name || 'Inbox'})`).join('\n')}`
        : "The user currently has no tasks.";

    const projectContext = projects.length > 0
        ? `Here are the user's projects:\n${projects.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`
        : "The user has not created any projects yet.";

    const systemInstruction = `You are a helpful AI assistant for the "Overwhelmed" planner app. You have access to the user's current tasks and projects. Your role is to answer questions about their tasks, provide encouragement, and help them organize their day. Be concise, friendly, and supportive. Today's date is ${new Date().toDateString()}.\n\n${taskContext}\n\n${projectContext}`;
    
    const fullHistory: GeminiChatMessage[] = [
      ...history.map(m => ({
        role: m.role,
        parts: m.parts,
      })),
      { role: 'user', parts: [{ text: newMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: fullHistory,
      config: { systemInstruction },
    });
    
    return response.text;
};

export const geminiService = {
  getSmartTask,
  analyzeTasks,
  getChatResponse,
  getSmartUpdate,
  getFocusTask,
};
