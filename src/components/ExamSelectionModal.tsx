
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, BookOpen, Users } from 'lucide-react';
import { ExamIdDetectionService } from '@/services/examIdDetectionService';

interface ExamOption {
  exam_id: string;
  title: string;
  class_name: string;
  created_at: string;
}

interface ExamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (examId: string) => void;
  detectionResult: {
    examId: string | null;
    confidence: number;
    suggestions: string[];
    rawMatches: string[];
    detectionMethod: string;
  } | null;
  fileName: string;
}

export const ExamSelectionModal: React.FC<ExamSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  detectionResult,
  fileName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentExams, setRecentExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRecentExams();
      if (detectionResult?.suggestions && detectionResult.suggestions.length > 0) {
        setSelectedExamId(detectionResult.suggestions[0]);
      }
    }
  }, [isOpen, detectionResult]);

  const loadRecentExams = async () => {
    setIsLoading(true);
    try {
      const exams = await ExamIdDetectionService.getRecentExams(10);
      setRecentExams(exams);
    } catch (error) {
      console.error('Error loading recent exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExams = recentExams.filter(exam =>
    exam.exam_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedExamId) {
      onSelect(selectedExamId);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select Exam ID
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Detection Results Summary */}
          {detectionResult && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Detection Results for:</span>
                    <span className="text-sm text-gray-500">{fileName}</span>
                  </div>
                  
                  {detectionResult.examId ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Found: {detectionResult.examId}
                      </Badge>
                      <Badge variant="outline" className={getConfidenceColor(detectionResult.confidence)}>
                        {Math.round(detectionResult.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                        No exam ID detected automatically
                      </Badge>
                      {detectionResult.rawMatches.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-600">Found patterns: </span>
                          {detectionResult.rawMatches.map((match, index) => (
                            <Badge key={index} variant="outline" className="ml-1 text-xs">
                              {match}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Exams</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by exam ID, title, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Manual Exam ID Input */}
          <div className="space-y-2">
            <Label htmlFor="manual-exam-id">Or Enter Exam ID Manually</Label>
            <Input
              id="manual-exam-id"
              placeholder="Enter exam ID (e.g., EXAM123, TEST-456)"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value.toUpperCase())}
            />
          </div>

          {/* Recent Exams List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Recent Exams ({filteredExams.length})
              </span>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Loading recent exams...</div>
            ) : filteredExams.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredExams.map((exam) => (
                  <Card
                    key={exam.exam_id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedExamId === exam.exam_id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedExamId(exam.exam_id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{exam.exam_id}</span>
                            <Badge variant="outline" className="text-xs">
                              {exam.class_name}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{exam.title}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{formatDate(exam.created_at)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                {searchTerm ? 'No exams match your search' : 'No recent exams found'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSelect}
              disabled={!selectedExamId}
              className="flex-1"
            >
              Select Exam ID: {selectedExamId || 'None'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
