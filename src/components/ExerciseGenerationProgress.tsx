
import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExerciseGenerationProgress } from "@/services/lessonPlanService";

interface ExerciseGenerationProgressProps {
  progress: ExerciseGenerationProgress[];
  isComplete: boolean;
}

export function ExerciseGenerationProgress({ 
  progress, 
  isComplete 
}: ExerciseGenerationProgressProps) {
  const completedCount = progress.filter(p => p.status === 'completed').length;
  const errorCount = progress.filter(p => p.status === 'error').length;
  const totalCount = progress.length;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">
          Generating Practice Exercises
        </h4>
        <div className="flex items-center justify-between text-sm text-blue-700">
          <span>Progress: {completedCount + errorCount} of {totalCount} students</span>
          {isComplete && (
            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
              Complete
            </Badge>
          )}
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((completedCount + errorCount) / totalCount) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Individual Student Progress */}
      <div className="space-y-2">
        {progress.map((student) => (
          <div key={student.studentId} className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              {student.status === 'pending' && (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              {student.status === 'generating' && (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              )}
              {student.status === 'completed' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {student.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              
              <div>
                <p className="font-medium text-slate-900">{student.studentName}</p>
                {student.status === 'generating' && (
                  <p className="text-sm text-blue-600">Generating exercises...</p>
                )}
                {student.status === 'error' && student.error && (
                  <p className="text-sm text-red-600">Error: {student.error}</p>
                )}
              </div>
            </div>
            
            <Badge 
              variant={
                student.status === 'completed' ? 'default' :
                student.status === 'error' ? 'destructive' :
                student.status === 'generating' ? 'secondary' :
                'outline'
              }
              className={
                student.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                undefined
              }
            >
              {student.status === 'pending' && 'Waiting'}
              {student.status === 'generating' && 'Generating'}
              {student.status === 'completed' && 'Complete'}
              {student.status === 'error' && 'Failed'}
            </Badge>
          </div>
        ))}
      </div>

      {/* Summary */}
      {isComplete && (
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-900">Generation Complete!</h4>
          </div>
          <p className="text-sm text-green-700">
            Successfully generated {completedCount} practice exercises.
            {errorCount > 0 && ` ${errorCount} failed to generate.`}
          </p>
        </div>
      )}
    </div>
  );
}
