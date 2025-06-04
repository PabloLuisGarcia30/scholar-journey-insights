
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
  
  let currentPage = 1;
  let yPosition = margin;

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
    let height = 12; // Question header height
    
    // Question text height - more accurate calculation
    pdf.setFontSize(8);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    height += questionLines.length * 4 + 4; // Line height + spacing
    
    // Options height
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach(option => {
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 40);
        height += optionLines.length * 4 + 2; // More compact spacing
      });
    } else if (question.type === 'true-false') {
      height += 6;
    } else if (question.type === 'short-answer') {
      height += 12; // Two answer lines
    } else if (question.type === 'essay') {
      height += 18; // Three answer lines
    }
    
    height += 8; // Bottom spacing between questions
    
    return height;
  };

  // Calculate available content height for each page
  const getMaxContentHeight = (pageNumber: number) => {
    const headerHeight = pageNumber === 1 ? 140 : 65; // Different header heights
    const footerHeight = 20;
    return pageHeight - headerHeight - footerHeight;
  };

  // First pass: calculate total pages needed
  let tempYPosition = 0;
  let tempPageCount = 1;
  let maxContentHeight = getMaxContentHeight(tempPageCount);
  
  testData.questions.forEach((question) => {
    const questionHeight = calculateQuestionHeight(question);
    
    if (tempYPosition + questionHeight > maxContentHeight) {
      tempPageCount++;
      tempYPosition = 0;
      maxContentHeight = getMaxContentHeight(tempPageCount);
    }
    
    tempYPosition += questionHeight;
  });

  const totalPages = tempPageCount;

  // Second pass: actually render the PDF
  yPosition = addHeader(currentPage);
  let maxContentHeightForCurrentPage = getMaxContentHeight(currentPage);

  testData.questions.forEach((question, questionIndex) => {
    const questionHeight = calculateQuestionHeight(question);
    
    // Check if we need a new page - if question doesn't fit, move entire question to next page
    if (yPosition + questionHeight > maxContentHeightForCurrentPage) {
      addFooter(currentPage, totalPages);
      pdf.addPage();
      currentPage++;
      yPosition = addHeader(currentPage);
      maxContentHeightForCurrentPage = getMaxContentHeight(currentPage);
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
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
    pdf.text(questionLines, margin + 5, yPosition + 2);
    yPosition += questionLines.length * 4 + 4;
    
    // Answer options
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        pdf.setFontSize(7);
        pdf.text(`${optionLetter})`, margin + 8, yPosition);
        
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 40);
        pdf.text(optionLines, margin + 15, yPosition);
        
        // Answer bubble
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.5);
        pdf.circle(pageWidth - margin - 22, yPosition - 1.5, 2.5);
        
        yPosition += optionLines.length * 4 + 2;
      });
    } else if (question.type === 'true-false') {
      pdf.setFontSize(7);
      pdf.text('A) True', margin + 8, yPosition);
      pdf.text('B) False', margin + 50, yPosition);
      
      pdf.setDrawColor(100, 116, 139);
      pdf.setLineWidth(0.5);
      pdf.circle(pageWidth - margin - 35, yPosition - 1.5, 2.5);
      pdf.circle(pageWidth - margin - 22, yPosition - 1.5, 2.5);
      
      yPosition += 6;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(7);
      pdf.text('Answer:', margin + 8, yPosition);
      yPosition += 4;
      
      for (let i = 0; i < 2; i++) {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 8, yPosition, pageWidth - margin - 8, yPosition);
        yPosition += 4;
      }
    } else if (question.type === 'essay') {
      pdf.setFontSize(7);
      pdf.text('Answer:', margin + 8, yPosition);
      yPosition += 4;
      
      for (let i = 0; i < 3; i++) {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 8, yPosition, pageWidth - margin - 8, yPosition);
        yPosition += 4;
      }
    }
    
    yPosition += 8; // Space between questions
    
    // Add separator line between questions (except for the last one)
    if (questionIndex < testData.questions.length - 1) {
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 8, yPosition - 4, pageWidth - margin - 8, yPosition - 4);
    }
  });
  
  // Add footer to last page
  addFooter(currentPage, totalPages);
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
