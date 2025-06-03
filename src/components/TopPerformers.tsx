
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface TopPerformersProps {
  onSelectStudent: (studentId: string) => void;
}

const topStudents = [
  { id: '1', name: 'Sarah Johnson', gpa: 3.95, grade: 'A+' },
  { id: '2', name: 'Michael Chen', gpa: 3.87, grade: 'A' },
  { id: '3', name: 'Emma Williams', gpa: 3.82, grade: 'A' },
  { id: '4', name: 'David Brown', gpa: 3.78, grade: 'A-' },
  { id: '5', name: 'Lisa Garcia', gpa: 3.71, grade: 'A-' },
];

export function TopPerformers({ onSelectStudent }: TopPerformersProps) {
  return (
    <div className="space-y-4">
      {topStudents.map((student, index) => (
        <div 
          key={student.id} 
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => onSelectStudent(student.id)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
              {index + 1}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{student.name}</p>
              <p className="text-xs text-gray-500">GPA: {student.gpa}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              student.gpa >= 3.8 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {student.grade}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
