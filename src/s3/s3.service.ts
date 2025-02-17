import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    this.bucketName = process.env.S3_BUCKET_NAME as string;
  }

  // 이미지 다운로드 후 S3에 업로드
  async uploadImageFromUrl(imageUrl: string): Promise<string> {
    try {
      // 이미지 다운로드
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const fileName = path.basename(imageUrl).split('?')[0];
      const s3PathUrl = `s3 저장소 url`;
      const s3FilePath = path.join(s3PathUrl, fileName);
      
      // 이미지 저장
      const localPathUrl = `로컬 저장소 url`;
      const localFilePath = path.join(localPathUrl, fileName);
      fs.writeFileSync(localFilePath, buffer);

      // S3에 업로드
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3FilePath,
        Body: buffer,
        ContentType: response.headers['content-type'],
      };

      await this.s3.send(new PutObjectCommand(uploadParams));

      return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('S3 업로드 실패:', error);
      throw new Error('S3 업로드 실패');
    }
  }
}