
import { addDays, getDay, format, startOfDay } from "date-fns";
import type { ActiveClassWithDuration } from "@/services/examService";

export interface NextClassInfo {
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  formattedDate: string; // "June 12, 2025"
  formattedTime: string; // "1:30 PM"
  dayName: string; // "Wednesday"
  isToday: boolean;
  daysUntil: number;
}

export function getNextClassDate(classData: ActiveClassWithDuration | null): NextClassInfo | null {
  if (!classData?.day_of_week || !classData?.class_time || classData.day_of_week.length === 0) {
    return null;
  }

  const today = startOfDay(new Date());
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };

  // Convert class days to numbers
  const classDayNumbers = classData.day_of_week
    .map(day => dayMap[day])
    .filter(dayNum => dayNum !== undefined);

  if (classDayNumbers.length === 0) {
    return null;
  }

  // Find the next occurrence of any class day
  let nextClassDate = today;
  let daysToAdd = 0;
  let foundDay = false;
  
  for (let i = 0; i < 14; i++) { // Look up to 2 weeks ahead
    const currentDay = getDay(nextClassDate);
    
    if (classDayNumbers.includes(currentDay)) {
      // If it's today, check if class time hasn't passed yet
      if (daysToAdd === 0) {
        const now = new Date();
        const [hours, minutes] = classData.class_time.split(':').map(Number);
        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);
        
        // If class time has passed today, continue looking for next occurrence
        if (now > classTime) {
          daysToAdd++;
          nextClassDate = addDays(today, daysToAdd);
          continue;
        }
      }
      foundDay = true;
      break;
    }
    
    daysToAdd++;
    nextClassDate = addDays(today, daysToAdd);
  }

  if (!foundDay) {
    return null;
  }

  // Format the time
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(`2024-01-01 ${timeString}`);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeString;
    }
  };

  return {
    date: format(nextClassDate, 'yyyy-MM-dd'),
    time: classData.class_time,
    formattedDate: format(nextClassDate, 'MMMM d, yyyy'),
    formattedTime: formatTime(classData.class_time),
    dayName: format(nextClassDate, 'EEEE'),
    isToday: daysToAdd === 0,
    daysUntil: daysToAdd
  };
}
