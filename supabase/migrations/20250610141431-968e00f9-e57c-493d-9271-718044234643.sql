
-- Add practice_exercise_id column to link skill scores to practice exercises
ALTER TABLE content_skill_scores 
ADD COLUMN practice_exercise_id uuid REFERENCES student_exercises(id);

ALTER TABLE subject_skill_scores 
ADD COLUMN practice_exercise_id uuid REFERENCES student_exercises(id);

-- Add indexes for better performance
CREATE INDEX idx_content_skill_scores_practice_exercise ON content_skill_scores(practice_exercise_id);
CREATE INDEX idx_subject_skill_scores_practice_exercise ON subject_skill_scores(practice_exercise_id);

-- Create function to calculate weighted skill score updates
CREATE OR REPLACE FUNCTION calculate_updated_skill_score(
  current_score numeric,
  new_score numeric,
  current_attempts integer,
  recency_weight numeric DEFAULT 0.3
) RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  -- Weighted average: (current_score * attempts + new_score * recency_weight) / (attempts + recency_weight)
  RETURN ROUND(
    (current_score * current_attempts + new_score * recency_weight) / 
    (current_attempts + recency_weight), 
    2
  );
END;
$$;

-- Create function to get student's current skill scores
CREATE OR REPLACE FUNCTION get_student_current_skill_scores(student_uuid uuid)
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
    WHERE tr.student_id = student_uuid
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
    WHERE tr.student_id = student_uuid
    GROUP BY sss.skill_name
  )
  SELECT * FROM content_scores
  UNION ALL
  SELECT * FROM subject_scores;
$$;
