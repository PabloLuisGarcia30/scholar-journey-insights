
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Global model cache to persist across function invocations
let cachedModel: any = null;
let isModelLoading = false;
let modelLoadPromise: Promise<any> | null = null;

async function loadDistilBertModel() {
  if (cachedModel) return cachedModel;
  
  if (isModelLoading) {
    return modelLoadPromise;
  }

  isModelLoading = true;
  console.log('Loading DistilBERT Tiny Quantized model...');

  try {
    // Import transformers dynamically to avoid bundle size issues
    const { pipeline } = await import('https://cdn.skypack.dev/@huggingface/transformers@3.5.2');
    
    modelLoadPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2', // Lightweight quantized model
      { 
        device: 'wasm',
        dtype: 'int8', // Use quantized INT8 for smaller size
        cache_dir: '/tmp/models'
      }
    );

    cachedModel = await modelLoadPromise;
    console.log('✅ DistilBERT WASM model loaded successfully');
    return cachedModel;
  } catch (error) {
    console.error('❌ Failed to load DistilBERT WASM model:', error);
    throw error;
  } finally {
    isModelLoading = false;
  }
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, ' ');
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vector dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity));
}

async function gradeWithWasmDistilBert(studentAnswer: string, correctAnswer: string) {
  const startTime = Date.now();
  
  try {
    const model = await loadDistilBertModel();
    
    const cleanStudent = normalizeText(studentAnswer);
    const cleanCorrect = normalizeText(correctAnswer);

    if (!cleanStudent) {
      return {
        isCorrect: false,
        confidence: 1.0,
        similarity: 0,
        method: 'wasm_distilbert',
        reasoning: 'No answer provided',
        processingTime: Date.now() - startTime
      };
    }

    // Get embeddings for both answers
    const [studentEmbedding, correctEmbedding] = await Promise.all([
      model(cleanStudent, { pooling: 'mean', normalize: true }),
      model(cleanCorrect, { pooling: 'mean', normalize: true })
    ]);

    // Convert tensors to arrays
    const studentVec = Array.from(studentEmbedding.data);
    const correctVec = Array.from(correctEmbedding.data);

    // Calculate similarity
    const similarity = calculateCosineSimilarity(studentVec, correctVec);
    const threshold = 0.75; // Similarity threshold for correctness
    const isCorrect = similarity >= threshold;
    
    // Calculate confidence based on similarity distance from threshold
    const confidence = similarity > 0.9 ? 0.95 : 
                      similarity > 0.8 ? 0.85 : 
                      similarity > 0.7 ? 0.75 : 
                      similarity > 0.6 ? 0.65 : 0.5;

    const processingTime = Date.now() - startTime;
    
    console.log(`🤖 WASM DistilBERT grading: ${similarity.toFixed(3)} similarity, ${processingTime}ms`);

    return {
      isCorrect,
      confidence,
      similarity,
      method: 'wasm_distilbert',
      reasoning: `WASM DistilBERT semantic analysis: "${cleanStudent}" vs "${cleanCorrect}". Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%). Result: ${isCorrect ? 'Correct' : 'Incorrect'}`,
      processingTime,
      modelInfo: {
        model: 'all-MiniLM-L6-v2',
        device: 'wasm',
        quantization: 'int8'
      }
    };

  } catch (error) {
    console.error('❌ WASM DistilBERT grading failed:', error);
    
    // Fallback to simple pattern matching
    const cleanStudent = normalizeText(studentAnswer);
    const cleanCorrect = normalizeText(correctAnswer);
    
    const isExactMatch = cleanStudent === cleanCorrect;
    const isCaseInsensitiveMatch = cleanStudent.toLowerCase() === cleanCorrect.toLowerCase();
    
    let isCorrect = false;
    let confidence = 0.3; // Low confidence for fallback
    
    if (isExactMatch) {
      isCorrect = true;
      confidence = 0.9;
    } else if (isCaseInsensitiveMatch) {
      isCorrect = true;
      confidence = 0.8;
    }

    return {
      isCorrect,
      confidence,
      similarity: isCorrect ? 0.9 : 0.1,
      method: 'pattern_fallback',
      reasoning: `WASM fallback pattern matching: "${studentAnswer}" vs "${correctAnswer}". ${isCorrect ? 'Match found' : 'No match'}`,
      processingTime: Date.now() - startTime,
      error: error.message
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { studentAnswer, correctAnswer, questionClassification } = body;

    if (!studentAnswer || !correctAnswer) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: studentAnswer and correctAnswer' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Pre-warm model on first request
    if (!cachedModel && !isModelLoading) {
      console.log('Pre-warming WASM DistilBERT model...');
      loadDistilBertModel().catch(console.error);
    }

    const result = await gradeWithWasmDistilBert(studentAnswer, correctAnswer);

    return new Response(
      JSON.stringify({ 
        success: true,
        result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in grade-with-distilbert-wasm function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
