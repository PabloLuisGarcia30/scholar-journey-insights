export interface HandwritingAnalysis {
  isHandwriting: boolean;
  confidence: number;
  markType: 'bubble_fill' | 'scratch_work' | 'erasure' | 'doodle' | 'text' | 'unknown';
  strokeCharacteristics: {
    irregularity: number;
    strokeWidth: number;
    pressure: number;
    consistency: number;
  };
}

export interface Mark {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  area: number;
}

export class HandwritingDetectionService {
  private static readonly BUBBLE_EXPECTED_SIZE = { min: 6, max: 12 };
  private static readonly HANDWRITING_INDICATORS = {
    irregularityThreshold: 0.3,
    strokeVariationThreshold: 0.4,
    densityThreshold: 0.6
  };

  static analyzeMarks(marks: Mark[], expectedBubbleRegions: { x: number; y: number; radius: number }[]): HandwritingAnalysis[] {
    console.log('🔍 Analyzing marks for handwriting detection');
    
    return marks.map(mark => this.analyzeSingleMark(mark, expectedBubbleRegions));
  }

  private static analyzeSingleMark(mark: Mark, expectedBubbleRegions: { x: number; y: number; radius: number }[]): HandwritingAnalysis {
    // Check if mark is near expected bubble location
    const nearBubble = this.isNearExpectedBubble(mark, expectedBubbleRegions);
    
    // Analyze stroke characteristics
    const strokeCharacteristics = this.analyzeStrokeCharacteristics(mark);
    
    // Determine mark type
    const markType = this.classifyMark(mark, strokeCharacteristics, nearBubble);
    
    // Calculate handwriting confidence
    const isHandwriting = this.isLikelyHandwriting(mark, strokeCharacteristics, nearBubble);
    const confidence = this.calculateHandwritingConfidence(mark, strokeCharacteristics, nearBubble);

    return {
      isHandwriting,
      confidence,
      markType,
      strokeCharacteristics
    };
  }

  private static isNearExpectedBubble(mark: Mark, bubbleRegions: { x: number; y: number; radius: number }[]): boolean {
    const tolerance = 15; // pixels
    
    return bubbleRegions.some(bubble => {
      const distance = Math.sqrt(
        Math.pow(mark.x + mark.width/2 - bubble.x, 2) + 
        Math.pow(mark.y + mark.height/2 - bubble.y, 2)
      );
      return distance <= bubble.radius + tolerance;
    });
  }

  private static analyzeStrokeCharacteristics(mark: Mark): HandwritingAnalysis['strokeCharacteristics'] {
    // Simulate stroke analysis based on mark properties
    const aspectRatio = mark.width / mark.height;
    const irregularity = Math.abs(aspectRatio - 1.0); // Perfect circles have ratio of 1
    
    // Estimate stroke characteristics
    const strokeWidth = Math.min(mark.width, mark.height);
    const pressure = mark.intensity / 255; // Normalize intensity
    
    // Calculate consistency (how uniform the mark is)
    const consistency = 1 - irregularity;

    return {
      irregularity,
      strokeWidth,
      pressure,
      consistency
    };
  }

  private static classifyMark(
    mark: Mark, 
    characteristics: HandwritingAnalysis['strokeCharacteristics'], 
    nearBubble: boolean
  ): HandwritingAnalysis['markType'] {
    // Check for bubble fill characteristics
    if (nearBubble && this.isBubbleLikeMark(mark, characteristics)) {
      return 'bubble_fill';
    }

    // Check for erasure marks (low intensity, large area)
    if (characteristics.pressure < 0.3 && mark.area > 50) {
      return 'erasure';
    }

    // Check for text/handwriting (high irregularity, varying width)
    if (characteristics.irregularity > this.HANDWRITING_INDICATORS.irregularityThreshold) {
      return mark.area > 100 ? 'text' : 'scratch_work';
    }

    // Check for doodles (irregular, not near bubbles)
    if (!nearBubble && characteristics.irregularity > 0.5) {
      return 'doodle';
    }

    return 'unknown';
  }

  private static isBubbleLikeMark(mark: Mark, characteristics: HandwritingAnalysis['strokeCharacteristics']): boolean {
    // Check size constraints
    const size = Math.max(mark.width, mark.height);
    if (size < this.BUBBLE_EXPECTED_SIZE.min || size > this.BUBBLE_EXPECTED_SIZE.max) {
      return false;
    }

    // Check circular characteristics
    const aspectRatio = mark.width / mark.height;
    const isCircular = aspectRatio >= 0.7 && aspectRatio <= 1.3;

    // Check consistency (filled bubbles should be relatively uniform)
    const isConsistent = characteristics.consistency > 0.6;

    return isCircular && isConsistent;
  }

  private static isLikelyHandwriting(
    mark: Mark, 
    characteristics: HandwritingAnalysis['strokeCharacteristics'], 
    nearBubble: boolean
  ): boolean {
    // High irregularity suggests handwriting
    if (characteristics.irregularity > this.HANDWRITING_INDICATORS.irregularityThreshold) {
      return true;
    }

    // Variable stroke width suggests handwriting
    if (characteristics.strokeWidth > 3 && characteristics.consistency < 0.5) {
      return true;
    }

    // Large marks not near bubbles are likely handwriting
    if (!nearBubble && mark.area > 200) {
      return true;
    }

    return false;
  }

  private static calculateHandwritingConfidence(
    mark: Mark, 
    characteristics: HandwritingAnalysis['strokeCharacteristics'], 
    nearBubble: boolean
  ): number {
    let confidence = 0;

    // Factor in irregularity
    confidence += characteristics.irregularity * 0.4;

    // Factor in stroke inconsistency
    confidence += (1 - characteristics.consistency) * 0.3;

    // Factor in location (marks far from bubbles more likely to be handwriting)
    if (!nearBubble) {
      confidence += 0.2;
    }

    // Factor in size (very large or very small marks more likely to be handwriting)
    const size = Math.max(mark.width, mark.height);
    if (size < this.BUBBLE_EXPECTED_SIZE.min || size > this.BUBBLE_EXPECTED_SIZE.max) {
      confidence += 0.1;
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  static filterHandwritingMarks(marks: Mark[], expectedBubbleRegions: { x: number; y: number; radius: number }[]): Mark[] {
    const analyses = this.analyzeMarks(marks, expectedBubbleRegions);
    
    const filteredMarks = marks.filter((mark, index) => {
      const analysis = analyses[index];
      
      // Keep marks that are likely intentional bubble fills
      if (analysis.markType === 'bubble_fill' && !analysis.isHandwriting) {
        return true;
      }

      // Filter out handwriting with high confidence
      if (analysis.isHandwriting && analysis.confidence > 0.7) {
        return false;
      }

      // Keep marks with low handwriting confidence
      return analysis.confidence < 0.5;
    });

    console.log(`📝 Filtered ${marks.length - filteredMarks.length} handwriting marks, kept ${filteredMarks.length} potential answers`);
    
    return filteredMarks;
  }
}
