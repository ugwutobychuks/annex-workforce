import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'annex-documents');
    this.endpoint = config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    
    const accessKey = config.get<string>('S3_ACCESS_KEY', 'annexminio');
    const secretKey = config.get<string>('S3_SECRET_KEY', 'miniopassword');
    
    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: config.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
    });
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`✅ S3 bucket ready: ${this.bucket}`);
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`📦 Bucket created: ${this.bucket}`);
      } catch (error) {
        this.logger.debug(`S3 bucket auto-creation skipped (may already exist)`);
      }
    }
  }

  async upload(params: {
    file: Buffer;
    key?: string;
    folder?: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ key: string; url: string }> {
    const ext = params.fileName.split('.').pop() ?? 'bin';
    const key = params.key ?? `${params.folder ?? 'uploads'}/${uuidv4()}.${ext}`;

    if (params.file.length > 25 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 25 MB limit');
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.file,
        ContentType: params.mimeType,
        Metadata: { originalName: params.fileName },
      }),
    );

    return { key, url: `${this.endpoint}/${this.bucket}/${key}` };
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
