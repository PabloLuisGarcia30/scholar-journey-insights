
-- Create table to store practice exercises generated for each student in a lesson plan
CREATE TABLE public.lesson_plan_practice_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  exercise_data JSONB NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'practice_test',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.lesson_plan_practice_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for lesson_plan_practice_exercises (allowing all authenticated users to view and create)
CREATE POLICY "Anyone can view lesson plan practice exercises" 
  ON public.lesson_plan_practice_exercises 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create lesson plan practice exercises" 
  ON public.lesson_plan_practice_exercises 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update lesson plan practice exercises" 
  ON public.lesson_plan_practice_exercises 
  FOR UPDATE 
  USING (true);
