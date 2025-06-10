
-- Extend answer_keys table to support practice exercises and add explanation fields
ALTER TABLE answer_keys 
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS acceptable_answers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'exam',
ADD COLUMN IF NOT EXISTS practice_exercise_id UUID REFERENCES student_exercises(id);

-- Create index for better performance when fetching practice exercise answer keys
CREATE INDEX IF NOT EXISTS idx_answer_keys_practice_exercise_id ON answer_keys(practice_exercise_id);
CREATE INDEX IF NOT EXISTS idx_answer_keys_exam_id_exercise_type ON answer_keys(exam_id, exercise_type);

-- Add comments for clarity
COMMENT ON COLUMN answer_keys.explanation IS 'Detailed explanation for why this is the correct answer';
COMMENT ON COLUMN answer_keys.acceptable_answers IS 'Array of acceptable answer variations for flexible grading';
COMMENT ON COLUMN answer_keys.exercise_type IS 'Type of exercise: exam or practice';
COMMENT ON COLUMN answer_keys.practice_exercise_id IS 'Reference to student_exercises table for practice exercises';
