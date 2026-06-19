import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      res.set('Access-Control-Allow-Origin', '*');
    },
  });
  app.enableCors({
    origin: [/https?:\/\/localhost(:\d+)?$/, /https?:\/\/127\.0\.0\.1(:\d+)?$/],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
