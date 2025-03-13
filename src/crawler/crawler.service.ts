import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class CrawlerService {
  private driver: WebDriver;
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  async initializeDriver() {
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless=new'); // ✅ 헤드리스 모드 설정
    chromeOptions.addArguments('--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage');

    this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
  }

  async scrapeWebsite() { 
    await this.initializeDriver();

    const targetUrl = "크롤링 해야되는 url";


    try {
        await this.driver.get(targetUrl);

        // h3.tit 클래스에 있는 텍스트 가져오기
        const titleElement = await this.driver.wait(until.elementLocated(By.css('.info .tit_area .tit')), 10000);
        const titleText = await titleElement.getText();

         // .content_view .txt 클래스 안의 텍스트를 가져오기
        const textElement = await this.driver.findElement(By.css('.content_view .txt'));
        const text = await textElement.getText(); // 텍스트 추출

       // 모든 img 태그를 찾아 src 속성 추출
        const images = await this.driver.findElements(By.css('.content_view .photo_img img'));

        const srcList: string[] = []; // 이미지 URL을 저장할 배열
        // 이미지 src 주소 추출
        for (const image of images) {
            const src = await image.getAttribute('src');
            srcList.push(src); // src를 배열에 추가
        }

        // 이미지 URL들을 S3에 업로드하고 S3 URL 목록을 저장
        const s3UrlList: string[] = [];
        for (const imageUrl of srcList) {
            try {
                const s3Url = await this.s3Service.uploadImageFromUrl(imageUrl);
                s3UrlList.push(s3Url);
                this.logger.log(`✅ 이미지 S3 업로드 완료: ${s3Url}`);
            } catch (error) {
                this.logger.error(`이미지 업로드 실패: ${imageUrl}, 에러: ${error.message}`);
                // 실패한 이미지는 건너뛰고 계속 진행
                continue;
            }
        }


        // 모든 .comment_area .comment_lst li 요소들에서 .txt._content 요소를 찾기
        const commentElements = await this.driver.findElements(By.css('.comment_area .comment_lst .txt._content'));

        const comments: string[] = [];

        // 각 댓글의 텍스트를 추출하여 배열에 저장
        for (let element of commentElements) {
        const commentText = await element.getText();
        comments.push(commentText);
        }
   

      return {
        titleText:titleText,
        contentText:text,
        imgList:srcList,
        commentList:comments,
      };
    } catch (error) {
      this.logger.error(`크롤링 중 오류 발생: ${error}`);
      throw error;
    } finally {
      await this.driver.quit();
    }
  }
}
