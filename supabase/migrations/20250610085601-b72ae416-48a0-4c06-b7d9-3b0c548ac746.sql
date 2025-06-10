
-- Create lesson_plans table to store saved lesson plans
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL,
  class_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lesson_plan_students table to store student-skill associations
CREATE TABLE public.lesson_plan_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  target_skill_name TEXT NOT NULL,
  target_skill_score NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plan_students ENABLE ROW LEVEL SECURITY;

-- Create policies for lesson_plans (allowing all authenticated users to view and create)
CREATE POLICY "Anyone can view lesson plans" 
  ON public.lesson_plans 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create lesson plans" 
  ON public.lesson_plans 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update lesson plans" 
  ON public.lesson_plans 
  FOR UPDATE 
  USING (true);

-- Create policies for lesson_plan_students (allowing all authenticated users to view and create)
CREATE POLICY "Anyone can view lesson plan students" 
  ON public.lesson_plan_students 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create lesson plan students" 
  ON public.lesson_plan_students 
  FOR INSERT 
  WITH CHECK (true);

-- Add updated_at trigger for lesson_plans
CREATE TRIGGER update_lesson_plans_updated_at 
  BEFORE UPDATE ON public.lesson_plans 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
