
-- Create table for tracking student practice sessions
CREATE TABLE public.student_practice_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  skill_name text NOT NULL,
  current_skill_score numeric NOT NULL,
  class_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  grade text NOT NULL,
  difficulty_level text NOT NULL DEFAULT 'adaptive',
  question_count integer NOT NULL DEFAULT 4,
  exercise_generated boolean NOT NULL DEFAULT false,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  final_score numeric,
  improvement_shown numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for student practice analytics
CREATE TABLE public.student_practice_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  skill_name text NOT NULL,
  total_practice_sessions integer NOT NULL DEFAULT 0,
  average_score numeric,
  best_score numeric,
  improvement_rate numeric,
  last_practiced_at timestamp with time zone,
  streak_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_student_practice_sessions_student_id ON public.student_practice_sessions(student_id);
CREATE INDEX idx_student_practice_sessions_skill_name ON public.student_practice_sessions(skill_name);
CREATE INDEX idx_student_practice_analytics_student_id ON public.student_practice_analytics(student_id);

-- Add update trigger for updated_at columns
CREATE TRIGGER update_student_practice_sessions_updated_at
    BEFORE UPDATE ON public.student_practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_practice_analytics_updated_at
    BEFORE UPDATE ON public.student_practice_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for student practice sessions
ALTER TABLE public.student_practice_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student practice sessions
CREATE POLICY "Users can view their own practice sessions" 
  ON public.student_practice_sessions 
  FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "Users can create their own practice sessions" 
  ON public.student_practice_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own practice sessions" 
  ON public.student_practice_sessions 
  FOR UPDATE 
  USING (auth.uid() = student_id);

-- Enable RLS for student practice analytics
ALTER TABLE public.student_practice_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student practice analytics
CREATE POLICY "Users can view their own practice analytics" 
  ON public.student_practice_analytics 
  FOR SELECT 
  USING (auth.uid() = student_id);

CREATE POLICY "Users can create their own practice analytics" 
  ON public.student_practice_analytics 
  FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own practice analytics" 
  ON public.student_practice_analytics 
  FOR UPDATE 
  USING (auth.uid() = student_id);
