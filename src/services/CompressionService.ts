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
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
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

    try {
      const img = await this.loadImage(file);
      
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
      console.warn('Image compression failed, using original:', error);
      return file;
    }
  }

  calculateCompressionRatio(original: File, compressed: File): number {
    return Math.round((1 - compressed.size / original.size) * 100);
  }

  getOptimalQuality(fileSize: number): number {
    if (fileSize > 5 * 1024 * 1024) return 60;
    if (fileSize > 2 * 1024 * 1024) return 70;
    if (fileSize > 1 * 1024 * 1024) return 80;
    return 90;
  }
}