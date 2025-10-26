import { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Task, AnalysisReport } from '../types';

export const useAIActions = (tasks: Task[]) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const analyzeTasks = async (): Promise<AnalysisReport | null> => {
    setIsAnalyzing(true);
    try {
      const result = await geminiService.analyzeTasks(tasks);
      return result;
    } catch (error) {
      console.error("AI Analysis failed", error);
      const errorReport = { summary: "An error occurred during analysis. Please try again.", priorities: [] };
      return errorReport;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const findFocusTask = async () => {
    setIsAnalyzing(true);
    try {
      const focusedId = await geminiService.getFocusTask(tasks);
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