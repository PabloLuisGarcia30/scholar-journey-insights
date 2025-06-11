
-- Create concept_index table to store standardized concepts
CREATE TABLE public.concept_index (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_name text NOT NULL,
  subject text NOT NULL,
  grade text NOT NULL,
  description text,
  related_skills text[] DEFAULT ARRAY[]::text[],
  keywords text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  usage_count integer DEFAULT 0
);

-- Add indexes for fast concept matching
CREATE INDEX idx_concept_index_subject_grade ON concept_index(subject, grade);
CREATE INDEX idx_concept_index_concept_name ON concept_index(concept_name);
CREATE INDEX idx_concept_index_keywords ON concept_index USING GIN(keywords);

-- Add RLS policies
ALTER TABLE public.concept_index ENABLE ROW LEVEL SECURITY;

-- Allow reading concepts (public access for matching)
CREATE POLICY "Allow read access to concept_index" 
  ON public.concept_index 
  FOR SELECT 
  USING (true);

-- Only authenticated users can insert/update concepts
CREATE POLICY "Allow authenticated users to manage concepts" 
  ON public.concept_index 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_concept_index_updated_at 
  BEFORE UPDATE ON public.concept_index
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with common math concepts
INSERT INTO public.concept_index (concept_name, subject, grade, description, keywords) VALUES
('Combining like terms', 'Math', 'Grade 8', 'Understanding how to combine algebraic terms with the same variables', ARRAY['algebra', 'terms', 'variables', 'combine']),
('Order of operations', 'Math', 'Grade 8', 'Following PEMDAS/BODMAS rules in calculations', ARRAY['pemdas', 'bodmas', 'operations', 'order']),
('Fraction addition rules', 'Math', 'Grade 8', 'Adding fractions with common denominators', ARRAY['fractions', 'addition', 'denominators']),
('Solving linear equations', 'Math', 'Grade 8', 'Using inverse operations to solve for variables', ARRAY['linear', 'equations', 'solve', 'variables']),
('Distributive property application', 'Math', 'Grade 8', 'Distributing multiplication over addition/subtraction', ARRAY['distributive', 'property', 'multiplication']),
('Coordinate plane plotting', 'Math', 'Grade 8', 'Understanding x and y coordinates on a graph', ARRAY['coordinates', 'plot', 'graph', 'plane']),
('Percentage calculations', 'Math', 'Grade 8', 'Converting between fractions, decimals, and percentages', ARRAY['percentage', 'percent', 'decimal', 'fraction']),
('Exponent rules', 'Math', 'Grade 8', 'Understanding powers and exponent operations', ARRAY['exponents', 'powers', 'rules']),
('Topic sentence identification', 'English', 'Grade 8', 'Recognizing the main idea sentence in paragraphs', ARRAY['topic', 'sentence', 'main', 'idea']),
('Textual evidence selection', 'English', 'Grade 8', 'Choosing relevant quotes to support arguments', ARRAY['evidence', 'quotes', 'support', 'text']),
('Cause and effect relationships', 'Social Studies', 'Grade 8', 'Understanding how events influence other events', ARRAY['cause', 'effect', 'relationships', 'events']),
('Scientific method steps', 'Science', 'Grade 8', 'Following proper experimental procedures', ARRAY['scientific', 'method', 'experiment', 'procedure']);

-- Add comment for documentation
COMMENT ON TABLE concept_index IS 'Standardized concept vocabulary for GPT concept matching and educational analytics';
