
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const gradeData = [
  { month: 'Jan', avgGrade: 3.2, submissions: 145 },
  { month: 'Feb', avgGrade: 3.4, submissions: 162 },
  { month: 'Mar', avgGrade: 3.3, submissions: 158 },
  { month: 'Apr', avgGrade: 3.5, submissions: 171 },
  { month: 'May', avgGrade: 3.6, submissions: 189 },
  { month: 'Jun', avgGrade: 3.4, submissions: 166 },
];

export function GradeChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={gradeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={[0, 4]} />
          <Tooltip 
            formatter={(value, name) => [
              name === 'avgGrade' ? `${value} GPA` : `${value} submissions`,
              name === 'avgGrade' ? 'Average Grade' : 'Submissions'
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="avgGrade" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
