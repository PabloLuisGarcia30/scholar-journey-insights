
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, FileText } from "lucide-react";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";
import { generateMultiplePracticeTests } from "@/services/practiceTestService";
import { generateTestPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { useState } from "react";

interface MultiSkillActionBarProps {
  onGenerateTests?: () => void;
}

export function MultiSkillActionBar({ onGenerateTests }: MultiSkillActionBarProps) {
  const { selectedSkills, clearSelection, toggleSelectionMode, isSelectionMode } = useMultiSkillSelection();
  const [isGenerating, setIsGenerating] = useState(false);

  // Show action bar whenever there are selected skills (regardless of selection mode)
  if (selectedSkills.length === 0) {
    return null;
  }

  const handleGenerateTests = async () => {
    if (selectedSkills.length === 0) return;

    setIsGenerating(true);
    
    try {
      // Extract unique skills for generation
      const skillsToGenerate = selectedSkills.map(skill => ({
        name: skill.name,
        score: skill.score
      }));

      // Use a generic base request - in real implementation you'd want to get proper context
      const baseRequest = {
        studentName: "Selected Students",
        className: "Multiple Classes",
        grade: "Grade 10",
        subject: "Math"
      };

      const results = await generateMultiplePracticeTests(skillsToGenerate, baseRequest);
      
      const successCount = results.filter(r => r.status === 'completed').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      if (successCount > 0) {
        toast.success(`Successfully generated ${successCount} practice test${successCount !== 1 ? 's' : ''}`);
        
        // Generate and download PDFs for successful tests
        const successfulResults = results.filter(r => r.status === 'completed' && r.testData);
        
        for (const result of successfulResults) {
          if (result.testData) {
            // Create practice Student ID
            const practiceStudentId = `PRAC-${Date.now().toString().slice(-6)}-${result.skillName.slice(0, 3).toUpperCase()}`;
            
            // Convert PracticeTestData to TestData format for PDF generation
            const pdfTestData = {
              examId: `PRACTICE-${Date.now()}-${result.skillName.replace(/\s+/g, '-')}`,
              title: result.testData.title,
              description: result.testData.description || '',
              className: baseRequest.className,
              timeLimit: result.testData.estimatedTime,
              questions: result.testData.questions.map(q => ({
                id: q.id,
                type: q.type,
                question: q.question,
                options: q.options,
                correctAnswer: undefined, // Don't include answers in printed version
                points: q.points
              })),
              studentName: baseRequest.studentName,
              studentId: practiceStudentId
            };
            
            // Generate and download PDF
            generateTestPDF(pdfTestData);
          }
        }
        
        if (successfulResults.length > 0) {
          toast.success(`Downloaded ${successfulResults.length} practice test PDF${successfulResults.length !== 1 ? 's' : ''}`);
        }
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to generate ${errorCount} practice test${errorCount !== 1 ? 's' : ''}`);
      }

      console.log('Multi-test generation results:', results);
      
      // Clear selection after successful generation
      if (successCount > 0) {
        clearSelection();
      }

      // Call the provided callback if any
      if (onGenerateTests) {
        onGenerateTests();
      }

    } catch (error) {
      console.error('Error generating multiple practice tests:', error);
      toast.error(`Failed to generate practice tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-right">
      <Card className="p-4 shadow-lg bg-white border-2 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {selectedSkills.length}/5 skills selected
            </Badge>
            <div className="text-sm text-gray-600 max-w-48 truncate">
              {selectedSkills.map(skill => skill.name).join(', ')}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="text-gray-600 hover:text-gray-800"
              disabled={isGenerating}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            
            <Button
              onClick={handleGenerateTests}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={selectedSkills.length === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Generating & Downloading...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate & Download {selectedSkills.length} PDF{selectedSkills.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectionMode}
              className="text-gray-500 hover:text-gray-700"
              disabled={isGenerating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
