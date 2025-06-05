import React, { useState } from 'react';
import { Download, Share2, Save, Eye, Copy, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AnalysisResult {
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  grade: string;
  feedback: string;
  detailed_analysis: string;
  content_skill_scores: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  subject_skill_scores: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  dual_ocr_summary?: {
    processing_methods_used: string[];
    overall_reliability: number;
    cross_validated_answers: number;
    high_confidence_detections: number;
    fallback_detections: number;
  };
}

interface ResultsManagerProps {
  result: AnalysisResult;
  studentName: string;
  examId: string;
  fileName: string;
  processingTime?: number;
  className?: string;
}

export const ResultsManager: React.FC<ResultsManagerProps> = ({
  result,
  studentName,
  examId,
  fileName,
  processingTime,
  className = ''
}) => {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const generateReport = () => {
    const report = {
      student: studentName,
      examId,
      fileName,
      timestamp: new Date().toISOString(),
      processingTime: processingTime ? `${(processingTime / 1000).toFixed(1)}s` : 'N/A',
      results: {
        grade: result.grade,
        score: `${result.total_points_earned}/${result.total_points_possible}`,
        percentage: `${result.overall_score.toFixed(1)}%`,
        feedback: result.feedback,
        contentSkills: result.content_skill_scores,
        subjectSkills: result.subject_skill_scores,
        ocrSummary: result.dual_ocr_summary
      },
      detailedAnalysis: result.detailed_analysis
    };

    return JSON.stringify(report, null, 2);
  };

  const downloadReport = (format: 'json' | 'txt') => {
    const report = generateReport();
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = report;
      mimeType = 'application/json';
      extension = 'json';
    } else {
      // Convert to readable text format
      const data = JSON.parse(report);
      content = `
TEST ANALYSIS REPORT
==================

Student: ${data.student}
Exam ID: ${data.examId}
File: ${data.fileName}
Date: ${new Date(data.timestamp).toLocaleString()}
Processing Time: ${data.processingTime}

RESULTS
-------
Grade: ${data.results.grade}
Score: ${data.results.score} (${data.results.percentage})
Feedback: ${data.results.feedback}

CONTENT SKILLS
--------------
${data.results.contentSkills.map((skill: any) => 
  `${skill.skill_name}: ${skill.score.toFixed(1)}% (${skill.points_earned}/${skill.points_possible})`
).join('\n')}

SUBJECT SKILLS
--------------
${data.results.subjectSkills.map((skill: any) => 
  `${skill.skill_name}: ${skill.score.toFixed(1)}% (${skill.points_earned}/${skill.points_possible})`
).join('\n')}

${data.results.ocrSummary ? `
OCR PROCESSING SUMMARY
---------------------
Methods Used: ${data.results.ocrSummary.processing_methods_used.join(', ')}
Overall Reliability: ${(data.results.ocrSummary.overall_reliability * 100).toFixed(1)}%
Cross-validated Answers: ${data.results.ocrSummary.cross_validated_answers}
High Confidence Detections: ${data.results.ocrSummary.high_confidence_detections}
Fallback Detections: ${data.results.ocrSummary.fallback_detections}
` : ''}

DETAILED ANALYSIS
----------------
${data.detailedAnalysis}
      `.trim();
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test_analysis_${studentName}_${examId}_${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Report downloaded as ${extension.toUpperCase()}`);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateReport());
      toast.success('Results copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Test Results - ${studentName}`,
          text: `Grade: ${result.grade} (${result.overall_score.toFixed(1)}%)`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy link
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const saveToLocal = () => {
    try {
      const savedResults = JSON.parse(localStorage.getItem('test_results') || '[]');
      const newResult = {
        id: Date.now(),
        studentName,
        examId,
        fileName,
        timestamp: new Date().toISOString(),
        result,
        processingTime
      };
      
      savedResults.push(newResult);
      
      // Keep only last 50 results
      if (savedResults.length > 50) {
        savedResults.splice(0, savedResults.length - 50);
      }
      
      localStorage.setItem('test_results', JSON.stringify(savedResults));
      toast.success('Results saved locally');
    } catch (error) {
      toast.error('Failed to save results');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analysis Results</span>
          <Badge variant="outline" className="text-lg font-bold">
            {result.grade}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {result.overall_score.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-700">Overall Score</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {result.total_points_earned}/{result.total_points_possible}
            </div>
            <div className="text-sm text-green-700">Points Earned</div>
          </div>
        </div>

        {/* OCR Summary */}
        {result.dual_ocr_summary && (
          <div className="p-3 bg-purple-50 rounded-lg border">
            <h4 className="font-medium text-purple-900 mb-2">Enhanced OCR Processing</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Reliability:</span> {(result.dual_ocr_summary.overall_reliability * 100).toFixed(1)}%
              </div>
              <div>
                <span className="font-medium">Methods:</span> {result.dual_ocr_summary.processing_methods_used.join(', ')}
              </div>
              <div>
                <span className="font-medium">Cross-validated:</span> {result.dual_ocr_summary.cross_validated_answers}
              </div>
              <div>
                <span className="font-medium">High confidence:</span> {result.dual_ocr_summary.high_confidence_detections}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadReport('txt')}>
            <Download className="h-4 w-4 mr-2" />
            Download TXT
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => downloadReport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
          
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          
          <Button variant="outline" size="sm" onClick={shareResults}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button variant="outline" size="sm" onClick={saveToLocal}>
            <Save className="h-4 w-4 mr-2" />
            Save Local
          </Button>
          
          <Dialog open={showDetailedAnalysis} onOpenChange={setShowDetailedAnalysis}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detailed Analysis</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  value={result.detailed_analysis}
                  readOnly
                  className="min-h-[300px] font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(result.detailed_analysis)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Analysis
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Skills breakdown */}
        {(result.content_skill_scores.length > 0 || result.subject_skill_scores.length > 0) && (
          <div className="space-y-3">
            {result.content_skill_scores.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Content Skills</h4>
                <div className="space-y-1">
                  {result.content_skill_scores.map((skill, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{skill.skill_name}</span>
                      <Badge variant="outline">
                        {skill.score.toFixed(1)}% ({skill.points_earned}/{skill.points_possible})
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {result.subject_skill_scores.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Subject Skills</h4>
                <div className="space-y-1">
                  {result.subject_skill_scores.map((skill, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{skill.skill_name}</span>
                      <Badge variant="outline">
                        {skill.score.toFixed(1)}% ({skill.points_earned}/{skill.points_possible})
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
