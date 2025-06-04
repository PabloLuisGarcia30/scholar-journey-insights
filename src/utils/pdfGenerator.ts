
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
  const maxContentHeight = pageHeight - 160; // Reserve space for header and footer
  
  let currentPage = 1;
  let yPosition = margin;
  let isFirstPage = true;

  const addHeader = (pageNumber: number) => {
    // Header Section
    pdf.setFillColor(45, 55, 72);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 16);
    
    pdf.setFontSize(8);
    pdf.text(`Created: ${new Date().toLocaleDateString()}`, pageWidth - margin - 30, 16);
    
    let headerYPos = 32;
    pdf.setTextColor(0, 0, 0);
    
    // Exam ID Section
    pdf.setFillColor(220, 38, 38);
    pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 15, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text(`EXAM ID: ${testData.examId}`, margin + 5, headerYPos + 10);
    
    headerYPos += 20;
    pdf.setTextColor(0, 0, 0);
    
    // First page specific content
    if (pageNumber === 1) {
      if (testData.className) {
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 12, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Class: ${testData.className}`, margin + 5, headerYPos + 8);
        
        headerYPos += 17;
        pdf.setTextColor(0, 0, 0);
      }
      
      // Student Information
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 28, 'FD');
      
      headerYPos += 6;
      
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('STUDENT INFO', margin + 5, headerYPos);
      
      headerYPos += 10;
      
      pdf.setFontSize(8);
      pdf.text('Name:', margin + 5, headerYPos);
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.5);
      pdf.rect(margin + 22, headerYPos - 5, 70, 7);
      
      pdf.text('ID:', margin + 100, headerYPos);
      pdf.rect(margin + 112, headerYPos - 5, 35, 7);
      
      pdf.setFont(undefined, 'bold');
      pdf.text(`Time: ${testData.timeLimit}min`, pageWidth - margin - 35, headerYPos);
      
      headerYPos += 12;
      
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text('Instructions: Fill bubbles completely. Use #2 pencil. One answer per question.', margin + 5, headerYPos);
      
      headerYPos += 15;
    } else {
      headerYPos += 5;
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.title} - Page ${pageNumber}`, margin, headerYPos);
      pdf.setFontSize(7);
      pdf.text(`Exam ID: ${testData.examId}`, pageWidth - margin - 35, headerYPos);
      headerYPos += 12;
    }
    
    return headerYPos;
  };

  const addFooter = (pageNumber: number, totalPages: number) => {
    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageNumber}/${totalPages}`, pageWidth - margin - 12, pageHeight - 6);
    pdf.text(`${testData.title} | ${testData.examId}`, margin, pageHeight - 6);
  };

  const calculateQuestionHeight = (question: Question) => {
    let height = 15; // Base question header height
    
    // Question text height
    pdf.setFontSize(8);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 5);
    height += questionLines.length * 3.5 + 3;
    
    // Options height
    if (question.type === 'multiple-choice' && question.options) {
      height += question.options.length * 8;
    } else if (question.type === 'true-false') {
      height += 8;
    } else if (question.type === 'short-answer') {
      height += 15; // Answer lines
    } else if (question.type === 'essay') {
      height += 20; // Answer lines
    }
    
    height += 15; // Spacing after question
    
    return height;
  };

  // First pass: calculate total pages needed
  let tempYPosition = addHeader(1);
  let tempPageCount = 1;
  
  testData.questions.forEach((question) => {
    const questionHeight = calculateQuestionHeight(question);
    
    if (tempYPosition + questionHeight > maxContentHeight) {
      tempPageCount++;
      tempYPosition = addHeader(tempPageCount);
    }
    
    tempYPosition += questionHeight;
  });

  const totalPages = tempPageCount;

  // Second pass: actually render the PDF
  yPosition = addHeader(currentPage);

  testData.questions.forEach((question, questionIndex) => {
    const questionHeight = calculateQuestionHeight(question);
    
    // Check if we need a new page
    if (yPosition + questionHeight > maxContentHeight && currentPage < totalPages) {
      addFooter(currentPage, totalPages);
      pdf.addPage();
      currentPage++;
      yPosition = addHeader(currentPage);
      isFirstPage = false;
    }
    
    // Question header with background
    pdf.setFillColor(250, 250, 250);
    pdf.rect(margin, yPosition - 1, pageWidth - 2 * margin, 10, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(37, 99, 235);
    pdf.text(`Q${questionIndex + 1}`, margin + 3, yPosition + 6);
    
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
        
        yPosition += 8;
      });
    } else if (question.type === 'true-false') {
      pdf.setFontSize(7);
      pdf.text('A) True', margin + 5, yPosition);
      pdf.text('B) False', margin + 45, yPosition);
      
      pdf.setDrawColor(100, 116, 139);
      pdf.setLineWidth(0.5);
      pdf.circle(pageWidth - margin - 35, yPosition - 1.5, 2.5);
      pdf.circle(pageWidth - margin - 22, yPosition - 1.5, 2.5);
      
      yPosition += 8;
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
    
    yPosition += 15;
    
    // Add separator line between questions (except for the last one)
    if (questionIndex < testData.questions.length - 1) {
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 5, yPosition - 7, pageWidth - margin - 5, yPosition - 7);
    }
  });
  
  // Add footer to last page
  addFooter(currentPage, totalPages);
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
