
-- Add end_time column to active_classes table
ALTER TABLE public.active_classes 
ADD COLUMN end_time TIME;

-- Add comment to document the new column
COMMENT ON COLUMN public.active_classes.end_time IS 'Time when the class ends (e.g., 10:30, 15:30)';

-- Populate existing classes with realistic end times (assuming 1-hour class duration)
UPDATE active_classes 
SET end_time = '11:00:00' 
WHERE name = 'Geography 11 b' AND teacher = 'Mr. Cullen';

UPDATE active_classes 
SET end_time = '14:30:00' 
WHERE name = 'Geography 11' AND teacher = 'Mr. Cullen';

UPDATE active_classes 
SET end_time = '10:00:00' 
WHERE name = 'Math 12' AND teacher = 'Ms. Fallon';

UPDATE active_classes 
SET end_time = '12:00:00' 
WHERE name = 'Math 11' AND teacher = 'Ms. Fallon';

UPDATE active_classes 
SET end_time = '15:00:00' 
WHERE name = 'Math Test' AND teacher = 'Ms. Fallon';

UPDATE active_classes 
SET end_time = '09:30:00' 
WHERE name = 'Brent Math Class 10' AND teacher = 'Ms. Fallon';
