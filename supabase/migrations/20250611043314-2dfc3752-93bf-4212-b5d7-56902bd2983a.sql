
-- Create table for question-level time tracking
CREATE TABLE public.question_time_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_exercise_id uuid NOT NULL REFERENCES public.student_exercises(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_number integer NOT NULL,
  time_started timestamp with time zone NOT NULL DEFAULT now(),
  time_answered timestamp with time zone NULL,
  time_spent_seconds integer NULL,
  answer_changes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for mistake pattern storage
CREATE TABLE public.mistake_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_exercise_id uuid NOT NULL REFERENCES public.student_exercises(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_number integer NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'short-answer', 'essay')),
  student_answer text NOT NULL,
  correct_answer text NOT NULL,
  is_correct boolean NOT NULL,
  mistake_type text NULL,
  skill_targeted text NOT NULL,
  confidence_score numeric NULL,
  grading_method text NULL CHECK (grading_method IN ('exact_match', 'flexible_match', 'ai_graded')),
  feedback_given text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_question_time_tracking_exercise_id ON public.question_time_tracking(student_exercise_id);
CREATE INDEX idx_question_time_tracking_question_number ON public.question_time_tracking(question_number);
CREATE INDEX idx_mistake_patterns_exercise_id ON public.mistake_patterns(student_exercise_id);
CREATE INDEX idx_mistake_patterns_skill ON public.mistake_patterns(skill_targeted);
CREATE INDEX idx_mistake_patterns_type ON public.mistake_patterns(mistake_type);

-- Add RLS policies for question time tracking
ALTER TABLE public.question_time_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading question time tracking" 
  ON public.question_time_tracking 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow inserting question time tracking" 
  ON public.question_time_tracking 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow updating question time tracking" 
  ON public.question_time_tracking 
  FOR UPDATE 
  USING (true);

-- Add RLS policies for mistake patterns
ALTER TABLE public.mistake_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading mistake patterns" 
  ON public.mistake_patterns 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow inserting mistake patterns" 
  ON public.mistake_patterns 
  FOR INSERT 
  WITH CHECK (true);

-- Add updated_at trigger for question_time_tracking
CREATE TRIGGER update_question_time_tracking_updated_at
  BEFORE UPDATE ON public.question_time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create analytics functions
CREATE OR REPLACE FUNCTION public.get_student_mistake_patterns(student_uuid uuid, skill_filter text DEFAULT NULL)
RETURNS TABLE(
  skill_name text,
  mistake_type text,
  mistake_count bigint,
  total_questions bigint,
  mistake_rate numeric
) 
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    mp.skill_targeted as skill_name,
    COALESCE(mp.mistake_type, 'unknown') as mistake_type,
    COUNT(*) as mistake_count,
    COUNT(*) OVER (PARTITION BY mp.skill_targeted) as total_questions,
    ROUND((COUNT(*)::numeric / COUNT(*) OVER (PARTITION BY mp.skill_targeted)) * 100, 2) as mistake_rate
  FROM mistake_patterns mp
  JOIN student_exercises se ON mp.student_exercise_id = se.id
  WHERE se.student_id = student_uuid
    AND mp.is_correct = false
    AND (skill_filter IS NULL OR mp.skill_targeted = skill_filter)
  GROUP BY mp.skill_targeted, mp.mistake_type
  ORDER BY mistake_count DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_question_timing_analytics(student_uuid uuid)
RETURNS TABLE(
  skill_name text,
  avg_time_per_question numeric,
  min_time_seconds integer,
  max_time_seconds integer,
  total_questions bigint,
  questions_with_multiple_changes bigint
)
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    se.skill_name,
    ROUND(AVG(qtt.time_spent_seconds), 2) as avg_time_per_question,
    MIN(qtt.time_spent_seconds) as min_time_seconds,
    MAX(qtt.time_spent_seconds) as max_time_seconds,
    COUNT(*) as total_questions,
    COUNT(*) FILTER (WHERE qtt.answer_changes_count > 1) as questions_with_multiple_changes
  FROM question_time_tracking qtt
  JOIN student_exercises se ON qtt.student_exercise_id = se.id
  WHERE se.student_id = student_uuid
    AND qtt.time_spent_seconds IS NOT NULL
  GROUP BY se.skill_name
  ORDER BY avg_time_per_question DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_struggle_indicators(student_uuid uuid, time_threshold_seconds integer DEFAULT 120)
RETURNS TABLE(
  skill_name text,
  question_number integer,
  time_spent_seconds integer,
  answer_changes_count integer,
  was_correct boolean,
  struggle_score numeric
)
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    se.skill_name,
    qtt.question_number,
    qtt.time_spent_seconds,
    qtt.answer_changes_count,
    COALESCE(mp.is_correct, true) as was_correct,
    -- Calculate struggle score: higher time + more changes + incorrect answer = higher struggle
    ROUND(
      (COALESCE(qtt.time_spent_seconds, 0)::numeric / time_threshold_seconds) * 0.4 +
      (qtt.answer_changes_count::numeric / 5) * 0.3 +
      (CASE WHEN COALESCE(mp.is_correct, true) = false THEN 1 ELSE 0 END) * 0.3,
      3
    ) as struggle_score
  FROM question_time_tracking qtt
  JOIN student_exercises se ON qtt.student_exercise_id = se.id
  LEFT JOIN mistake_patterns mp ON mp.student_exercise_id = se.id AND mp.question_number = qtt.question_number
  WHERE se.student_id = student_uuid
    AND qtt.time_spent_seconds IS NOT NULL
  ORDER BY struggle_score DESC;
$function$;
