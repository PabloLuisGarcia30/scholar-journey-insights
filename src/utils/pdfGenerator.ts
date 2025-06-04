
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
  
  // Calculate optimal questions per page based on total questions
  const totalQuestions = testData.questions.length;
  let questionsPerPage: number;
  
  if (totalQuestions <= 5) {
    questionsPerPage = totalQuestions; // All on one page
  } else if (totalQuestions <= 10) {
    questionsPerPage = Math.ceil(totalQuestions / 2); // Split across 2 pages
  } else {
    questionsPerPage = Math.ceil(totalQuestions / 3); // Split across 3 pages
  }
  
  // Split questions into pages
  const questionPages: Question[][] = [];
  for (let i = 0; i < testData.questions.length; i += questionsPerPage) {
    questionPages.push(testData.questions.slice(i, i + questionsPerPage));
  }
  
  // Calculate layout based on content density
  const calculateLayout = (questionsCount: number) => {
    const availableHeight = pageHeight - 140; // Account for header and margins
    const baseSpacing = Math.max(20, Math.floor(availableHeight / questionsCount) - 15);
    
    return {
      questionSpacing: Math.min(baseSpacing, 40),
      optionSpacing: Math.max(8, Math.floor(baseSpacing / 3)),
      headerHeight: 100
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
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 16);
    
    pdf.setFontSize(8);
    pdf.text(`Created: ${new Date().toLocaleDateString()}`, pageWidth - margin - 30, 16);
    
    yPosition = 32;
    pdf.setTextColor(0, 0, 0);
    
    // Exam ID Section
    pdf.setFillColor(220, 38, 38);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text(`EXAM ID: ${testData.examId}`, margin + 5, yPosition + 10);
    
    yPosition += 20;
    pdf.setTextColor(0, 0, 0);
    
    // Class Information and Student Info (first page only)
    if (pageIndex === 0) {
      if (testData.className) {
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Class: ${testData.className}`, margin + 5, yPosition + 8);
        
        yPosition += 17;
        pdf.setTextColor(0, 0, 0);
      }
      
      // Student Information
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 28, 'FD');
      
      yPosition += 6;
      
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('STUDENT INFO', margin + 5, yPosition);
      
      yPosition += 10;
      
      pdf.setFontSize(8);
      pdf.text('Name:', margin + 5, yPosition);
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.5);
      pdf.rect(margin + 22, yPosition - 5, 70, 7);
      
      pdf.text('ID:', margin + 100, yPosition);
      pdf.rect(margin + 112, yPosition - 5, 35, 7);
      
      pdf.setFont(undefined, 'bold');
      pdf.text(`Time: ${testData.timeLimit}min`, pageWidth - margin - 35, yPosition);
      
      yPosition += 12;
      
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text('Instructions: Fill bubbles completely. Use #2 pencil. One answer per question.', margin + 5, yPosition);
      
      yPosition += 15;
    } else {
      yPosition += 5;
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.title} - Page ${pageIndex + 1}`, margin, yPosition);
      pdf.setFontSize(7);
      pdf.text(`Exam ID: ${testData.examId}`, pageWidth - margin - 35, yPosition);
      yPosition += 12;
    }
    
    // Render questions
    pageQuestions.forEach((question, questionIndex) => {
      const globalQuestionIndex = pageIndex * questionsPerPage + questionIndex;
      
      // Question header with background
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition - 1, pageWidth - 2 * margin, 10, 'F');
      
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(37, 99, 235);
      pdf.text(`Q${globalQuestionIndex + 1}`, margin + 3, yPosition + 6);
      
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(7);
      pdf.text(`(${question.points}pt${question.points !== 1 ? 's' : ''})`, pageWidth - margin - 18, yPosition + 6);
      
      yPosition += 10;
      
      // Question text
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 5);
      pdf.text(questionLines, margin + 3, yPosition + 2);
      yPosition += questionLines.length * 3.5 + 3;
      
      // Answer options
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          
          pdf.setFontSize(7);
          pdf.text(`${optionLetter})`, margin + 5, yPosition);
          
          const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 35);
          pdf.text(optionLines, margin + 12, yPosition);
          
          // Answer bubble
          pdf.setDrawColor(100, 116, 139);
          pdf.setLineWidth(0.5);
          pdf.circle(pageWidth - margin - 22, yPosition - 1.5, 2.5);
          
          yPosition += layout.optionSpacing;
        });
      } else if (question.type === 'true-false') {
        pdf.setFontSize(7);
        pdf.text('A) True', margin + 5, yPosition);
        pdf.text('B) False', margin + 45, yPosition);
        
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.5);
        pdf.circle(pageWidth - margin - 35, yPosition - 1.5, 2.5);
        pdf.circle(pageWidth - margin - 22, yPosition - 1.5, 2.5);
        
        yPosition += layout.optionSpacing;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(7);
        pdf.text('Answer:', margin + 5, yPosition);
        yPosition += 5;
        
        for (let i = 0; i < 2; i++) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
          yPosition += 5;
        }
      } else if (question.type === 'essay') {
        pdf.setFontSize(7);
        pdf.text('Answer:', margin + 5, yPosition);
        yPosition += 5;
        
        for (let i = 0; i < 3; i++) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
          yPosition += 5;
        }
      }
      
      yPosition += layout.questionSpacing;
      
      // Add separator line between questions (except for the last one)
      if (questionIndex < pageQuestions.length - 1) {
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 5, yPosition - layout.questionSpacing / 2, pageWidth - margin - 5, yPosition - layout.questionSpacing / 2);
      }
    });
    
    // Footer
    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageIndex + 1}/${questionPages.length}`, pageWidth - margin - 12, pageHeight - 6);
    pdf.text(`${testData.title} | ${testData.examId}`, margin, pageHeight - 6);
  });
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
