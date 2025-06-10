
-- Add exercises_data column to lesson_plans table to store pre-generated exercises
ALTER TABLE public.lesson_plans 
ADD COLUMN exercises_data jsonb DEFAULT NULL;

-- Add comment to document the new column
COMMENT ON COLUMN public.lesson_plans.exercises_data IS 'Stores pre-generated and potentially edited exercises for each student in the lesson plan. NULL means exercises will be generated on session start.';
