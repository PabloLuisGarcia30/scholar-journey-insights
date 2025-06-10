
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function LessonPlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const className = searchParams.get('class') || 'Unknown Class';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/class-runner')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to ClassRunner
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
            Lesson Planner
          </h1>
          <p className="text-lg text-slate-600 mt-2">Plan lessons for {className}</p>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lesson Planning - Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Lesson Planning Tools
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                This page will contain comprehensive lesson planning tools for {className}. 
                Features will include lesson templates, curriculum alignment, and resource management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
