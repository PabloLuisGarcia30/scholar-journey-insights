
-- Add day_of_week and class_time columns to active_classes table
ALTER TABLE public.active_classes 
ADD COLUMN day_of_week TEXT,
ADD COLUMN class_time TIME;

-- Add comments to document the new columns
COMMENT ON COLUMN public.active_classes.day_of_week IS 'Day of the week when the class is scheduled (e.g., Monday, Tuesday, etc.)';
COMMENT ON COLUMN public.active_classes.class_time IS 'Time when the class is scheduled (e.g., 09:00, 14:30)';
