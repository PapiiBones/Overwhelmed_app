import { GoogleGenAI, Type, Content as GeminiChatMessage } from "@google/genai";
import { Task, Importance, ChatMessage, Project, AnalysisReport, Tag } from '../types';

const safeParseJson = <T>(rawText: string): T => {
    // Handle cases where the AI might return an empty object for no changes.
    if (rawText.trim() === '{}') {
        return {} as T;
    }
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
      description: "The final, clean content of the task. If the user's input contains instructional phrases like 'remind me to...' or date/time info, this field should contain ONLY the core task description, with those phrases removed.",
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
        description: "A list of relevant tags or categories extracted from the user's input, such as 'work', 'personal', 'shopping'. Do not require a '#' prefix.",
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
        dueDate: { 
            type: Type.STRING,
            description: "The due date and time for the task in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). Extract this from phrases like 'tomorrow at 5pm', 'next Friday', etc. Use the current date for context if needed.",
        },
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
            description: "A new list of tags extracted from the new text. This should replace existing tags. Do not require a '#' prefix.",
            items: { type: Type.STRING }
        },
        suggestionText: {
            type: Type.STRING,
            description: "If any fields are being updated, this field MUST be included. It should be a short, human-readable summary of the changes proposed. Example: 'Set due date to tomorrow at 5pm and add #work tag.'"
        }
    },
};

const analyzeTasksSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A brief, encouraging, and actionable summary of the user's tasks." },
        priorities: {
            type: Type.ARRAY,
            description: "A list of the top 3-5 priority tasks based on importance and due dates.",
            items: {
                type: Type.OBJECT,
                properties: {
                    taskId: { type: Type.STRING, description: "The ID of the priority task." },
                    content: { type: Type.STRING, description: "The content of the priority task." }
                },
                required: ['taskId', 'content']
            }
        },
        bottlenecks: {
            type: Type.ARRAY,
            description: "A list of identified bottlenecks, where one or more tasks are blocked by an incomplete dependency.",
            items: {
                type: Type.OBJECT,
                properties: {
                    blockingTaskId: { type: Type.STRING, description: "The ID of the task that is blocking others." },
                    blockedTaskIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of IDs of tasks that are blocked." },
                    reason: { type: Type.STRING, description: "A brief explanation of why this is a bottleneck (e.g., 'Overdue task blocking two high-priority items')." }
                },
                required: ['blockingTaskId', 'blockedTaskIds', 'reason']
            }
        },
        suggestedGroups: {
            type: Type.ARRAY,
            description: "A list of suggested task groupings based on common themes, projects, or action types (e.g., 'All emails to send').",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name for the suggested group (e.g., 'Client Follow-ups')." },
                    taskIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of task IDs belonging to this group." },
                    reason: { type: Type.STRING, description: "A brief explanation for the grouping (e.g., 'These tasks are all related to the same project.')." }
                },
                required: ['name', 'taskIds', 'reason']
            }
        }
    },
    required: ['summary', 'priorities'],
};


// Fix: Update return type to include optional 'contact' string
const getSmartTask = async (prompt: string): Promise<Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[], contact?: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const timezoneOffset = new Date().getTimezoneOffset();
    const offsetHours = -timezoneOffset / 60;
    const offsetString = `UTC${offsetHours >= 0 ? '+' : ''}${String(Math.trunc(offsetHours)).padStart(2, '0')}:${String(Math.abs(offsetHours * 60) % 60).padStart(2, '0')}`;


    const systemInstruction = `You are an expert-level command parser for a planner app. Your job is to analyze a user's single-line input and create a structured task as a JSON object.

**CONTEXT:**
- Current Time (UTC): ${new Date().toISOString()}
- User's Approximate Timezone: ${offsetString}

**RULES (Follow these steps precisely):**

1.  **Core Content Extraction (Highest Priority):**
    -   Identify the main action the user wants to do. This will be the \`content\` field.
    -   You MUST REMOVE all instructional phrases ("remind me to"), dates, times, and tags from the final \`content\` field. This field must be clean.

2.  **Date/Time Extraction & Conversion (CRITICAL):**
    -   Scan the user input for any date or time phrases (e.g., "tomorrow at 5pm", "next Friday", "at 9am").
    -   You MUST assume the user is referring to their local time (see "User's Approximate Timezone" context).
    -   You MUST convert this local time to a complete and valid UTC ISO 8601 string for the \`dueDate\` field (e.g., "YYYY-MM-DDTHH:mm:ss.sssZ"). This is the most critical step.

3.  **Time-Only Logic (in User's Local Time):**
    -   If only a time is given (e.g., "call mom at 9am"), you MUST use the "Current Time" and "User's Timezone" to determine the user's current local time, and then decide the date:
        -   If the specified time is later today (in the user's local time), use today's date.
        -   If the specified time has already passed today (in the user's local time), use TOMORROW's date.

4.  **Tag Extraction:**
    -   Identify keywords that could be tags (e.g., "for work", "shopping"). Do not require a '#' prefix. Add them to a \`tags\` array of strings.

5.  **Other Properties:**
    -   Determine \`importance\` based on keywords like "urgent" or "critical". Default to "Medium".
    -   Extract any subtasks into a \`subtasks\` array of strings.

6.  **Final JSON:**
    -   Your output must be a valid JSON object containing all extracted properties. The \`content\` and \`importance\` fields are required.

**EXAMPLE SCENARIO:**
- Current Time (UTC): "2024-08-20T21:00:00.000Z"
- User's Approximate Timezone: "UTC-4"
- User Input: "remind me to submit the project proposal at 10am tomorrow"

**YOUR THOUGHT PROCESS (internal monologue):**
1.  The user's core task is "submit the project proposal".
2.  A time is mentioned: "10am tomorrow". This is in the user's local time (UTC-4).
3.  "Tomorrow" relative to the user is August 21st. The local due time is 10:00 AM on August 21st.
4.  To convert 10:00 AM from UTC-4 to UTC, I must ADD 4 hours.
5.  10:00 + 4 hours = 14:00 UTC.
6.  I will construct the final UTC ISO string: "2024-08-21T14:00:00.000Z".
7.  No special importance, default to "Medium".
8.  My final JSON will have \`content\`, \`dueDate\`, and \`importance\`.

**YOUR JSON OUTPUT FOR EXAMPLE:**
\`\`\`json
{
  "content": "Submit the project proposal",
  "dueDate": "2024-08-21T14:00:00.000Z",
  "importance": "Medium"
}
\`\`\``;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: getSmartTaskSchema,
        },
    });
    
    // Fix: Update safeParseJson generic to match new return type
    return safeParseJson<Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[]; contact?: string }>(response.text);
};

// Fix: Update return type to include optional 'contact' string
const getSmartUpdate = async (prompt: string, originalTask: Task, projects: Project[]): Promise<Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[]; suggestionText?: string; contact?: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const projectList = projects.map(p => `"${p.name}" (ID: ${p.id})`).join(', ');
    const timezoneOffset = new Date().getTimezoneOffset();
    const offsetHours = -timezoneOffset / 60;
    const offsetString = `UTC${offsetHours >= 0 ? '+' : ''}${String(Math.trunc(offsetHours)).padStart(2, '0')}:${String(Math.abs(offsetHours * 60) % 60).padStart(2, '0')}`;
    
    const systemInstruction = `You are an expert-level task property extractor for a planner app. Your job is to analyze the new user-provided task content and determine if any properties like due date, tags, or importance should be updated. You must return a JSON object with ONLY the changed fields.

**CONTEXT:**
- Current Time (UTC): ${new Date().toISOString()}
- User's Approximate Timezone: ${offsetString}
- Original Task Content: "${originalTask.content}"

**RULES (Follow these steps precisely):**

1.  **Analyze for Changes:** Compare the user input to the "Original Task Content".

2.  **Date/Time Extraction & Conversion (CRITICAL):**
    -   Scan the user input for any date or time phrases (e.g., "tomorrow", "at 5pm", "next Friday").
    -   You MUST assume the user is referring to their local time (see "User's Approximate Timezone" context).
    -   You MUST convert this local time to a complete and valid UTC ISO 8601 string for the \`dueDate\` field (e.g., "YYYY-MM-DDTHH:mm:ss.sssZ").

3.  **Time-Only Logic (in User's Local Time):**
    -   If only a time is given (e.g., "...at 9am"), you MUST use the "Current Time" and "User's Timezone" to determine the user's current local time, and then decide the date:
        -   If the specified time is later today (in local time), use today's date.
        -   If the specified time has already passed today (in local time), use TOMORROW's date.

4.  **Content Cleaning:**
    -   If you extracted a date, time, or tag, the main \`content\` field in your response MUST be the user input with that information removed.
    -   Only include the \`content\` field if it's different from the "Original Task Content" after cleaning.

5.  **Suggestion Text:**
    -   If and only if you are updating at least one field, you MUST create a short, human-readable summary of the changes in the \`suggestionText\` field. Example: "Set due date to tomorrow at 9:00 AM and update content."

6.  **Final JSON:**
    -   Your output must be a valid JSON object.
    -   If no properties changed, return an empty JSON object \`{}\`.
    -   Otherwise, return the JSON object containing ONLY the fields that changed (\`dueDate\`, \`content\`, \`tags\`, etc.) plus the mandatory \`suggestionText\`.

**EXAMPLE SCENARIO:**
- Current Time (UTC): "2024-08-20T21:00:00.000Z"
- User's Approximate Timezone: "UTC-4"
- Original Task Content: "Call the contractor"
- User Input (New Task Content): "Call the contractor at 11am"

**YOUR THOUGHT PROCESS (internal monologue):**
1.  The user added "at 11am". This is a local time.
2.  The current local time is 5 PM (21:00 UTC - 4 hours). 11 AM has already passed today for the user.
3.  Therefore, the due date must be for TOMORROW at 11 AM local time.
4.  Tomorrow's date is 2024-08-21. The local time is 11:00 AM.
5.  To convert 11:00 AM from local (UTC-4) to UTC, I must ADD 4 hours. 11:00 + 4 hours = 15:00 UTC.
6.  I will construct the UTC ISO string: "2024-08-21T15:00:00.000Z".
7.  The core content is unchanged.
8.  I need to create a \`suggestionText\`: "Set due date to tomorrow at 11:00 AM."
9.  My final JSON will have \`dueDate\` and \`suggestionText\`.

**YOUR JSON OUTPUT FOR EXAMPLE:**
\`\`\`json
{
  "dueDate": "2024-08-21T15:00:00.000Z",
  "suggestionText": "Set due date to tomorrow at 11:00 AM."
}
\`\`\``;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: getSmartUpdateSchema,
        },
    });

    // Fix: Update safeParseJson generic to match new return type
    return safeParseJson<Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[]; suggestionText?: string; contact?: string }>(response.text);
};

const analyzeTasks = async (tasks: Task[]): Promise<AnalysisReport> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const activeTasks = tasks.filter(task => !task.completed);
    
    if (activeTasks.length === 0) {
        return {
            summary: "You have no active tasks. Great job staying on top of things!",
            priorities: [],
        };
    }

    const taskDataForPrompt = activeTasks.map(t => ({
        id: t.id,
        content: t.content,
        importance: t.importance,
        dueDate: t.dueDate,
        dependencies: t.dependencies || [],
    }));
    
    const prompt = `Here is a list of the user's active tasks in JSON format:\n${JSON.stringify(taskDataForPrompt, null, 2)}\n\nBased on these tasks, provide a detailed analysis.`;

    const systemInstruction = `You are an expert productivity assistant. Your goal is to analyze a user's task list and provide insightful, actionable feedback. Today's date is ${new Date().toISOString()}.

Your analysis must include:
1.  **Summary**: A brief, encouraging, and actionable overview of the user's current workload.
2.  **Priorities**: Identify the top 3-5 tasks that require immediate attention. Base this on 'CRITICAL' or 'HIGH' importance and imminent or overdue due dates. For each, provide the task ID and its content.
3.  **Bottlenecks**: Identify tasks that are blocking other tasks. A bottleneck occurs when an incomplete task (the blocker) is in the 'dependencies' list of other tasks (the blocked). Prioritize bottlenecks where the blocker is overdue or of high-importance. Only include bottlenecks if there are any.
4.  **Suggested Groups**: Group tasks by common themes, projects, or contexts (e.g., 'All emails to send', 'Project Phoenix tasks'). This helps the user with batch processing. Only include suggested groups if you find meaningful ones.

Return your response strictly as a JSON object matching the provided schema. Do not include any other text or formatting.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: analyzeTasksSchema,
        },
    });

    return safeParseJson<AnalysisReport>(response.text);
};

const getFocusTask = async (tasks: Task[]): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

const getChatResponse = async (history: ChatMessage[], newMessage: string, tasks: Task[], projects: Project[], tags: Tag[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const transcribeAudio = async (audioBase64: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

// Fix: Update return type to include optional 'contact' string
const createTaskFromEmail = async (emailContent: string): Promise<Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[]; contact?: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const timezoneOffset = new Date().getTimezoneOffset();
    const offsetHours = -timezoneOffset / 60;
    const offsetString = `UTC${offsetHours >= 0 ? '+' : ''}${String(Math.trunc(offsetHours)).padStart(2, '0')}:${String(Math.abs(offsetHours * 60) % 60).padStart(2, '0')}`;
    
    const systemInstruction = `You are an expert-level email processor for a planner app. Your job is to analyze the full text of an email and extract a single, primary, actionable task. You must return a structured JSON object representing this task.

**CONTEXT:**
- Current Time (UTC): ${new Date().toISOString()}
- User's Approximate Timezone: ${offsetString}

**RULES (Follow these steps precisely):**

1.  **Identify the Primary Action:** Read the entire email and identify the single most important thing the recipient needs to do. If there are multiple actions, choose the most prominent or urgent one.
2.  **Summarize the Action (CRITICAL):** Create a concise summary of this action. This summary will be the \`content\` of the task. It should be clear and brief (e.g., "Draft the quarterly report", not the entire paragraph about it).
3.  **Extract Due Date (CRITICAL):**
    -   Scan the email for any mention of a deadline, due date, or meeting time (e.g., "by Friday at 5pm", "next Tuesday", "on the 15th").
    -   You MUST assume the user is referring to their local time (see "User's Approximate Timezone").
    -   You MUST convert this local time to a complete and valid UTC ISO 8601 string for the \`dueDate\` field.
    -   **If no specific date or deadline is mentioned, you MUST NOT create a \`dueDate\` field.**
4.  **Extract Other Details:**
    -   Identify any people involved and put the primary contact in the \`contact\` field.
    -   Determine the \`importance\` based on keywords like "urgent", "important", "ASAP". Default to "Medium".
    -   Extract any relevant keywords that could be tags (e.g., "report", "marketing", "clientX") into a \`tags\` array of strings.
5.  **Final JSON:**
    -   Your output must be a valid JSON object.
    -   The \`content\` and \`importance\` fields are required. If no due date is found, do not include the \`dueDate\` field in the JSON.

**EXAMPLE EMAIL:**
"Hey,
Just following up on our call. We'll need the draft for the Q3 marketing report by end of day this Friday. It's pretty important we get this to the board for review before next week. Let me know if you have any questions.
Thanks,
Jane"

**YOUR JSON OUTPUT FOR EXAMPLE:**
\`\`\`json
{
  "content": "Draft the Q3 marketing report",
  "dueDate": "YYYY-MM-DDTHH:mm:ss.sssZ", // The calculated UTC ISO string for Friday EOD
  "importance": "High",
  "contact": "Jane",
  "tags": ["marketing", "report"]
}
\`\`\``;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Use a more powerful model for long-form text
        contents: [{ role: 'user', parts: [{ text: emailContent }] }],
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: getSmartTaskSchema,
        },
    });
    
    // Fix: Update safeParseJson generic to match new return type
    return safeParseJson<Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[]; contact?: string }>(response.text);
};

export const geminiService = {
  getSmartTask,
  analyzeTasks,
  getChatResponse,
  getSmartUpdate,
  getFocusTask,
  transcribeAudio,
  createTaskFromEmail,
};