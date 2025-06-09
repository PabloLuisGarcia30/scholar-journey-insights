import jsPDF from 'jspdf';

// Re-export HTML-to-PDF functions with the same interface for compatibility
export { 
  generateTestPDFFromHTML as generateTestPDF,
  generateStudentTestPDFsFromHTML as generateStudentTestPDFs,
  generateConsolidatedTestPDFFromHTML as generateConsolidatedTestPDF
} from '@/services/htmlToPdfService';

// Keep the existing interfaces for compatibility
export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | boolean;
  points: number;
}

export interface TestData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  questions: Question[];
  studentName?: string;
  studentId?: string;
}
