import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LayersModule } from './layers/layers.module';
import { SpatialEntitiesModule } from './spatial-entities/spatial-entities.module';
import { Layer } from './layers/entities/layer.entity';
import { SpatialEntity } from './spatial-entities/entities/spatial-entity.entity';
import { Model3D } from './model-3d/entities/model-3d.entity';
import { Model3DModule } from './model-3d/model-3d.module';
import { Scene3D } from './scenes/entities/scene-3d.entity';
import { ScenesModule } from './scenes/scenes.module';
import { ensureDatabaseExists } from './database/ensure-database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST', 'localhost');
        const port = Number(configService.get<string>('DB_PORT', '5432'));
        const username = configService.get<string>('DB_USERNAME', 'postgres');
        const password = configService.get<string>('DB_PASSWORD', '');
        const database = configService.get<string>('DB_DATABASE');

        if (!database) {
          throw new Error('DB_DATABASE is not configured.');
        }

        await ensureDatabaseExists({
          host,
          port,
          user: username,
          password,
          database,
          maintenanceDatabase: configService.get<string>(
            'DB_MAINTENANCE_DATABASE',
            'postgres',
          ),
        });

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [Layer, SpatialEntity, Model3D, Scene3D],
          synchronize: true,
        };
      },
    }),
    LayersModule,
    SpatialEntitiesModule,
    Model3DModule,
    ScenesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
