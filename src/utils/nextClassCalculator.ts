
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
  if (!classData?.day_of_week || !classData?.class_time) {
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

  const classDayNumber = dayMap[classData.day_of_week];
  if (classDayNumber === undefined) {
    return null;
  }

  // Find the next occurrence of the class day
  let nextClassDate = today;
  let daysToAdd = 0;
  
  do {
    const currentDay = getDay(nextClassDate);
    if (currentDay === classDayNumber) {
      // If it's today, check if class time hasn't passed yet
      if (daysToAdd === 0) {
        const now = new Date();
        const [hours, minutes] = classData.class_time.split(':').map(Number);
        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);
        
        // If class time has passed today, look for next week
        if (now > classTime) {
          daysToAdd = 7;
          nextClassDate = addDays(today, daysToAdd);
        }
      }
      break;
    }
    daysToAdd++;
    nextClassDate = addDays(today, daysToAdd);
  } while (daysToAdd < 7);

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
