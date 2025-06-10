
import { format, addDays, startOfDay, isToday, getDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { ActiveClassWithDuration } from "@/services/examService";

interface WeeklyCalendarProps {
  classData?: ActiveClassWithDuration | null;
  isLoading?: boolean;
}

export function WeeklyCalendar({ classData, isLoading }: WeeklyCalendarProps) {
  const today = startOfDay(new Date());
  
  const generateNext7Days = () => {
    return Array.from({ length: 7 }, (_, index) => {
      return addDays(today, index);
    });
  };

  const next7Days = generateNext7Days();

  const getDayOfWeekNumber = (dayName: string): number => {
    const dayMap: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };
    return dayMap[dayName] || -1;
  };

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

  const hasClassOnDay = (date: Date): boolean => {
    if (!classData?.day_of_week) return false;
    const dayOfWeek = getDay(date);
    const classDayNumber = getDayOfWeekNumber(classData.day_of_week);
    return dayOfWeek === classDayNumber;
  };

  const getClassInfo = () => {
    if (!classData) return null;
    
    return {
      startTime: classData.class_time ? formatTime(classData.class_time) : null,
      endTime: classData.end_time ? formatTime(classData.end_time) : null,
      duration: classData.duration?.shortFormat || null,
      name: classData.name
    };
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {next7Days.map((date, index) => {
        const isCurrentDay = isToday(date);
        const hasClass = hasClassOnDay(date);
        const classInfo = getClassInfo();
        
        return (
          <Card
            key={index}
            className={`min-w-[120px] p-3 text-center cursor-pointer transition-colors hover:bg-slate-50 ${
              isCurrentDay 
                ? "bg-blue-100 border-blue-300 shadow-sm" 
                : "bg-white border-slate-200"
            } ${hasClass ? "ring-2 ring-green-200 bg-green-50" : ""}`}
          >
            <div className="space-y-1">
              <div className={`text-xs font-medium ${
                isCurrentDay ? "text-blue-700" : "text-slate-600"
              }`}>
                {format(date, "EEE")}
              </div>
              <div className={`text-lg font-bold ${
                isCurrentDay ? "text-blue-900" : "text-slate-900"
              }`}>
                {format(date, "d")}
              </div>
              <div className={`text-xs ${
                isCurrentDay ? "text-blue-600" : "text-slate-500"
              }`}>
                {format(date, "MMM")}
              </div>
              
              {/* Class information */}
              {hasClass && classInfo && !isLoading && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Class</span>
                  </div>
                  {classInfo.startTime && (
                    <div className="text-xs text-green-600 font-medium">
                      {classInfo.startTime}
                    </div>
                  )}
                  {classInfo.duration && (
                    <div className="text-xs text-green-500">
                      {classInfo.duration}
                    </div>
                  )}
                </div>
              )}
              
              {/* Loading state */}
              {isLoading && (
                <div className="mt-2 pt-2">
                  <div className="animate-pulse bg-slate-200 h-4 w-full rounded"></div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
