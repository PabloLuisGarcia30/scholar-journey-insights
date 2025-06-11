
-- Remove the question_type column from mistake_patterns table
ALTER TABLE public.mistake_patterns DROP COLUMN question_type;

-- Update the table constraint to remove the question_type check
-- (The constraint will be automatically dropped when we drop the column)
