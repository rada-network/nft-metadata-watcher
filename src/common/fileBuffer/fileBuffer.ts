import * as FileType from 'file-type';

export class FileBuffer {
  constructor(
    readonly buffer: Buffer,
    readonly ext: string,
    readonly mime: string,
  ) {
    this.sizeBytes = buffer.length;
  }
  readonly sizeBytes: number;

  private static IMAGE_MIME_TYPES = ['image/png', 'image/gif', 'image/jpeg'];

  private ALLOWED_CONTENT_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'video/ogg',
    'model/gltf-binary',
    'model/gltf+json',
    'application/pdf',
    'application/json',
  ];

  static async fromBase64(base64: string): Promise<FileBuffer> {
    const buffer = Buffer.from(base64, 'base64');
    const types = await FileType.fromBuffer(buffer);
    return new FileBuffer(buffer, types.ext, types.mime);
  }

  static async fromBuffer(buffer: Buffer): Promise<FileBuffer> {
    const types = await FileType.fromBuffer(buffer);
    return new FileBuffer(buffer, types.ext, types.mime);
  }

  static extToMime(ext: string): string {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'ogg':
        return 'video/ogg';
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
    }
    throw new Error('Invalid ext.');
  }

  static isImageMimeType(mime: string): boolean {
    return FileBuffer.IMAGE_MIME_TYPES.includes(mime);
  }

  isImage(): boolean {
    return FileBuffer.isImageMimeType(this.mime);
  }

  isAllowedContent(): boolean {
    // TODO: svg
    return this.ALLOWED_CONTENT_MIME_TYPES.includes(this.mime);
  }
}
