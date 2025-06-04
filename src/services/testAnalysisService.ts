
import { supabase } from "@/integrations/supabase/client";

export interface ExtractTextRequest {
  fileContent: string;
  fileName: string;
}

export interface ExtractTextResponse {
  extractedText: string;
  examId: string | null;
  fileName: string;
}

export interface AnalyzeTestRequest {
  files: Array<{
    fileName: string;
    extractedText: string;
  }>;
  examId: string;
}

export interface AnalyzeTestResponse {
  grade: string;
  feedback: string;
  analysis: string;
}

export const extractTextFromFile = async (request: ExtractTextRequest): Promise<ExtractTextResponse> => {
  try {
    console.log('Calling extract-text function with:', request.fileName);
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to extract text: ${error.message}`)
    }

    console.log('Extract-text function response:', data);
    return data
  } catch (error) {
    console.error('Error calling extract-text function:', error)
    throw new Error('Failed to extract text from file. Please try again.')
  }
}

export const analyzeTest = async (request: AnalyzeTestRequest): Promise<AnalyzeTestResponse> => {
  try {
    console.log('Calling analyze-test function with exam ID:', request.examId);
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to analyze test: ${error.message}`)
    }

    console.log('Analyze-test function response:', data);
    return data
  } catch (error) {
    console.error('Error calling analyze-test function:', error)
    throw new Error('Failed to analyze test. Please try again.')
  }
}
