
import html2pdf from 'html2pdf.js';
import { generateTestHTML, generateConsolidatedTestHTML, StudentTestData } from './printService';
import { TestData } from '@/utils/pdfGenerator';

export const generatePDFFromHTML = async (
  htmlContent: string, 
  filename: string,
  options?: any
): Promise<void> => {
  const defaultOptions = {
    margin: 0.5,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true 
    },
    jsPDF: { 
      unit: 'in', 
      format: 'letter', 
      orientation: 'portrait' 
    }
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    await html2pdf().from(htmlContent).set(finalOptions).save();
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  }
};

export const generateTestPDFFromHTML = async (testData: TestData): Promise<void> => {
  const htmlContent = generateTestHTML(testData);
  const fileName = testData.studentName && testData.studentId
    ? `${testData.title.replace(/\s+/g, '_')}_${testData.studentName.replace(/\s+/g, '_')}_${testData.studentId}.pdf`
    : testData.studentName 
    ? `${testData.title.replace(/\s+/g, '_')}_${testData.studentName.replace(/\s+/g, '_')}.pdf`
    : `${testData.title.replace(/\s+/g, '_')}.pdf`;
  
  await generatePDFFromHTML(htmlContent, fileName);
};

export const generateStudentTestPDFsFromHTML = async (
  testData: TestData, 
  studentNames: string[]
): Promise<void> => {
  for (const studentName of studentNames) {
    const studentTestData: StudentTestData = {
      ...testData,
      studentName
    };
    await generateTestPDFFromHTML(studentTestData);
  }
};

export const generateConsolidatedTestPDFFromHTML = async (
  testData: TestData, 
  studentNames: string[]
): Promise<void> => {
  const htmlContent = generateConsolidatedTestHTML(testData, studentNames);
  const fileName = `${testData.title.replace(/\s+/g, '_')}_All_Students.pdf`;
  
  await generatePDFFromHTML(htmlContent, fileName);
};
