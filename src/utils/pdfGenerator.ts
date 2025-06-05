
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
  const margin = 12; // Reduced margin for more space
  
  let currentPage = 1;
  let yPosition = margin;

  const addHeader = (pageNumber: number) => {
    // More compact header
    pdf.setFillColor(30, 58, 138);
    pdf.rect(0, 0, pageWidth, 18, 'F'); // Reduced height
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12); // Reduced title font size
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 12);
    
    // Exam ID - positioned to fit within page width
    pdf.setFontSize(9);
    const examIdText = `ID: ${testData.examId}`;
    const examIdWidth = pdf.getTextWidth(examIdText);
    pdf.text(examIdText, pageWidth - margin - examIdWidth, 12);
    
    let headerYPos = 22;
    pdf.setTextColor(0, 0, 0);
    
    // First page only - very compact student info
    if (pageNumber === 1) {
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Class: ${testData.className} | Time: ${testData.timeLimit} min | Points: ${testData.questions.reduce((sum, q) => sum + q.points, 0)}`, margin, headerYPos);
      
      headerYPos += 6;
      
      // Ultra compact student info section
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, headerYPos, pageWidth - 2 * margin, 12, 'D');
      
      pdf.setFontSize(7);
      pdf.text('Name:', margin + 3, headerYPos + 7);
      pdf.line(margin + 20, headerYPos + 8, margin + 70, headerYPos + 8);
      
      pdf.text('ID:', margin + 80, headerYPos + 7);
      pdf.line(margin + 92, headerYPos + 8, margin + 130, headerYPos + 8);
      
      pdf.text('Date:', margin + 140, headerYPos + 7);
      pdf.line(margin + 155, headerYPos + 8, pageWidth - margin - 3, headerYPos + 8);
      
      headerYPos += 16;
    } else {
      // Subsequent pages - minimal header
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${testData.title} - Page ${pageNumber}`, margin, headerYPos);
      const pageIdText = `ID: ${testData.examId}`;
      const pageIdWidth = pdf.getTextWidth(pageIdText);
      pdf.text(pageIdText, pageWidth - margin - pageIdWidth, headerYPos);
      headerYPos += 10;
    }
    
    return headerYPos;
  };

  const addFooter = (pageNumber: number, totalPages: number) => {
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageNumber}/${totalPages}`, pageWidth - margin - 15, pageHeight - 6);
    pdf.text(`ID: ${testData.examId}`, margin, pageHeight - 6);
  };

  const calculateQuestionHeight = (question: Question) => {
    let height = 8; // Much more compact question header
    
    // Question text calculation - very compact
    pdf.setFontSize(8); // Smaller font
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 8);
    height += questionLines.length * 3 + 3; // Very tight line spacing
    
    // Answer options calculation - ultra compact
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach(option => {
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 50);
        height += Math.max(optionLines.length * 3, 6) + 0.5; // Minimal spacing
      });
      height += 5; // Minimal spacing for answer box
    } else if (question.type === 'true-false') {
      height += 12; // Very compact
    } else if (question.type === 'short-answer') {
      height += 10; // Very compact
    } else if (question.type === 'essay') {
      height += 15; // Compact
    }
    
    height += 3; // Minimal bottom margin
    return height;
  };

  const getMaxContentHeight = (pageNumber: number) => {
    const headerHeight = pageNumber === 1 ? 50 : 32; // Very compact headers
    const footerHeight = 15;
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

  // Generate PDF with ultra compact layout
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
    
    // Ultra compact question header
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.2);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'FD'); // Very small header
    
    // Question number and info in one compact line
    pdf.setFontSize(8); // Smaller font
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 58, 138);
    pdf.text(`${questionIndex + 1}.`, margin + 3, yPosition + 4);
    
    pdf.setFontSize(6); // Very small type indicator
    pdf.setTextColor(107, 114, 128);
    const typeText = question.type.replace('-', ' ').toUpperCase();
    pdf.text(`[${typeText}]`, margin + 15, yPosition + 4);
    
    pdf.setTextColor(220, 38, 127);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${question.points}pt`, pageWidth - margin - 12, yPosition + 4);
    
    yPosition += 8; // Very compact
    
    // Ultra compact question text
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8); // Smaller font
    const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 8);
    pdf.text(questionLines, margin + 3, yPosition);
    yPosition += questionLines.length * 3 + 3; // Very tight spacing
    
    // Ultra compact answer options
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        
        // Very small option circle
        pdf.setFillColor(59, 130, 246);
        pdf.circle(margin + 7, yPosition + 2, 1.5, 'F'); // Smaller circle
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6);
        pdf.setFont(undefined, 'bold');
        pdf.text(optionLetter, margin + 6, yPosition + 3);
        
        // Ultra compact option text
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7); // Smaller font
        const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 50);
        pdf.text(optionLines, margin + 12, yPosition + 1);
        
        yPosition += Math.max(optionLines.length * 3, 6) + 0.5; // Minimal spacing
      });
      
      // Ultra compact answer box
      yPosition += 1;
      pdf.setFontSize(6);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(220, 38, 127);
      pdf.text('Answer:', margin + 3, yPosition + 3);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin + 20, yPosition, 8, 5, 'FD'); // Smaller answer box
      
      yPosition += 7;
    } else if (question.type === 'true-false') {
      // Ultra compact True/False
      const options = ['True', 'False'];
      options.forEach((option, idx) => {
        const letter = String.fromCharCode(65 + idx);
        
        pdf.setFillColor(idx === 0 ? 34 : 239, idx === 0 ? 197 : 68, idx === 0 ? 94 : 68);
        pdf.circle(margin + 7, yPosition + 2, 1.5, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6);
        pdf.setFont(undefined, 'bold');
        pdf.text(letter, margin + 6, yPosition + 3);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        pdf.text(option, margin + 12, yPosition + 2);
        
        yPosition += 6; // Very tight spacing
      });
      
      // Ultra compact answer box
      yPosition += 1;
      pdf.setFontSize(6);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(220, 38, 127);
      pdf.text('Answer:', margin + 3, yPosition + 3);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin + 20, yPosition, 8, 5, 'FD');
      
      yPosition += 7;
    } else if (question.type === 'short-answer') {
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Answer:', margin + 3, yPosition + 1);
      yPosition += 4;
      
      // Single answer line to save space
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 3, yPosition, pageWidth - margin - 3, yPosition);
      yPosition += 7;
    } else if (question.type === 'essay') {
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Answer:', margin + 3, yPosition + 1);
      yPosition += 4;
      
      // Two lines for essays
      for (let i = 0; i < 2; i++) {
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 3, yPosition, pageWidth - margin - 3, yPosition);
        yPosition += 4; // Very tight line spacing
      }
      yPosition += 3;
    }
    
    // Minimal question separator
    if (questionIndex < testData.questions.length - 1) {
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(margin + 3, yPosition + 1, pageWidth - margin - 3, yPosition + 1);
      yPosition += 3; // Minimal spacing
    }
  });
  
  // Add footer to last page
  addFooter(currentPage, totalPages);
  
  const fileName = `${testData.title.replace(/\s+/g, '_')}_${testData.examId}.pdf`;
  pdf.save(fileName);
};
