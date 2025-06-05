
export interface PageGroup {
  groupId: string;
  examId: string | null;
  studentName: string | null;
  pages: Array<{
    pageNumber: number;
    fileName: string;
    file: File;
    confidence: number;
  }>;
  totalPages: number;
  isComplete: boolean;
}

export interface PageDetectionResult {
  pageGroups: PageGroup[];
  ungroupedFiles: File[];
  suggestions: Array<{
    examId: string;
    studentName: string;
    confidence: number;
  }>;
}

export class MultiPageDetectionService {
  static async detectPageGroups(files: File[], extractResults: Array<{
    file: File;
    examId: string | null;
    studentName: string | null;
    extractedText: string;
  }>): Promise<PageDetectionResult> {
    const pageGroups: PageGroup[] = [];
    const ungroupedFiles: File[] = [];
    const suggestions: Array<{ examId: string; studentName: string; confidence: number }> = [];

    // Group by exam ID + student name combination
    const groupMap = new Map<string, PageGroup>();

    for (const result of extractResults) {
      const groupKey = this.createGroupKey(result.examId, result.studentName);
      
      if (groupKey && (result.examId || result.studentName)) {
        let group = groupMap.get(groupKey);
        
        if (!group) {
          group = {
            groupId: groupKey,
            examId: result.examId,
            studentName: result.studentName,
            pages: [],
            totalPages: 0,
            isComplete: false
          };
          groupMap.set(groupKey, group);
        }

        // Detect page number from filename or content
        const pageNumber = this.detectPageNumber(result.file.name, result.extractedText);
        
        group.pages.push({
          pageNumber,
          fileName: result.file.name,
          file: result.file,
          confidence: result.examId ? 0.9 : 0.6
        });
      } else {
        ungroupedFiles.push(result.file);
        
        // Try to suggest based on partial information
        if (result.examId || result.studentName) {
          suggestions.push({
            examId: result.examId || 'Unknown',
            studentName: result.studentName || 'Unknown',
            confidence: 0.5
          });
        }
      }
    }

    // Sort pages within each group and determine completeness
    for (const group of groupMap.values()) {
      group.pages.sort((a, b) => a.pageNumber - b.pageNumber);
      group.totalPages = group.pages.length;
      
      // Check if page sequence is complete (no gaps)
      const pageNumbers = group.pages.map(p => p.pageNumber).filter(n => n > 0);
      if (pageNumbers.length > 0) {
        const expectedSequence = Array.from({ length: pageNumbers.length }, (_, i) => i + 1);
        group.isComplete = pageNumbers.every((num, index) => num === expectedSequence[index]);
      }
      
      pageGroups.push(group);
    }

    return {
      pageGroups,
      ungroupedFiles,
      suggestions: this.deduplicateSuggestions(suggestions)
    };
  }

  private static createGroupKey(examId: string | null, studentName: string | null): string | null {
    if (!examId && !studentName) return null;
    
    const exam = examId || 'NO_EXAM';
    const student = studentName || 'NO_STUDENT';
    return `${exam}__${student}`;
  }

  private static detectPageNumber(fileName: string, content: string): number {
    // Try to extract page number from filename
    const fileNamePatterns = [
      /page[\s_-]*(\d+)/i,
      /p[\s_-]*(\d+)/i,
      /_(\d+)\.pdf$/i,
      /-(\d+)\./i,
      /\((\d+)\)/
    ];

    for (const pattern of fileNamePatterns) {
      const match = fileName.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Try to extract page number from content
    const contentPatterns = [
      /page\s*(\d+)/i,
      /p\.?\s*(\d+)/i,
      /^\s*(\d+)\s*$/m
    ];

    for (const pattern of contentPatterns) {
      const match = content.match(pattern);
      if (match) {
        const pageNum = parseInt(match[1], 10);
        if (pageNum > 0 && pageNum < 100) { // Reasonable page number
          return pageNum;
        }
      }
    }

    return 1; // Default to page 1 if no page number detected
  }

  private static deduplicateSuggestions(suggestions: Array<{ examId: string; studentName: string; confidence: number }>): Array<{ examId: string; studentName: string; confidence: number }> {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.examId}__${suggestion.studentName}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  static async inferMissingInformation(pageGroups: PageGroup[]): Promise<PageGroup[]> {
    // For groups with missing exam ID or student name, try to infer from other pages
    for (const group of pageGroups) {
      if (!group.examId) {
        // Try to find exam ID from other pages in the group
        const pagesWithExamId = group.pages.filter(p => 
          p.fileName.includes('exam') || p.fileName.includes('test')
        );
        
        if (pagesWithExamId.length > 0) {
          // Could implement more sophisticated inference here
          group.examId = 'INFERRED';
        }
      }

      if (!group.studentName) {
        // Try to find student name from consistent patterns across pages
        // This could be enhanced with more sophisticated name detection
        group.studentName = 'INFERRED';
      }
    }

    return pageGroups;
  }
}
