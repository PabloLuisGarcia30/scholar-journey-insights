
export interface RegionOfInterest {
  type: 'answer_bubble' | 'question_text' | 'header' | 'scratch_area' | 'clean_zone';
  bounds: { x: number; y: number; width: number; height: number };
  priority: number;
  confidence: number;
  bufferZone?: { x: number; y: number; width: number; height: number };
}

export interface ProcessingRegion {
  include: RegionOfInterest[];
  exclude: RegionOfInterest[];
  masks: ImageMask[];
}

export interface ImageMask {
  type: 'exclude' | 'include' | 'enhance';
  region: { x: number; y: number; width: number; height: number };
  intensity: number;
}

export class RegionOfInterestService {
  private static readonly BUFFER_SIZES = {
    bubble: 5,
    text: 10,
    header: 15,
    scratch: 20
  };

  static generateProcessingRegions(
    templateLayout: any,
    detectedHandwriting: { x: number; y: number; width: number; height: number }[]
  ): ProcessingRegion {
    console.log('🎯 Generating strict processing regions');

    const includeRegions = this.generateIncludeRegions(templateLayout);
    const excludeRegions = this.generateExcludeRegions(detectedHandwriting, templateLayout);
    const masks = this.generateImageMasks(includeRegions, excludeRegions);

    return {
      include: includeRegions,
      exclude: excludeRegions,
      masks
    };
  }

  private static generateIncludeRegions(templateLayout: any): RegionOfInterest[] {
    const regions: RegionOfInterest[] = [];

    // Generate answer bubble regions with strict bounds
    if (templateLayout.bubbleGrid) {
      const bubbleRegions = this.generateBubbleRegions(templateLayout.bubbleGrid);
      regions.push(...bubbleRegions);
    }

    // Generate header region
    if (templateLayout.headerRegion) {
      regions.push({
        type: 'header',
        bounds: templateLayout.headerRegion,
        priority: 3,
        confidence: 0.95,
        bufferZone: this.addBuffer(templateLayout.headerRegion, this.BUFFER_SIZES.header)
      });
    }

    // Generate question text regions
    if (templateLayout.questionRegions && templateLayout.questionRegions.length > 0) {
      const textRegions = templateLayout.questionRegions.map((region: any, index: number) => ({
        type: 'question_text' as const,
        bounds: region,
        priority: 2,
        confidence: 0.85,
        bufferZone: this.addBuffer(region, this.BUFFER_SIZES.text)
      }));
      regions.push(...textRegions);
    }

    return regions;
  }

  private static generateBubbleRegions(bubbleGrid: any): RegionOfInterest[] {
    const regions: RegionOfInterest[] = [];
    const { columns, rows, bubbleRadius, horizontalSpacing, verticalSpacing, startPosition } = bubbleGrid;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = startPosition.x + (col * horizontalSpacing);
        const y = startPosition.y + (row * verticalSpacing);
        
        regions.push({
          type: 'answer_bubble',
          bounds: {
            x: x - bubbleRadius,
            y: y - bubbleRadius,
            width: bubbleRadius * 2,
            height: bubbleRadius * 2
          },
          priority: 4, // Highest priority
          confidence: 0.98,
          bufferZone: this.addBuffer(
            { x: x - bubbleRadius, y: y - bubbleRadius, width: bubbleRadius * 2, height: bubbleRadius * 2 },
            this.BUFFER_SIZES.bubble
          )
        });
      }
    }

    return regions;
  }

  private static generateExcludeRegions(
    handwritingAreas: { x: number; y: number; width: number; height: number }[],
    templateLayout: any
  ): RegionOfInterest[] {
    const excludeRegions: RegionOfInterest[] = [];

    // Add detected handwriting areas as exclusion zones
    handwritingAreas.forEach((area, index) => {
      excludeRegions.push({
        type: 'scratch_area',
        bounds: area,
        priority: 3,
        confidence: 0.8,
        bufferZone: this.addBuffer(area, this.BUFFER_SIZES.scratch)
      });
    });

    // Add known scratch work areas (margins, between questions)
    const scratchAreas = this.identifyCommonScratchAreas(templateLayout);
    excludeRegions.push(...scratchAreas);

    return excludeRegions;
  }

  private static identifyCommonScratchAreas(templateLayout: any): RegionOfInterest[] {
    const scratchAreas: RegionOfInterest[] = [];

    // Left margin (common scratch area)
    scratchAreas.push({
      type: 'scratch_area',
      bounds: { x: 0, y: 0, width: 100, height: 1000 },
      priority: 2,
      confidence: 0.7
    });

    // Right margin
    scratchAreas.push({
      type: 'scratch_area',
      bounds: { x: 700, y: 0, width: 100, height: 1000 },
      priority: 2,
      confidence: 0.7
    });

    // Bottom area (often used for scratch work)
    scratchAreas.push({
      type: 'scratch_area',
      bounds: { x: 0, y: 800, width: 800, height: 200 },
      priority: 1,
      confidence: 0.6
    });

    return scratchAreas;
  }

  private static addBuffer(
    region: { x: number; y: number; width: number; height: number },
    bufferSize: number
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: region.x - bufferSize,
      y: region.y - bufferSize,
      width: region.width + (bufferSize * 2),
      height: region.height + (bufferSize * 2)
    };
  }

  private static generateImageMasks(
    includeRegions: RegionOfInterest[],
    excludeRegions: RegionOfInterest[]
  ): ImageMask[] {
    const masks: ImageMask[] = [];

    // Create enhancement masks for high-priority include regions
    includeRegions
      .filter(region => region.priority >= 3)
      .forEach(region => {
        masks.push({
          type: 'enhance',
          region: region.bounds,
          intensity: region.confidence
        });
      });

    // Create exclusion masks for scratch areas
    excludeRegions.forEach(region => {
      masks.push({
        type: 'exclude',
        region: region.bufferZone || region.bounds,
        intensity: region.confidence
      });
    });

    return masks;
  }

  static applyRegionMasking(
    imageData: string,
    processingRegions: ProcessingRegion
  ): { maskedImageData: string; cleanRegions: RegionOfInterest[] } {
    // In a real implementation, this would apply image masking
    // For now, we'll return the original image with metadata about clean regions
    
    const cleanRegions = processingRegions.include.filter(region => 
      !this.overlapsWithExclusions(region, processingRegions.exclude)
    );

    console.log(`🎭 Applied region masking: ${cleanRegions.length} clean regions identified`);

    return {
      maskedImageData: imageData, // Would be processed image in real implementation
      cleanRegions
    };
  }

  private static overlapsWithExclusions(
    region: RegionOfInterest,
    exclusions: RegionOfInterest[]
  ): boolean {
    return exclusions.some(exclusion => 
      this.regionsOverlap(region.bounds, exclusion.bounds)
    );
  }

  private static regionsOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  static isolateCleanBubbleRegions(
    bubbleRegions: { x: number; y: number; radius: number }[],
    handwritingAreas: { x: number; y: number; width: number; height: number }[]
  ): { x: number; y: number; radius: number; confidence: number }[] {
    return bubbleRegions.map(bubble => {
      const bubbleBounds = {
        x: bubble.x - bubble.radius,
        y: bubble.y - bubble.radius,
        width: bubble.radius * 2,
        height: bubble.radius * 2
      };

      // Check for handwriting interference
      const hasInterference = handwritingAreas.some(area => 
        this.regionsOverlap(bubbleBounds, area)
      );

      return {
        ...bubble,
        confidence: hasInterference ? 0.3 : 0.95
      };
    });
  }
}
