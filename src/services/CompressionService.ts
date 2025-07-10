import { Config } from '../types';

export class CompressionService {
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        // Keep the URL in img.src for later cleanup
        resolve(img);
      };
      img.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      };
      img.src = objectUrl;
    });
  }

  private canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to blob conversion failed'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  async compressImage(file: File, config: Config['compression']): Promise<File> {
    if (!config.enabled) {
      return file;
    }

    let imageUrl: string | null = null;
    
    try {
      const img = await this.loadImage(file);
      imageUrl = img.src;
      
      let { width, height } = img;
      const { maxWidth, maxHeight, quality } = config;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      const canvas = this.createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await this.canvasToBlob(canvas, mimeType, quality / 100);
      
      URL.revokeObjectURL(img.src);
      
      return new File([blob], file.name, {
        type: mimeType,
        lastModified: file.lastModified,
      });
    } catch (error) {
      // Clean up on error
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      console.warn('Image compression failed, using original:', error);
      return file;
    }
  }

  calculateCompressionRatio(original: File, compressed: File): number {
    return Math.round((1 - compressed.size / original.size) * 100);
  }

  private readonly QUALITY_THRESHOLDS = {
    LARGE: { size: 5 * 1024 * 1024, quality: 60 },
    MEDIUM: { size: 2 * 1024 * 1024, quality: 70 },
    SMALL: { size: 1 * 1024 * 1024, quality: 80 },
    TINY: { quality: 90 }
  };

  getOptimalQuality(fileSize: number): number {
    if (fileSize > this.QUALITY_THRESHOLDS.LARGE.size) return this.QUALITY_THRESHOLDS.LARGE.quality;
    if (fileSize > this.QUALITY_THRESHOLDS.MEDIUM.size) return this.QUALITY_THRESHOLDS.MEDIUM.quality;
    if (fileSize > this.QUALITY_THRESHOLDS.SMALL.size) return this.QUALITY_THRESHOLDS.SMALL.quality;
    return this.QUALITY_THRESHOLDS.TINY.quality;
  }
}