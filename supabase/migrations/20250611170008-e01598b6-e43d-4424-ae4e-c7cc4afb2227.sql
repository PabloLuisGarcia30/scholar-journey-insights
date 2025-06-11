
-- Update the get_student_current_skill_scores function to support authenticated user IDs
CREATE OR REPLACE FUNCTION public.get_student_current_skill_scores(student_uuid uuid)
RETURNS TABLE (
  skill_name text,
  skill_type text,
  current_score numeric,
  attempts_count integer,
  last_updated timestamp with time zone
)
LANGUAGE sql
STABLE
AS $$
  WITH content_scores AS (
    SELECT 
      css.skill_name,
      'content' as skill_type,
      AVG(css.score) as current_score,
      COUNT(*) as attempts_count,
      MAX(css.created_at) as last_updated
    FROM content_skill_scores css
    JOIN test_results tr ON css.test_result_id = tr.id
    WHERE (tr.authenticated_student_id = student_uuid OR (tr.authenticated_student_id IS NULL AND tr.student_id = student_uuid))
    GROUP BY css.skill_name
  ),
  subject_scores AS (
    SELECT 
      sss.skill_name,
      'subject' as skill_type,
      AVG(sss.score) as current_score,
      COUNT(*) as attempts_count,
      MAX(sss.created_at) as last_updated
    FROM subject_skill_scores sss
    JOIN test_results tr ON sss.test_result_id = tr.id
    WHERE (tr.authenticated_student_id = student_uuid OR (tr.authenticated_student_id IS NULL AND tr.student_id = student_uuid))
    GROUP BY sss.skill_name
  )
  SELECT * FROM content_scores
  UNION ALL
  SELECT * FROM subject_scores;
$$;

-- Create functions to get skill scores directly by authenticated user ID
CREATE OR REPLACE FUNCTION public.get_authenticated_user_content_skills(auth_user_id uuid)
RETURNS TABLE (
  id uuid,
  skill_name text,
  score numeric,
  points_earned integer,
  points_possible integer,
  created_at timestamp with time zone,
  test_result_id uuid,
  practice_exercise_id uuid
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    css.id,
    css.skill_name,
    css.score,
    css.points_earned,
    css.points_possible,
    css.created_at,
    css.test_result_id,
    css.practice_exercise_id
  FROM content_skill_scores css
  WHERE css.authenticated_student_id = auth_user_id
  ORDER BY css.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_authenticated_user_subject_skills(auth_user_id uuid)
RETURNS TABLE (
  id uuid,
  skill_name text,
  score numeric,
  points_earned integer,
  points_possible integer,
  created_at timestamp with time zone,
  test_result_id uuid,
  practice_exercise_id uuid
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    sss.id,
    sss.skill_name,
    sss.score,
    sss.points_earned,
    sss.points_possible,
    sss.created_at,
    sss.test_result_id,
    sss.practice_exercise_id
  FROM subject_skill_scores sss
  WHERE sss.authenticated_student_id = auth_user_id
  ORDER BY sss.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_authenticated_user_test_results(auth_user_id uuid)
RETURNS TABLE (
  id uuid,
  exam_id text,
  class_id uuid,
  overall_score numeric,
  total_points_earned integer,
  total_points_possible integer,
  detailed_analysis text,
  ai_feedback text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    tr.id,
    tr.exam_id,
    tr.class_id,
    tr.overall_score,
    tr.total_points_earned,
    tr.total_points_possible,
    tr.detailed_analysis,
    tr.ai_feedback,
    tr.created_at
  FROM test_results tr
  WHERE tr.authenticated_student_id = auth_user_id
  ORDER BY tr.created_at DESC;
$$;
