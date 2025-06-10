
-- Create a function for session monitoring that respects RLS
CREATE OR REPLACE FUNCTION public.get_session_monitoring_data(session_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  class_session_id uuid,
  student_id uuid,
  student_name text,
  skill_name text,
  original_skill_score numeric,
  status text,
  exercise_score numeric,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  session_name text,
  teacher_id uuid,
  class_id uuid,
  is_active boolean,
  lesson_plan_id uuid,
  class_name text,
  subject text,
  grade text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    se.id,
    se.class_session_id,
    se.student_id,
    se.student_name,
    se.skill_name,
    se.skill_score as original_skill_score,
    se.status,
    se.score as exercise_score,
    se.started_at,
    se.completed_at,
    se.created_at,
    se.updated_at,
    cs.session_name,
    cs.teacher_id,
    cs.class_id,
    cs.is_active,
    lp.id as lesson_plan_id,
    lp.class_name,
    lp.subject,
    lp.grade
  FROM student_exercises se
  JOIN class_sessions cs ON se.class_session_id = cs.id
  LEFT JOIN lesson_plans lp ON cs.lesson_plan_id = lp.id
  WHERE 
    cs.teacher_id = auth.uid() AND
    (session_id IS NULL OR cs.id = session_id);
$$;

-- Drop the problematic view
DROP VIEW IF EXISTS public.session_monitoring_view;
