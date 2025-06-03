
import { Badge } from "@/components/ui/badge";

const activities = [
  { 
    student: 'Sarah Johnson', 
    action: 'Submitted assignment', 
    course: 'Mathematics 101', 
    time: '2 hours ago',
    grade: 'A+',
    type: 'submission'
  },
  { 
    student: 'Michael Chen', 
    action: 'Completed quiz', 
    course: 'Physics Lab', 
    time: '4 hours ago',
    grade: 'B+',
    type: 'quiz'
  },
  { 
    student: 'Emma Williams', 
    action: 'Attended virtual class', 
    course: 'Chemistry 202', 
    time: '6 hours ago',
    grade: null,
    type: 'attendance'
  },
  { 
    student: 'David Brown', 
    action: 'Late assignment submitted', 
    course: 'Biology 101', 
    time: '1 day ago',
    grade: 'B-',
    type: 'late_submission'
  },
];

export function RecentActivity() {
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'submission': return 'bg-green-100 text-green-700';
      case 'quiz': return 'bg-blue-100 text-blue-700';
      case 'attendance': return 'bg-purple-100 text-purple-700';
      case 'late_submission': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{activity.student}</span>
              <Badge variant="outline" className={getActivityColor(activity.type)}>
                {activity.action}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{activity.course}</p>
            <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
          </div>
          {activity.grade && (
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                activity.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                activity.grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {activity.grade}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
