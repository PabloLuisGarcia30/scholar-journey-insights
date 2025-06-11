
-- Add enhanced columns to the mistake_patterns table for detailed analysis
ALTER TABLE public.mistake_patterns 
ADD COLUMN misconception_category text,
ADD COLUMN error_severity text CHECK (error_severity IN ('minor', 'moderate', 'major', 'fundamental')),
ADD COLUMN prerequisite_skills_gap text[],
ADD COLUMN error_persistence_count integer DEFAULT 1,
ADD COLUMN question_context text,
ADD COLUMN distractor_analysis text,
ADD COLUMN solution_path text,
ADD COLUMN cognitive_load_indicators jsonb DEFAULT '{}',
ADD COLUMN learning_objectives text[],
ADD COLUMN remediation_suggestions text,
ADD COLUMN related_concepts text[],
ADD COLUMN difficulty_level_appropriate boolean,
ADD COLUMN error_pattern_id text,
ADD COLUMN metacognitive_awareness text,
ADD COLUMN transfer_failure_indicator boolean DEFAULT false,
ADD COLUMN instructional_sensitivity_flag boolean DEFAULT false,
ADD COLUMN gpt_analysis_metadata jsonb DEFAULT '{}',
ADD COLUMN detailed_conceptual_error text,
ADD COLUMN context_when_error_occurred jsonb DEFAULT '{}';

-- Create index for pattern analysis queries
CREATE INDEX idx_mistake_patterns_error_pattern_id ON public.mistake_patterns(error_pattern_id);
CREATE INDEX idx_mistake_patterns_misconception_category ON public.mistake_patterns(misconception_category);
CREATE INDEX idx_mistake_patterns_error_severity ON public.mistake_patterns(error_severity);

-- Create a table for tracking error pattern definitions
CREATE TABLE public.error_pattern_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_id text NOT NULL UNIQUE,
  pattern_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  severity_indicators jsonb DEFAULT '{}',
  remediation_strategies text[],
  related_patterns text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for the new table
ALTER TABLE public.error_pattern_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading error pattern definitions" 
  ON public.error_pattern_definitions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow inserting error pattern definitions" 
  ON public.error_pattern_definitions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow updating error pattern definitions" 
  ON public.error_pattern_definitions 
  FOR UPDATE 
  USING (true);

-- Create updated_at trigger for error_pattern_definitions
CREATE TRIGGER update_error_pattern_definitions_updated_at
  BEFORE UPDATE ON public.error_pattern_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get enhanced mistake analysis for a student
CREATE OR REPLACE FUNCTION public.get_enhanced_mistake_analysis(student_uuid uuid, skill_filter text DEFAULT NULL)
RETURNS TABLE(
  skill_name text,
  misconception_category text,
  error_severity text,
  error_count bigint,
  average_persistence numeric,
  common_prerequisites_gaps text[],
  remediation_themes text[],
  cognitive_patterns jsonb
) 
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    mp.skill_targeted as skill_name,
    COALESCE(mp.misconception_category, 'unclassified') as misconception_category,
    COALESCE(mp.error_severity, 'moderate') as error_severity,
    COUNT(*) as error_count,
    ROUND(AVG(COALESCE(mp.error_persistence_count, 1)), 2) as average_persistence,
    ARRAY[]::text[] as common_prerequisites_gaps,
    COALESCE(array_agg(DISTINCT mp.remediation_suggestions) FILTER (WHERE mp.remediation_suggestions IS NOT NULL), ARRAY[]::text[]) as remediation_themes,
    '{}'::jsonb as cognitive_patterns
  FROM mistake_patterns mp
  JOIN student_exercises se ON mp.student_exercise_id = se.id
  WHERE se.student_id = student_uuid
    AND mp.is_correct = false
    AND (skill_filter IS NULL OR mp.skill_targeted = skill_filter)
  GROUP BY mp.skill_targeted, mp.misconception_category, mp.error_severity
  ORDER BY error_count DESC;
$function$;

-- Create function to identify error patterns across students
CREATE OR REPLACE FUNCTION public.identify_common_error_patterns(skill_name_filter text DEFAULT NULL)
RETURNS TABLE(
  error_pattern_id text,
  pattern_frequency bigint,
  average_severity text,
  common_misconceptions text[],
  affected_skills text[],
  suggested_interventions text[]
)
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    COALESCE(mp.error_pattern_id, 'unpattern_' || COALESCE(mp.misconception_category, 'unknown')) as error_pattern_id,
    COUNT(*) as pattern_frequency,
    COALESCE(mode() WITHIN GROUP (ORDER BY mp.error_severity), 'moderate') as average_severity,
    COALESCE(array_agg(DISTINCT mp.misconception_category) FILTER (WHERE mp.misconception_category IS NOT NULL), ARRAY[]::text[]) as common_misconceptions,
    array_agg(DISTINCT mp.skill_targeted) as affected_skills,
    COALESCE(array_agg(DISTINCT mp.remediation_suggestions) FILTER (WHERE mp.remediation_suggestions IS NOT NULL), ARRAY[]::text[]) as suggested_interventions
  FROM mistake_patterns mp
  WHERE mp.is_correct = false
    AND (skill_name_filter IS NULL OR mp.skill_targeted = skill_name_filter)
    AND mp.created_at >= now() - interval '30 days'
  GROUP BY COALESCE(mp.error_pattern_id, 'unpattern_' || COALESCE(mp.misconception_category, 'unknown'))
  HAVING COUNT(*) >= 3
  ORDER BY pattern_frequency DESC;
$function$;
