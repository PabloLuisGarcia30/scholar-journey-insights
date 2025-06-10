
import { format, addDays, startOfDay, isToday } from "date-fns";
import { Card } from "@/components/ui/card";

export function WeeklyCalendar() {
  const today = startOfDay(new Date());
  
  const generateNext7Days = () => {
    return Array.from({ length: 7 }, (_, index) => {
      return addDays(today, index);
    });
  };

  const next7Days = generateNext7Days();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {next7Days.map((date, index) => {
        const isCurrentDay = isToday(date);
        return (
          <Card
            key={index}
            className={`min-w-[80px] p-3 text-center cursor-pointer transition-colors hover:bg-slate-50 ${
              isCurrentDay 
                ? "bg-blue-100 border-blue-300 shadow-sm" 
                : "bg-white border-slate-200"
            }`}
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
            </div>
          </Card>
        );
      })}
    </div>
  );
}
