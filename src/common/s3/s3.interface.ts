import { Readable } from 'stream';
import { FileBuffer } from '../fileBuffer/fileBuffer';

export interface S3Interface {
  generateContentUrl(key: string): string;

  getContentS3Key(url: string): string;

  putFile(bucket: string, key: string, buffer: FileBuffer): Promise<string>;

  deleteFile(bucket: string, key: string): Promise<boolean>;

  getFile(bucket: string, key: string, range?: string): Promise<Buffer>;

  getFileStream(bucket: string, key: string, range?: string): Readable;

  getFileSize(bucket: string, key: string): Promise<number>;

  listFiles(bucket: string, keyPrefix: string): Promise<string[]>;

  getContentBucketName(): string;
}
