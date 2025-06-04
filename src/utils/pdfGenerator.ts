
import jsPDF from 'jspdf';

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
}

export interface TestData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  questions: Question[];
}

export const generateTestPDF = (testData: TestData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxQuestionsPerPage = 8;
  
  // Split questions into pages
  const questionPages: Question[][] = [];
  for (let i = 0; i < testData.questions.length; i += maxQuestionsPerPage) {
    questionPages.push(testData.questions.slice(i, i + maxQuestionsPerPage));
  }
  
  // Calculate layout based on content density
  const calculateLayout = (questionsCount: number) => {
    const availableHeight = pageHeight - 160;
    const baseSpacing = Math.max(15, Math.floor(availableHeight / questionsCount) - 20);
    
    return {
      questionSpacing: Math.min(baseSpacing, 30),
      optionSpacing: Math.max(6, Math.floor(baseSpacing / 4)),
      headerHeight: 120
    };
  };

  questionPages.forEach((pageQuestions, pageIndex) => {
    if (pageIndex > 0) {
      pdf.addPage();
    }
    
    const layout = calculateLayout(pageQuestions.length);
    let yPosition = margin;
    
    // Header Section
    pdf.setFillColor(45, 55, 72);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 18);
    
    pdf.setFontSize(9);
    pdf.text(`Created: ${new Date().toLocaleDateString()}`, pageWidth - margin - 35, 18);
    
    yPosition = 40;
    pdf.setTextColor(0, 0, 0);
    
    // Exam ID Section
    pdf.setFillColor(220, 38, 38);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text(`EXAM ID: ${testData.examId}`, margin + 5, yPosition + 12);
    
    yPosition += 25;
    pdf.setTextColor(0, 0, 0);
    
    // Class Information
    if (testData.className && pageIndex === 0) {
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Class: ${testData.className}`, margin + 5, yPosition + 10);
      
      yPosition += 20;
      pdf.setTextColor(0, 0, 0);
    }
    
    // Student Information (first page only)
    if (pageIndex === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 35, 'FD');
      
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('STUDENT INFO', margin + 5, yPosition);
      
      yPosition += 12;
      
      pdf.setFontSize(9);
      pdf.text('Name:', margin + 5, yPosition);
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.5);
      pdf.rect(margin + 25, yPosition - 6, 80, 8);
      
      pdf.text('ID:', margin + 110, yPosition);
      pdf.rect(margin + 125, yPosition - 6, 40, 8);
      
      pdf.setFont(undefined, 'bold');
      pdf.text(`Time: ${testData.timeLimit}min`, pageWidth - margin - 40, yPosition);
      
      yPosition += 15;
      
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text('Instructions: Fill bubbles completely. Use #2 pencil. One answer per question.', margin + 5, yPosition);
      
      yPosition += 20;
    } else {
      yPosition += 5;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.title} - Page ${pageIndex + 1}`, margin, yPosition);
      pdf.setFontSize(8);
      pdf.text(`Exam ID: ${testData.examId}`, pageWidth - margin - 40, yPosition);
      yPosition += 15;
    }
    
    // Render questions
    pageQuestions.forEach((question, questionIndex) => {
      const globalQuestionIndex = pageIndex * maxQuestionsPerPage + questionIndex;
      
      // Question header
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 12, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(37, 99, 235);
      pdf.text(`Q${globalQuestionIndex + 1}`, margin + 3, yPosition + 6);
      
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.text(`(${question.points}pt${question.points !== 1 ? 's' : ''})`, pageWidth - margin - 20, yPosition + 6);
      
      yPosition += 12;
      
      // Question text
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 5);
      pdf.text(questionLines, margin + 3, yPosition + 2);
      yPosition += questionLines.length * 4 + 4;
      
      // Answer options
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          
          pdf.setFontSize(8);
          pdf.text(`${optionLetter})`, margin + 5, yPosition);
          
          const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 40);
          pdf.text(optionLines, margin + 15, yPosition);
          
          // Answer bubble
          pdf.setDrawColor(100, 116, 139);
          pdf.setLineWidth(0.5);
          pdf.circle(pageWidth - margin - 25, yPosition - 2, 3);
          
          yPosition += layout.optionSpacing;
        });
      } else if (question.type === 'true-false') {
        pdf.setFontSize(8);
        pdf.text('A) True', margin + 5, yPosition);
        pdf.text('B) False', margin + 50, yPosition);
        
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.5);
        pdf.circle(pageWidth - margin - 40, yPosition - 2, 3);
        pdf.circle(pageWidth - margin - 25, yPosition - 2, 3);
        
        yPosition += layout.optionSpacing;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(8);
        pdf.text('Answer:', margin + 5, yPosition);
        yPosition += 6;
        
        for (let i = 0; i < 2; i++) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
          yPosition += 6;
        }
      } else if (question.type === 'essay') {
        pdf.setFontSize(8);
        pdf.text('Answer:', margin + 5, yPosition);
        yPosition += 6;
        
        for (let i = 0; i < 4; i++) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
          yPosition += 6;
        }
      }
      
      yPosition += layout.questionSpacing;
      
      if (questionIndex < pageQuestions.length - 1) {
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 5, yPosition - layout.questionSpacing / 2, pageWidth - margin - 5, yPosition - layout.questionSpacing / 2);
      }
    });
    
    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageIndex + 1}/${questionPages.length}`, pageWidth - margin - 15, pageHeight - 8);
    pdf.text(`${testData.title} | ${testData.examId}`, margin, pageHeight - 8);
  });
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
