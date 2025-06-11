
-- Add the question_type column back to mistake_patterns table
ALTER TABLE public.mistake_patterns 
ADD COLUMN question_type text;

-- Add a check constraint to ensure valid question types
ALTER TABLE public.mistake_patterns 
ADD CONSTRAINT check_question_type 
CHECK (question_type IN ('multiple-choice', 'true-false', 'short-answer', 'essay') OR question_type IS NULL);

-- Update existing records to set question_type based on common patterns in student_answer and correct_answer
-- This is a best-effort update for existing data
UPDATE public.mistake_patterns 
SET question_type = CASE 
  WHEN correct_answer IN ('True', 'False', 'true', 'false') THEN 'true-false'
  WHEN LENGTH(student_answer) > 100 THEN 'essay'
  WHEN LENGTH(student_answer) > 20 THEN 'short-answer'
  ELSE 'multiple-choice'
END
WHERE question_type IS NULL;
