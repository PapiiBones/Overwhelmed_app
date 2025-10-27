import { GoogleGenAI, Type, Content as GeminiChatMessage } from "@google/genai";
import { Task, Importance, ChatMessage, Project, AnalysisReport, RecurrenceRule, Subtask, Tag } from '../types';

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

const recurrenceRuleSchema = {
    type: Type.OBJECT,
    description: "The recurrence rule for the task, if it's a repeating task.",
    properties: {
        frequency: { type: Type.STRING, enum: ['daily', 'weekly', 'monthly'] },
        interval: { type: Type.NUMBER, description: "The interval for the frequency, e.g., every 2 weeks would be frequency: 'weekly', interval: 2. Defaults to 1." }
    },
    required: ['frequency']
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
    },
    isPriority: { type: Type.BOOLEAN, description: "Set to true if the task sounds like a top priority or very urgent." },
    recurrenceRule: recurrenceRuleSchema,
    subtasks: {
        type: Type.ARRAY,
        description: "A list of subtasks extracted from the user's input, like from a bulleted list.",
        items: { type: Type.STRING }
    },
    tags: {
        type: Type.ARRAY,
        description: "A list of tags extracted from hashtags in the user's input, without the '#'.",
        items: { type: Type.STRING }
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
        projectId: { type: Type.STRING, description: "The ID of the project to move the task to, if mentioned." },
        isPriority: { type: Type.BOOLEAN },
        recurrenceRule: recurrenceRuleSchema,
        subtasks: {
            type: Type.ARRAY,
            description: "A new list of subtasks if the user added them.",
            items: { type: Type.STRING }
        },
        tags: {
            type: Type.ARRAY,
            description: "A new list of tags extracted from hashtags in the user's input, without the '#'. This should replace existing tags.",
            items: { type: Type.STRING }
        }
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


// Fix: Use Omit to prevent conflicting types for the 'subtasks' and 'tags' properties.
const getSmartTask = async (prompt: string, apiKey: string): Promise<Omit<Partial<Task>, 'subtasks' | 'tagIds'> & { subtasks?: string[]; tags?: string[] }> => {
    if (!apiKey) throw new Error("API Key is required for AI features.");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the following user input to extract structured task details. Today's date is ${new Date().toDateString()}.
- The 'content' field MUST be the user's input, verbatim. Do not correct or alter it.
- From the user's text, extract the 'dueDate' in ISO 8601 format. Be robust in parsing phrases like 'end of next week', 'in 3 days', 'every other Tuesday at 3pm', 'the 15th of every month'.
- From the user's text, extract any 'recurrenceRule'. Provide clear examples:
  - "every Monday" -> { frequency: 'weekly', interval: 1 }
  - "daily" -> { frequency: 'daily', interval: 1 }
  - "monthly" -> { frequency: 'monthly', interval: 1 }
  - "every 2 weeks" -> { frequency: 'weekly', interval: 2 }
- If the input contains a list (e.g., lines starting with '-', '*', or numbers), extract them as an array of strings in the 'subtasks' field.
- If the user's input contains hashtags (e.g., #work, #urgent), extract them as an array of strings in the 'tags' field. The tag should be the word without the '#' symbol.
- Also extract 'contact', 'importance', and 'isPriority' if mentioned.

User Input: "${prompt}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: getSmartTaskSchema,
        },
    });
    
    const result = safeParseJson<Omit<Partial<Task>, 'subtasks' | 'tagIds'> & { subtasks?: string[]; tags?: string[] }>(response.text);
    result.content = prompt;
    return result;
};

// Fix: Use Omit to prevent conflicting types for the 'subtasks' and 'tags' properties.
const getSmartUpdate = async (prompt: string, originalTask: Task, projects: Project[], apiKey: string): Promise<Omit<Partial<Task>, 'subtasks' | 'tagIds'> & { subtasks?: string[]; tags?: string[] }> => {
    if (!apiKey) throw new Error("API Key is required for AI features.");
    const ai = new GoogleGenAI({ apiKey });
    const projectList = projects.map(p => `"${p.name}" (ID: ${p.id})`).join(', ');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `The user has edited a task's content. Analyze the *new text* to extract updated structured data. Today is ${new Date().toDateString()}.
Return a JSON object containing ONLY the fields that should be updated.

- **Date and Recurrence Parsing**: Analyze the new text for any date, time, or recurrence information. Be robust.
  - Parse complex phrases like 'every other Friday', 'the last day of the month', or 'in 3 weeks' into a 'dueDate' (ISO 8601 format) and/or a 'recurrenceRule'.
  - Recurrence Examples: "do laundry every Sunday" -> { "recurrenceRule": { "frequency": "weekly", "interval": 1 } }, "pay rent monthly" -> { "recurrenceRule": { "frequency": "monthly", "interval": 1 } }.
- **Content Cleaning**: The 'content' field should be the final, clean task description. If instructional phrases like "remind me to..." were used, remove them. Otherwise, the new text itself is the new content.
- **Subtasks**: If the new text contains a list, extract it into the 'subtasks' field as an array of strings. This should replace any existing subtasks.
- **Tags**: If the new text contains hashtags (e.g., #research), extract them into the 'tags' field as an array of strings. This should replace any existing tags.
- **Other fields**: Update 'contact', 'importance', 'isPriority', or 'projectId' if mentioned.

Available projects: [${projectList}]

Original Task Content: "${originalTask.content}"
New Task Content: "${prompt}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: getSmartUpdateSchema,
        },
    });

    return safeParseJson<Omit<Partial<Task>, 'subtasks' | 'tagIds'> & { subtasks?: string[]; tags?: string[] }>(response.text);
};


const analyzeTasks = async (tasks: Task[], apiKey: string): Promise<AnalysisReport> => {
    if (!apiKey) throw new Error("API Key is required for AI features.");
    const ai = new GoogleGenAI({ apiKey });
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

const getFocusTask = async (tasks: Task[], apiKey: string): Promise<string | null> => {
    if (!apiKey) throw new Error("API Key is required for AI features.");
    const ai = new GoogleGenAI({ apiKey });
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


const getChatResponse = async (history: ChatMessage[], newMessage: string, tasks: Task[], projects: Project[], tags: Tag[], apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required for AI features.");
    const ai = new GoogleGenAI({ apiKey });

    const taskContext = tasks.length > 0
        ? `Here is the user's current list of tasks:\n${tasks.map(t => `- [${t.completed ? 'X' : ' '}] ${t.content} (ID: ${t.id}, Importance: ${t.importance}, Project: ${projects.find(p=>p.id === t.projectId)?.name || 'Inbox'})`).join('\n')}`
        : "The user currently has no tasks.";

    const projectContext = projects.length > 0
        ? `Here are the user's projects:\n${projects.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`
        : "The user has not created any projects yet.";

    const tagContext = tags.length > 0
        ? `Here are the user's tags:\n${tags.map(t => `- ${t.name} (ID: ${t.id})`).join('\n')}`
        : "The user has not created any tags yet.";

    const systemInstruction = `You are a helpful AI assistant for the "Overwhelmed" planner app. You have access to the user's current tasks, projects, and tags. Your role is to answer questions about their tasks, provide encouragement, and help them organize their day. Be concise, friendly, and supportive. Today's date is ${new Date().toDateString()}.\n\n${taskContext}\n\n${projectContext}\n\n${tagContext}`;
    
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

const transcribeAudio = async (audioBase64: string, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required for audio transcription.");
    const ai = new GoogleGenAI({ apiKey });

    const audioPart = {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    };

    const textPart = {
      text: "Transcribe this audio recording of a user stating a task they want to add to their planner.",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
    });

    return response.text.trim();
  };

export const geminiService = {
  getSmartTask,
  analyzeTasks,
  getChatResponse,
  getSmartUpdate,
  getFocusTask,
  transcribeAudio,
};