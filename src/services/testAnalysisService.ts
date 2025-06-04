
import { createClient } from '@supabase/supabase-js'

// Lazy initialization of Supabase client
let supabase: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!supabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing. Please ensure your Supabase integration is properly set up.')
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabase;
}

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
    const client = getSupabaseClient();
    const { data, error } = await client.functions.invoke('extract-text', {
      body: request
    })

    if (error) {
      throw new Error(`Failed to extract text: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error calling extract-text function:', error)
    throw new Error('Failed to extract text from file. Please try again.')
  }
}

export const analyzeTest = async (request: AnalyzeTestRequest): Promise<AnalyzeTestResponse> => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.functions.invoke('analyze-test', {
      body: request
    })

    if (error) {
      throw new Error(`Failed to analyze test: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error calling analyze-test function:', error)
    throw new Error('Failed to analyze test. Please try again.')
  }
}
