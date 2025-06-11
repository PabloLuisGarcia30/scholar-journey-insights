
-- Update active_classes table to support multiple days of the week
-- Change day_of_week from text to text[] to store multiple days
ALTER TABLE active_classes 
ALTER COLUMN day_of_week TYPE text[] 
USING CASE 
  WHEN day_of_week IS NULL THEN NULL
  ELSE ARRAY[day_of_week]
END;

-- Update the column comment to reflect the new structure
COMMENT ON COLUMN active_classes.day_of_week IS 'Array of days when the class meets (e.g., ["Monday", "Wednesday", "Friday"])';
