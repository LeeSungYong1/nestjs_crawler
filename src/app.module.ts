import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { S3Service } from './s3/s3.service';
import { CrawlerService } from './crawler/crawler.service';
import { CrawlerController } from './crawler/crawler.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, CrawlerController],
  providers: [AppService, S3Service, CrawlerService],
})
export class AppModule {}
