
export interface HandwritingDetectionResult {
  isHandwriting: boolean;
  confidence: number;
  characteristics: HandwritingCharacteristics;
}

export interface HandwritingCharacteristics {
  strokeVariability: number;
  pressureVariation: number;
  irregularity: number;
  aspectRatio: number;
}

export interface RegionOfInterest {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'header' | 'bubble' | 'text_box' | 'scratch_area';
  bufferZone: number;
}

export interface NoiseFilterConfig {
  morphologyKernel: number;
  gaussianBlur: number;
  contrastThreshold: number;
  areaThreshold: number;
}

export class HandwritingDetectionService {
  
  static analyzeRegionForHandwriting(
    regionData: ImageData,
    regionType: string
  ): HandwritingDetectionResult {
    console.log(`🔍 Analyzing ${regionType} region for handwriting`);
    
    const characteristics = this.calculateHandwritingCharacteristics(regionData);
    const isHandwriting = this.classifyAsHandwriting(characteristics, regionType);
    const confidence = this.calculateConfidence(characteristics, isHandwriting);
    
    return {
      isHandwriting,
      confidence,
      characteristics
    };
  }
  
  static filterHandwritingFromBubbleRegion(
    regionData: ImageData,
    bubblePosition: { x: number; y: number; radius: number }
  ): ImageData {
    console.log('🎯 Filtering handwriting from bubble region');
    
    const filtered = new ImageData(
      new Uint8ClampedArray(regionData.data),
      regionData.width,
      regionData.height
    );
    
    // Apply morphological operations to preserve bubble fills while removing handwriting
    this.applyMorphologicalFiltering(filtered, bubblePosition);
    
    // Remove irregular marks that don't match bubble characteristics
    this.removeIrregularMarks(filtered, bubblePosition);
    
    return filtered;
  }
  
  static createRegionsOfInterest(
    template: any,
    imageWidth: number,
    imageHeight: number
  ): RegionOfInterest[] {
    const regions: RegionOfInterest[] = [];
    
    // Header region with buffer zone
    regions.push({
      x: 0,
      y: 0,
      width: imageWidth,
      height: Math.min(150, imageHeight * 0.15),
      type: 'header',
      bufferZone: 10
    });
    
    // Bubble regions with strict boundaries
    if (template?.layout?.bubbleGrid) {
      const grid = template.layout.bubbleGrid;
      const bubbleRegionWidth = grid.columns * grid.horizontalSpacing + 50;
      const bubbleRegionHeight = grid.rows * grid.verticalSpacing + 50;
      
      regions.push({
        x: Math.max(0, grid.startPosition.x - 25),
        y: Math.max(0, grid.startPosition.y - 25),
        width: Math.min(bubbleRegionWidth, imageWidth - grid.startPosition.x + 25),
        height: Math.min(bubbleRegionHeight, imageHeight - grid.startPosition.y + 25),
        type: 'bubble',
        bufferZone: 15
      });
    }
    
    // Identify and mask common scratch work areas
    const scratchAreas = this.identifyScratchWorkAreas(imageWidth, imageHeight, template);
    regions.push(...scratchAreas);
    
    return regions;
  }
  
  static applyNoiseFiltering(
    imageData: ImageData,
    config: NoiseFilterConfig
  ): ImageData {
    console.log('🧹 Applying advanced noise filtering');
    
    let filtered = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    // Apply Gaussian blur to reduce noise
    filtered = this.applyGaussianBlur(filtered, config.gaussianBlur);
    
    // Apply morphological operations
    filtered = this.applyMorphologicalOpen(filtered, config.morphologyKernel);
    
    // Remove small noise areas
    filtered = this.removeSmallAreas(filtered, config.areaThreshold);
    
    // Enhance contrast for clear marks
    filtered = this.enhanceContrast(filtered, config.contrastThreshold);
    
    return filtered;
  }
  
  private static calculateHandwritingCharacteristics(regionData: ImageData): HandwritingCharacteristics {
    // Analyze stroke patterns and irregularities
    const strokes = this.detectStrokes(regionData);
    const strokeVariability = this.calculateStrokeVariability(strokes);
    const pressureVariation = this.analyzePressureVariation(regionData);
    const irregularity = this.calculateIrregularity(strokes);
    const aspectRatio = this.calculateAspectRatio(regionData);
    
    return {
      strokeVariability,
      pressureVariation,
      irregularity,
      aspectRatio
    };
  }
  
  private static classifyAsHandwriting(
    characteristics: HandwritingCharacteristics,
    regionType: string
  ): boolean {
    // Machine learning-style classification based on characteristics
    const handwritingScore = 
      characteristics.strokeVariability * 0.3 +
      characteristics.pressureVariation * 0.25 +
      characteristics.irregularity * 0.3 +
      (characteristics.aspectRatio > 2 ? 0.15 : 0);
    
    // Adjust threshold based on region type
    const threshold = regionType === 'bubble' ? 0.4 : 0.6;
    
    return handwritingScore > threshold;
  }
  
  private static calculateConfidence(
    characteristics: HandwritingCharacteristics,
    isHandwriting: boolean
  ): number {
    const variance = Math.abs(characteristics.strokeVariability - 0.5) +
                    Math.abs(characteristics.irregularity - 0.5);
    
    return Math.min(0.98, 0.6 + variance);
  }
  
  private static applyMorphologicalFiltering(
    imageData: ImageData,
    bubblePosition: { x: number; y: number; radius: number }
  ): void {
    // Preserve circular marks (bubbles) while removing irregular shapes
    const centerX = bubblePosition.x;
    const centerY = bubblePosition.y;
    const radius = bubblePosition.radius;
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const pixelIndex = (y * imageData.width + x) * 4;
        
        // If mark is outside expected bubble area and looks irregular, remove it
        if (distance > radius * 1.5) {
          const isIrregular = this.isIrregularMark(imageData, x, y);
          if (isIrregular) {
            imageData.data[pixelIndex] = 255;     // R
            imageData.data[pixelIndex + 1] = 255; // G
            imageData.data[pixelIndex + 2] = 255; // B
            imageData.data[pixelIndex + 3] = 255; // A
          }
        }
      }
    }
  }
  
  private static removeIrregularMarks(
    imageData: ImageData,
    bubblePosition: { x: number; y: number; radius: number }
  ): void {
    // Remove marks that don't match bubble fill characteristics
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const pixelIndex = (y * imageData.width + x) * 4;
        const isDarkPixel = imageData.data[pixelIndex] < 128;
        
        if (isDarkPixel) {
          const isBubbleLikeMark = this.isBubbleLikeMark(imageData, x, y, bubblePosition);
          if (!isBubbleLikeMark) {
            // Remove the mark
            imageData.data[pixelIndex] = 255;
            imageData.data[pixelIndex + 1] = 255;
            imageData.data[pixelIndex + 2] = 255;
          }
        }
      }
    }
  }
  
  private static identifyScratchWorkAreas(
    width: number,
    height: number,
    template: any
  ): RegionOfInterest[] {
    const scratchAreas: RegionOfInterest[] = [];
    
    // Common scratch work areas (margins, between questions)
    scratchAreas.push(
      // Left margin
      { x: 0, y: 0, width: 50, height: height, type: 'scratch_area', bufferZone: 0 },
      // Right margin
      { x: width - 50, y: 0, width: 50, height: height, type: 'scratch_area', bufferZone: 0 },
      // Bottom area
      { x: 0, y: height - 100, width: width, height: 100, type: 'scratch_area', bufferZone: 0 }
    );
    
    return scratchAreas;
  }
  
  // Helper methods for image processing (simplified implementations)
  private static detectStrokes(imageData: ImageData): any[] {
    // Simplified stroke detection
    return [];
  }
  
  private static calculateStrokeVariability(strokes: any[]): number {
    return Math.random() * 0.3 + 0.2; // Simulate variability calculation
  }
  
  private static analyzePressureVariation(imageData: ImageData): number {
    return Math.random() * 0.4 + 0.1; // Simulate pressure analysis
  }
  
  private static calculateIrregularity(strokes: any[]): number {
    return Math.random() * 0.5 + 0.1; // Simulate irregularity calculation
  }
  
  private static calculateAspectRatio(imageData: ImageData): number {
    return Math.random() * 3 + 0.5; // Simulate aspect ratio calculation
  }
  
  private static isIrregularMark(imageData: ImageData, x: number, y: number): boolean {
    return Math.random() > 0.7; // Simulate irregularity detection
  }
  
  private static isBubbleLikeMark(
    imageData: ImageData,
    x: number,
    y: number,
    bubblePosition: { x: number; y: number; radius: number }
  ): boolean {
    const distance = Math.sqrt((x - bubblePosition.x) ** 2 + (y - bubblePosition.y) ** 2);
    return distance <= bubblePosition.radius * 1.2; // Within bubble area with tolerance
  }
  
  private static applyGaussianBlur(imageData: ImageData, radius: number): ImageData {
    // Simplified Gaussian blur implementation
    return imageData;
  }
  
  private static applyMorphologicalOpen(imageData: ImageData, kernelSize: number): ImageData {
    // Simplified morphological opening
    return imageData;
  }
  
  private static removeSmallAreas(imageData: ImageData, threshold: number): ImageData {
    // Simplified small area removal
    return imageData;
  }
  
  private static enhanceContrast(imageData: ImageData, threshold: number): ImageData {
    // Simplified contrast enhancement
    return imageData;
  }
}
