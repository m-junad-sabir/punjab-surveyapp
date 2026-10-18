import { Injectable, NotFoundException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class PhotoStorageService {
  private readonly driver = process.env.STORAGE_DRIVER ?? 'local';
  private readonly localRoot = path.resolve(process.env.STORAGE_LOCAL_DIR ?? './uploads');
  private readonly bucket = process.env.S3_BUCKET;
  private readonly s3 = this.driver === 's3'
    ? new S3Client({
        region: process.env.S3_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
      })
    : null;

  async save(key: string, data: Buffer, contentType: string): Promise<void> {
    if (this.driver === 's3') {
      if (!this.s3 || !this.bucket || !process.env.S3_ENDPOINT ||
          !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
        throw new Error('S3 storage requires its endpoint, bucket, and access credentials.');
      }
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }));
      return;
    }

    const destination = this.resolveLocalPath(key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data);
  }

  async read(key: string): Promise<{ data: Buffer; contentType: string }> {
    if (this.driver === 's3') {
      if (!this.s3 || !this.bucket || !process.env.S3_ENDPOINT ||
          !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
        throw new Error('S3 storage is not configured.');
      }
      const object = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes) throw new NotFoundException('Photo file not found.');
      return { data: Buffer.from(bytes), contentType: object.ContentType ?? 'application/octet-stream' };
    }

    try {
      return { data: await readFile(this.resolveLocalPath(key)), contentType: 'image/jpeg' };
    } catch {
      throw new NotFoundException('Photo file not found.');
    }
  }

  async remove(key: string): Promise<void> {
    if (this.driver === 's3') {
      if (this.s3 && this.bucket) {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      }
      return;
    }
    await rm(this.resolveLocalPath(key), { force: true });
  }

  private resolveLocalPath(key: string): string {
    const destination = path.resolve(this.localRoot, key);
    if (!destination.startsWith(`${this.localRoot}${path.sep}`)) {
      throw new Error('Invalid storage key.');
    }
    return destination;
  }
}