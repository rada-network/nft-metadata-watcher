import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as AWS from 'aws-sdk';
import { GetObjectRequest } from 'aws-sdk/clients/s3';
import { FileBuffer } from '../fileBuffer/fileBuffer';
import { S3Interface } from './s3.interface';

@Injectable()
export class S3Service implements S3Interface {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(S3Service.name);

  private getClient(internal: boolean): AWS.S3 {
    const url = internal
      ? this.configService.get('s3.internalUrl')
      : this.configService.get('s3.url');
    const region = this.configService.get('s3.region');
    const key = this.configService.get('s3.accountKey');
    const secret = this.configService.get('s3.accountSecret');

    this.logger.debug(`key: ${key}, region: ${region}`);
    // Use v2 because URLs generated using AWS SDK v3 do not work well with minio
    const credentials = new AWS.Credentials({
      // TODO: vault for secure key, secret
      accessKeyId: key,
      secretAccessKey: secret,
    });
    return new AWS.S3({
      credentials,
      region,
      endpoint: url,
      s3ForcePathStyle: this.configService.get('s3.forcePathStyle') === 'true',
      signatureVersion: 'v4',
    });
  }

  generateContentUrl(key: string): string {
    const bucketEndpoint = this.configService.get('s3.contentsBucketEndpoint');
    const url = `${bucketEndpoint}/${this.configService.get(
      's3.contentsBucket',
    )}`;
    return `${url}/${key}`;
  }

  getContentS3Key(baseUrl: string) {
    const bucketEndpoint = this.configService.get('s3.contentsBucketEndpoint');
    const url = `${bucketEndpoint}/${this.configService.get(
      's3.contentsBucket',
    )}`;
    const [_, ...parsed] = baseUrl.replace(url, '').split('/');
    return parsed.join('/');
  }

  async putFile(
    bucket: string,
    key: string,
    file: FileBuffer,
  ): Promise<string> {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mime,
    };
    const client = this.getClient(true);
    return client
      .putObject(params)
      .promise()
      .then((r) => {
        return r.VersionId;
      });
  }

  async deleteFile(bucket: string, key: string): Promise<boolean> {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    const client = this.getClient(true);
    return client
      .deleteObject(params)
      .promise()
      .then(() => {
        return true;
      });
  }

  async getFile(bucket: string, key: string, range?: string): Promise<Buffer> {
    const params: GetObjectRequest = {
      Bucket: bucket,
      Key: key,
    };
    if (range) {
      params.Range = range;
    }
    const client = this.getClient(true);
    return client
      .getObject(params)
      .promise()
      .then((r) => r.Body as Buffer);
  }

  getFileStream(bucket: string, key: string): Readable {
    const params: GetObjectRequest = {
      Bucket: bucket,
      Key: key,
    };

    const client = this.getClient(true);
    return client.getObject(params).createReadStream();
  }

  async getFileSize(bucket: string, key: string): Promise<number> {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    const client = this.getClient(true);
    return client
      .headObject(params)
      .promise()
      .then((r) => r.ContentLength);
  }

  async copyFile(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<boolean> {
    const params = {
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destBucket,
      Key: destKey,
    };
    const client = this.getClient(true);
    return client
      .copyObject(params)
      .promise()
      .then(() => true);
  }

  async listFiles(bucket: string, keyPrefix: string): Promise<string[]> {
    const params = {
      Bucket: bucket,
      Prefix: keyPrefix,
    };
    const client = this.getClient(true);
    return client
      .listObjectsV2(params)
      .promise()
      .then((r) => {
        if (!r || !r.Contents) {
          return [];
        }
        return r.Contents.map((c) => c.Key);
      });
  }

  public getContentBucketName() {
    return this.configService.get('s3.contentsBucket');
  }

  public generateFileKey(key: string): string {
    const env = process.env.NODE_ENV;
    return `${env === 'development' ? 'dev' : 'prod'}/${key}`;
  }

  public generateImageUrl(poolId: number, rarity: number): string {
    //https://nft-meta.rada.network/testnet/imgs/[poolid]/[rarity].jpg

    const env = process.env.NODE_ENV;
    const baseUrl = 'https://nft-meta.rada.network/';
    return `${baseUrl}/${
      env === 'development' ? 'testnet' : 'mainnet'
    }/imgs/${poolId}/${rarity}.jpg`;
  }

  public getRarityName(rarity: number): string {
    const nameJson = {
      '1': 'Creator',
      '2': 'Ruler',
      '3': 'Caregiver',
      '4': 'Jester',
      '5': 'Citizen',
      '6': 'Lover',
      '7': 'Hero',
      '8': 'Magician',
      '9': 'Rebel',
      '10': 'Explorer',
      '11': 'Sage',
      '12': 'Innocent',
    };

    return nameJson[rarity.toString()];
  }
}
