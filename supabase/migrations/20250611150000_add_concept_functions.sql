
-- Add a function to retrieve concept mastery data by student
CREATE OR REPLACE FUNCTION public.get_student_concept_mastery(student_uuid UUID, subject_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  concept TEXT,
  mastery_level TEXT,
  demonstration_count BIGINT,
  latest_demonstration TIMESTAMPTZ,
  related_skills TEXT[]
) 
LANGUAGE SQL
STABLE
AS $$
  WITH concept_data AS (
    SELECT 
      mp.expected_concept AS concept,
      mp.concept_mastery_level,
      mp.skill_targeted,
      mp.created_at,
      mp.context_when_error_occurred->>'subject' AS subject
    FROM mistake_patterns mp
    JOIN student_exercises se ON mp.student_exercise_id = se.id
    WHERE se.student_id = student_uuid
      AND mp.expected_concept IS NOT NULL
      AND (
        subject_filter IS NULL OR 
        mp.context_when_error_occurred->>'subject' = subject_filter OR
        mp.context_when_error_occurred->>'subject' IS NULL
      )
  )
  
  SELECT 
    cd.concept,
    (
      SELECT cd2.concept_mastery_level
      FROM concept_data cd2  
      WHERE cd2.concept = cd.concept
      ORDER BY cd2.created_at DESC
      LIMIT 1
    ) AS mastery_level,
    COUNT(*) AS demonstration_count,
    MAX(cd.created_at) AS latest_demonstration,
    ARRAY_AGG(DISTINCT cd.skill_targeted) AS related_skills
  FROM concept_data cd
  GROUP BY cd.concept
  ORDER BY latest_demonstration DESC;
$$;

-- Add a function to analyze concept mastery by skill
CREATE OR REPLACE FUNCTION public.analyze_skill_concept_mastery(skill_name TEXT)
RETURNS TABLE (
  expected_concept TEXT,
  mastered_count BIGINT,
  partial_count BIGINT,
  not_demonstrated_count BIGINT,
  unknown_count BIGINT,
  total_demonstrations BIGINT,
  mastery_rate NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  WITH concept_stats AS (
    SELECT
      mp.expected_concept,
      COUNT(*) FILTER (WHERE mp.concept_mastery_level = 'mastered') AS mastered_count,
      COUNT(*) FILTER (WHERE mp.concept_mastery_level = 'partial') AS partial_count,
      COUNT(*) FILTER (WHERE mp.concept_mastery_level = 'not_demonstrated') AS not_demonstrated_count,
      COUNT(*) FILTER (WHERE mp.concept_mastery_level = 'unknown' OR mp.concept_mastery_level IS NULL) AS unknown_count,
      COUNT(*) AS total_demonstrations
    FROM mistake_patterns mp
    WHERE mp.skill_targeted = skill_name
      AND mp.expected_concept IS NOT NULL
    GROUP BY mp.expected_concept
  )
  
  SELECT
    cs.expected_concept,
    cs.mastered_count,
    cs.partial_count,
    cs.not_demonstrated_count,
    cs.unknown_count,
    cs.total_demonstrations,
    ROUND(
      ((cs.mastered_count + cs.partial_count * 0.5) / cs.total_demonstrations) * 100,
      2
    ) AS mastery_rate
  FROM concept_stats cs
  ORDER BY mastery_rate DESC;
$$;
