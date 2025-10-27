import { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Task, AnalysisReport, AppSettings } from '../types';

export const useAIActions = (tasks: Task[], settings: AppSettings) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const analyzeTasks = async (): Promise<AnalysisReport | null> => {
    if (!settings.aiEnabled || !settings.apiKey) {
      return { summary: "AI features are disabled or API key is not set.", priorities: [] };
    }
    setIsAnalyzing(true);
    try {
      const result = await geminiService.analyzeTasks(tasks, settings.apiKey);
      return result;
    } catch (error) {
      console.error("AI Analysis failed", error);
      const errorReport = { summary: "An error occurred during analysis. Please check your API key and try again.", priorities: [] };
      return errorReport;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const findFocusTask = async () => {
    if (!settings.aiEnabled || !settings.apiKey) return;
    setIsAnalyzing(true);
    try {
      const focusedId = await geminiService.getFocusTask(tasks, settings.apiKey);
      setFocusTaskId(focusedId);
    } catch (error) {
      console.error("Focus mode failed", error);
      setFocusTaskId(null);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const clearFocusTask = () => {
    setFocusTaskId(null);
  };

  return {
    isAnalyzing,
    focusTaskId,
    analyzeTasks,
    findFocusTask,
    clearFocusTask,
  };
 };