
-- Create a separate table for practice exercise answer keys
CREATE TABLE public.practice_answer_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id uuid NOT NULL UNIQUE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.practice_answer_keys ENABLE ROW LEVEL SECURITY;

-- Policy to allow reading answer keys (for post-exercise review)
CREATE POLICY "Allow reading practice answer keys" 
  ON public.practice_answer_keys 
  FOR SELECT 
  USING (true);

-- Policy to allow inserting answer keys (when exercises are generated)
CREATE POLICY "Allow inserting practice answer keys" 
  ON public.practice_answer_keys 
  FOR INSERT 
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_practice_answer_keys_updated_at
  BEFORE UPDATE ON public.practice_answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups by exercise_id
CREATE INDEX idx_practice_answer_keys_exercise_id ON public.practice_answer_keys(exercise_id);
