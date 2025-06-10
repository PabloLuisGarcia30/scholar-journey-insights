
-- Populate existing active classes with random scheduling data
-- This is a one-time operation for classes that don't have scheduling info yet

-- Geography 11 b (Mr. Cullen) - Tuesday 10:00
UPDATE active_classes 
SET day_of_week = 'Tuesday', class_time = '10:00:00' 
WHERE name = 'Geography 11 b' AND teacher = 'Mr. Cullen';

-- Geography 11 (Mr. Cullen) - Thursday 13:30
UPDATE active_classes 
SET day_of_week = 'Thursday', class_time = '13:30:00' 
WHERE name = 'Geography 11' AND teacher = 'Mr. Cullen';

-- Math 12 (Ms. Fallon) - Monday 09:00
UPDATE active_classes 
SET day_of_week = 'Monday', class_time = '09:00:00' 
WHERE name = 'Math 12' AND teacher = 'Ms. Fallon';

-- Math 11 (Ms. Fallon) - Wednesday 11:00
UPDATE active_classes 
SET day_of_week = 'Wednesday', class_time = '11:00:00' 
WHERE name = 'Math 11' AND teacher = 'Ms. Fallon';

-- Math Test (Ms. Fallon) - Friday 14:00
UPDATE active_classes 
SET day_of_week = 'Friday', class_time = '14:00:00' 
WHERE name = 'Math Test' AND teacher = 'Ms. Fallon';

-- Brent Math Class 10 (Ms. Fallon) - Tuesday 08:30
UPDATE active_classes 
SET day_of_week = 'Tuesday', class_time = '08:30:00' 
WHERE name = 'Brent Math Class 10' AND teacher = 'Ms. Fallon';
