
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
    // Header Section with gradient-like effect
    pdf.setFillColor(30, 58, 138); // Dark blue
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    // Add a lighter blue stripe
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 25, pageWidth, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 20);
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 35, 20);
    
    let headerYPos = 40;
    pdf.setTextColor(0, 0, 0);
    
    // EXAM ID Section - Highly visible for OCR
    pdf.setFillColor(239, 68, 68); // Red background
    pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 28, 'F');
    
    // Add black border for maximum contrast
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(2);
    pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 28);
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(`EXAM ID: ${testData.examId}`, margin + 10, headerYPos + 12);
    
    // Duplicate ID on second line for better OCR
    pdf.setFontSize(20);
    pdf.text(testData.examId, margin + 10, headerYPos + 24);
    
    headerYPos += 35;
    pdf.setTextColor(0, 0, 0);
    
    // First page specific content
    if (pageNumber === 1) {
      // Class information bar
      if (testData.className) {
        pdf.setFillColor(16, 185, 129); // Green
        pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 14, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Class: ${testData.className}`, margin + 8, headerYPos + 9);
        
        headerYPos += 20;
        pdf.setTextColor(0, 0, 0);
      }
      
      // Student Information Section
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(1);
      pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 35, 'FD');
      
      headerYPos += 8;
      
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('STUDENT INFORMATION', margin + 8, headerYPos);
      
      headerYPos += 12;
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.text('Name:', margin + 8, headerYPos);
      
      // Name field
      pdf.setDrawColor(107, 114, 128);
      pdf.setLineWidth(0.8);
      pdf.rect(margin + 30, headerYPos - 6, 80, 10);
      
      pdf.text('Student ID:', margin + 120, headerYPos);
      
      // ID field
      pdf.rect(margin + 150, headerYPos - 6, 40, 10);
      
      // Time and points info
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(220, 38, 127);
      pdf.text(`Time: ${testData.timeLimit} minutes`, pageWidth - margin - 45, headerYPos);
      
      headerYPos += 15;
      
      // Instructions
      pdf.setFillColor(254, 249, 195);
      pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 12, 'F');
      
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'italic');
      pdf.setTextColor(146, 64, 14);
      pdf.text('Instructions: Fill bubbles completely with #2 pencil. Choose only one answer per question. Erase completely to change answers.', margin + 5, headerYPos + 8);
      
      headerYPos += 18;
    } else {
      // Subsequent pages header
      headerYPos += 8;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text(`${testData.title} - Page ${pageNumber}`, margin, headerYPos);
      
      // EXAM ID on every page
      pdf.setFillColor(239, 68, 68);
      pdf.rect(pageWidth - margin - 75, headerYPos - 10, 70, 18, 'F');
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(1);
      pdf.rect(pageWidth - margin - 75, headerYPos - 10, 70, 18);
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text(`EXAM ID: ${testData.examId}`, pageWidth - margin - 72, headerYPos - 2);
      pdf.setTextColor(0, 0, 0);
      
      headerYPos += 15;
    }
    
    return headerYPos;
  };

  const addFooter = (pageNumber: number, totalPages: number) => {
    // Footer line
    pdf.setDrawColor(209, 213, 219);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 12);
    pdf.text(testData.title, margin, pageHeight - 12);
    
    // EXAM ID in footer for OCR redundancy
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text(`EXAM ID: ${testData.examId}`, margin, pageHeight - 5);
  };

  const calculateQuestionHeight = (question: Question) => {
    let height = 18; // Question header
    
    // Question text calculation
    pdf.setFontSize(10);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 15);
    height += questionLines.length * 5 + 8;
    
    // Answer options calculation
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach(option => {
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 50);
        height += Math.max(optionLines.length * 5, 12) + 3;
      });
      height += 5; // Extra spacing after options
    } else if (question.type === 'true-false') {
      height += 25; // Space for True/False options
    } else if (question.type === 'short-answer') {
      height += 25; // Answer lines
    } else if (question.type === 'essay') {
      height += 35; // More answer lines
    }
    
    height += 12; // Bottom margin
    return height;
  };

  const getMaxContentHeight = (pageNumber: number) => {
    const headerHeight = pageNumber === 1 ? 160 : 85;
    const footerHeight = 30;
    return pageHeight - headerHeight - footerHeight;
  };

  // Calculate total pages
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

  // Generate PDF
  yPosition = addHeader(currentPage);
  let maxContentHeightForCurrentPage = getMaxContentHeight(currentPage);

  testData.questions.forEach((question, questionIndex) => {
    const questionHeight = calculateQuestionHeight(question);
    
    // Page break if needed
    if (yPosition + questionHeight > maxContentHeightForCurrentPage) {
      addFooter(currentPage, totalPages);
      pdf.addPage();
      currentPage++;
      yPosition = addHeader(currentPage);
      maxContentHeightForCurrentPage = getMaxContentHeight(currentPage);
    }
    
    // Question header with better styling
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'FD');
    
    // Question number
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 58, 138);
    pdf.text(`Question ${questionIndex + 1}`, margin + 8, yPosition + 10);
    
    // Question type badge
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    const typeText = question.type.replace('-', ' ').toUpperCase();
    pdf.text(`[${typeText}]`, margin + 80, yPosition + 10);
    
    // Points
    pdf.setTextColor(220, 38, 127);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${question.points} pt${question.points !== 1 ? 's' : ''}`, pageWidth - margin - 25, yPosition + 10);
    
    yPosition += 18;
    
    // Question text with better formatting
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 15);
    pdf.text(questionLines, margin + 8, yPosition + 3);
    yPosition += questionLines.length * 5 + 8;
    
    // Answer options with improved layout
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Alternating background for better readability
        if (optionIndex % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin + 5, yPosition - 2, pageWidth - 2 * margin - 10, 12, 'F');
        }
        
        // Option letter in circle
        pdf.setFillColor(59, 130, 246);
        pdf.circle(margin + 15, yPosition + 4, 4, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(optionLetter, margin + 13, yPosition + 6);
        
        // Option text
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 50);
        pdf.text(optionLines, margin + 25, yPosition + 3);
        
        // Answer bubble
        pdf.setDrawColor(107, 114, 128);
        pdf.setLineWidth(1);
        pdf.setFillColor(255, 255, 255);
        pdf.circle(pageWidth - margin - 25, yPosition + 4, 5, 'FD');
        
        yPosition += Math.max(optionLines.length * 5, 12) + 3;
      });
      yPosition += 5;
    } else if (question.type === 'true-false') {
      // True/False with better styling
      const options = ['True', 'False'];
      options.forEach((option, idx) => {
        const letter = String.fromCharCode(65 + idx);
        
        pdf.setFillColor(idx === 0 ? 34 : 239, idx === 0 ? 197 : 68, idx === 0 ? 94 : 68);
        pdf.circle(margin + 15, yPosition + 4, 4, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(letter, margin + 13, yPosition + 6);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.text(option, margin + 25, yPosition + 6);
        
        // Answer bubble
        pdf.setDrawColor(107, 114, 128);
        pdf.setLineWidth(1);
        pdf.setFillColor(255, 255, 255);
        pdf.circle(pageWidth - margin - 25, yPosition + 4, 5, 'FD');
        
        yPosition += 12;
      });
      yPosition += 3;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Answer:', margin + 8, yPosition + 2);
      yPosition += 8;
      
      // Answer lines with better spacing
      for (let i = 0; i < 2; i++) {
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 8, yPosition, pageWidth - margin - 8, yPosition);
        yPosition += 8;
      }
      yPosition += 5;
    } else if (question.type === 'essay') {
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Answer (use additional paper if needed):', margin + 8, yPosition + 2);
      yPosition += 8;
      
      // More answer lines for essays
      for (let i = 0; i < 4; i++) {
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 8, yPosition, pageWidth - margin - 8, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }
    
    // Question separator
    if (questionIndex < testData.questions.length - 1) {
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.8);
      pdf.line(margin + 8, yPosition + 3, pageWidth - margin - 8, yPosition + 3);
      yPosition += 12;
    }
  });
  
  // Add footer to last page
  addFooter(currentPage, totalPages);
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
