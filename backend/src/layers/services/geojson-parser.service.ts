import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class GeoJsonParserService {
  parse(input: any): any {
    let parsed: any;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch {
        throw new BadRequestException('Invalid JSON format');
      }
    } else if (Buffer.isBuffer(input)) {
      try {
        parsed = JSON.parse(input.toString('utf-8'));
      } catch {
        throw new BadRequestException('Invalid JSON format in file buffer');
      }
    } else {
      parsed = input;
    }

    if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
      throw new BadRequestException('Invalid GeoJSON: must be a FeatureCollection');
    }

    return parsed;
  }
}
