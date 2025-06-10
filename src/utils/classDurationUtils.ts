
/**
 * Utility functions for calculating and formatting class durations
 */

export interface DurationInfo {
  totalMinutes: number;
  hours: number;
  minutes: number;
  formattedDuration: string;
  shortFormat: string;
}

/**
 * Calculate duration between two time strings (HH:MM format)
 */
export const calculateClassDuration = (startTime?: string, endTime?: string): DurationInfo | null => {
  if (!startTime || !endTime) {
    return null;
  }

  try {
    // Parse time strings (expected format: HH:MM or HH:MM:SS)
    const parseTime = (timeStr: string): { hours: number; minutes: number } => {
      const parts = timeStr.split(':');
      return {
        hours: parseInt(parts[0], 10),
        minutes: parseInt(parts[1], 10)
      };
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    // Calculate total minutes
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    
    let totalMinutes = endMinutes - startMinutes;
    
    // Handle case where end time is next day (e.g., start: 23:30, end: 01:30)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      totalMinutes,
      hours,
      minutes,
      formattedDuration: formatDuration(hours, minutes),
      shortFormat: formatDurationShort(totalMinutes)
    };
  } catch (error) {
    console.error('Error calculating class duration:', error);
    return null;
  }
};

/**
 * Format duration in a human-readable format
 */
export const formatDuration = (hours: number, minutes: number): string => {
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
};

/**
 * Format duration in short format (e.g., "90 min", "1.5 hrs")
 */
export const formatDurationShort = (totalMinutes: number): string => {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  
  const hours = totalMinutes / 60;
  if (hours === Math.floor(hours)) {
    return `${Math.floor(hours)} hr${Math.floor(hours) !== 1 ? 's' : ''}`;
  }
  
  return `${hours.toFixed(1)} hrs`;
};

/**
 * Get class duration in minutes only
 */
export const getClassDurationInMinutes = (startTime?: string, endTime?: string): number => {
  const duration = calculateClassDuration(startTime, endTime);
  return duration?.totalMinutes || 0;
};

/**
 * Check if class duration is valid (between reasonable bounds)
 */
export const isValidClassDuration = (startTime?: string, endTime?: string): boolean => {
  const totalMinutes = getClassDurationInMinutes(startTime, endTime);
  // Reasonable class duration: 15 minutes to 8 hours
  return totalMinutes >= 15 && totalMinutes <= 480;
};

/**
 * Get duration category for classification
 */
export const getDurationCategory = (totalMinutes: number): 'short' | 'standard' | 'long' | 'extended' => {
  if (totalMinutes <= 45) return 'short';
  if (totalMinutes <= 90) return 'standard';
  if (totalMinutes <= 180) return 'long';
  return 'extended';
};
