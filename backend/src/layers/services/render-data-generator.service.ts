import { Injectable } from '@nestjs/common';

type ColorTuple = [number, number, number, number];

const DEFAULT_MAP_PIN_ICON =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2264%22 viewBox=%220 0 48 64%22%3E%3Cfilter id=%22s%22 x=%22-30%25%22 y=%22-20%25%22 width=%22160%25%22 height=%22160%25%22%3E%3CfeDropShadow dx=%220%22 dy=%223%22 stdDeviation=%223%22 flood-color=%22%230f172a%22 flood-opacity=%22.28%22/%3E%3C/filter%3E%3Cpath filter=%22url(%23s)%22 d=%22M24 61s18-20.6 18-36C42 13.4 34 5 24 5S6 13.4 6 25c0 15.4 18 36 18 36Z%22 fill=%22%23ef4444%22/%3E%3Ccircle cx=%2224%22 cy=%2225%22 r=%2212%22 fill=%22%23ffffff%22/%3E%3Ccircle cx=%2224%22 cy=%2225%22 r=%226%22 fill=%22%232563eb%22/%3E%3C/svg%3E';

@Injectable()
export class RenderDataGeneratorService {
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private applyOpacity(color: ColorTuple, opacity?: number | null): ColorTuple {
    if (typeof opacity !== 'number' || !Number.isFinite(opacity)) return color;
    return [color[0], color[1], color[2], this.clamp(opacity, 0, 1)];
  }

  private parseHex(hex: string): ColorTuple | null {
    const value = hex.replace('#', '').trim();
    if (![3, 4, 6, 8].includes(value.length)) return null;

    const expand = (chunk: string) =>
      chunk.length === 1 ? `${chunk}${chunk}` : chunk;

    const r = expand(value.slice(0, value.length <= 4 ? 1 : 2));
    const g = expand(
      value.slice(value.length <= 4 ? 1 : 2, value.length <= 4 ? 2 : 4),
    );
    const b = expand(
      value.slice(value.length <= 4 ? 2 : 4, value.length <= 4 ? 3 : 6),
    );
    const a =
      value.length === 4 || value.length === 8 ? expand(value.slice(-2)) : 'ff';

    const toChannel = (input: string) => parseInt(input, 16);

    return [
      this.clamp(toChannel(r), 0, 255),
      this.clamp(toChannel(g), 0, 255),
      this.clamp(toChannel(b), 0, 255),
      this.clamp(toChannel(a) / 255, 0, 1),
    ] as ColorTuple;
  }

  private parseRgb(input: string): ColorTuple | null {
    const match = input
      .replace(/\s+/g, '')
      .match(/^rgba?\((\d+),(\d+),(\d+)(?:,(\d*\.?\d+))?\)$/i);
    if (!match) return null;
    const r = this.clamp(Number(match[1]), 0, 255);
    const g = this.clamp(Number(match[2]), 0, 255);
    const b = this.clamp(Number(match[3]), 0, 255);
    const a = match[4] != null ? this.clamp(Number(match[4]), 0, 1) : 1;
    return [r, g, b, a] as ColorTuple;
  }

  private resolveColor(color?: string | null, opacity?: number | null): ColorTuple {
    if (!color || typeof color !== 'string') {
      return this.applyOpacity([56, 189, 248, 0.9], opacity);
    }

    const normalized = color.trim();
    const hex = normalized.startsWith('#') ? this.parseHex(normalized) : null;
    const rgb = hex ? null : this.parseRgb(normalized);
    const resolved = hex ?? rgb ?? ([56, 189, 248, 0.9] as ColorTuple);
    return this.applyOpacity(resolved, opacity);
  }

  calculateExtent(features: any[]): { xmin: number; ymin: number; xmax: number; ymax: number } | null {
    if (features.length === 0) return null;

    let xmin = Infinity;
    let ymin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity;

    const traverse = (item: any) => {
      if (Array.isArray(item)) {
        if (typeof item[0] === 'number' && typeof item[1] === 'number') {
          const lng = item[0];
          const lat = item[1];
          if (lng < xmin) xmin = lng;
          if (lng > xmax) xmax = lng;
          if (lat < ymin) ymin = lat;
          if (lat > ymax) ymax = lat;
        } else {
          item.forEach(traverse);
        }
      }
    };

    features.forEach((feature) => {
      if (feature?.geometry?.coordinates) {
        traverse(feature.geometry.coordinates);
      }
    });

    if (xmin === Infinity || ymin === Infinity || xmax === -Infinity || ymax === -Infinity) {
      return null;
    }

    return { xmin, ymin, xmax, ymax };
  }

  private getRepresentativePoint(geometry: any): number[] | null {
    if (!geometry || !geometry.coordinates) return null;
    const type = geometry.type;

    if (type === 'Point') {
      return geometry.coordinates;
    }

    if (type === 'MultiPoint') {
      const coords = geometry.coordinates;
      if (coords.length === 0) return null;
      return coords[0];
    }

    if (type === 'LineString') {
      const coords = geometry.coordinates;
      if (coords.length === 0) return null;
      const midIdx = Math.floor(coords.length / 2);
      return coords[midIdx];
    }

    if (type === 'MultiLineString') {
      const paths = geometry.coordinates;
      if (paths.length === 0 || paths[0].length === 0) return null;
      const midIdx = Math.floor(paths[0].length / 2);
      return paths[0][midIdx];
    }

    if (type === 'Polygon') {
      const ring = geometry.coordinates[0];
      if (!ring || ring.length === 0) return null;
      let sumLng = 0;
      let sumLat = 0;
      const len = ring.length - 1 > 0 ? ring.length - 1 : ring.length;
      for (let i = 0; i < len; i++) {
        sumLng += ring[i][0];
        sumLat += ring[i][1];
      }
      return [sumLng / len, sumLat / len];
    }

    if (type === 'MultiPolygon') {
      const polygon = geometry.coordinates[0];
      if (!polygon || polygon.length === 0 || polygon[0].length === 0) return null;
      const ring = polygon[0];
      let sumLng = 0;
      let sumLat = 0;
      const len = ring.length - 1 > 0 ? ring.length - 1 : ring.length;
      for (let i = 0; i < len; i++) {
        sumLng += ring[i][0];
        sumLat += ring[i][1];
      }
      return [sumLng / len, sumLat / len];
    }

    return null;
  }

  buildVertexCollection(features: any[]): any {
    let counter = 0;
    const vertexFeatures: any[] = [];

    features.forEach((feature) => {
      const geometry = feature.geometry;
      if (!geometry || !geometry.type || !geometry.coordinates) return;

      const representativeCoord = this.getRepresentativePoint(geometry);
      if (representativeCoord) {
        vertexFeatures.push({
          type: 'Feature',
          id: `pin-${counter++}`,
          geometry: { type: 'Point', coordinates: representativeCoord },
          properties: feature.properties ?? {},
        });
      }
    });

    return {
      type: 'FeatureCollection',
      features: vertexFeatures,
    };
  }

  private toPointSymbol(properties: any) {
    const symbolLayers: any[] = [];

    if (properties.assetUrl) {
      symbolLayers.push({
        type: 'object',
        resource: { href: properties.assetUrl },
        height: Math.max(properties.height ?? 1, 1),
        width: Math.max(properties.width ?? 1, 1),
        depth: Math.max(properties.height ?? 1, 1),
        anchor: 'bottom',
      });
    }

    if (properties.iconUrl) {
      symbolLayers.push({
        type: 'icon',
        resource: { href: properties.iconUrl },
        size: Math.max(properties.width ?? 12, 8),
      });
    } else if (!properties.assetUrl) {
      symbolLayers.push({
        type: 'icon',
        resource: { href: DEFAULT_MAP_PIN_ICON },
        size: Math.max(properties.width ?? 28, 22),
      });
    }

    return {
      type: 'point-3d',
      symbolLayers,
    };
  }

  private toLineSymbol(properties: any, color: ColorTuple) {
    const width = Math.max(properties.width ?? 0.4, 0.2);
    const height = Math.max(properties.height ?? width, 0.2);
    return {
      type: 'line-3d',
      symbolLayers: [
        {
          type: 'path',
          profile: 'circle',
          material: { color },
          width,
          height,
          cap: 'round',
          join: 'round',
        },
      ],
    };
  }

  private toPolygonSymbol(color: ColorTuple) {
    return {
      type: 'polygon-3d',
      symbolLayers: [
        {
          type: 'fill',
          material: { color },
          outline: { color: [255, 255, 255, 0.2], size: 1 },
        },
      ],
    };
  }

  buildRenderer(geometryType: string, representativeProperties: any): any {
    const color = this.resolveColor(representativeProperties.color, representativeProperties.opacity);

    if (geometryType.includes('Point')) {
      return {
        type: 'simple',
        symbol: this.toPointSymbol(representativeProperties),
      };
    }

    if (geometryType.includes('Line')) {
      return {
        type: 'simple',
        symbol: this.toLineSymbol(representativeProperties, color),
      };
    }

    return {
      type: 'simple',
      symbol: this.toPolygonSymbol(color),
    };
  }

  buildPopupTemplate(features: any[]): any {
    const metadataKeys = new Set<string>();
    features.forEach((feature) => {
      const properties = feature.properties;
      if (properties) {
        Object.keys(properties).forEach((key) => {
          metadataKeys.add(key);
        });
      }
    });

    const fieldInfos = [
      { fieldName: 'type', label: 'Loại đối tượng' },
      { fieldName: 'renderType', label: 'Kiểu hiển thị' },
      { fieldName: 'elevation', label: 'Cao độ (m)' },
      { fieldName: 'height', label: 'Chiều cao (m)' },
      { fieldName: 'width', label: 'Độ rộng (m)' },
    ];

    const excludedKeys = new Set([
      'name',
      'type',
      'renderType',
      'elevation',
      'height',
      'width',
      'assetUrl',
      'iconUrl',
      'color',
      'opacity',
    ]);

    metadataKeys.forEach((key) => {
      if (!excludedKeys.has(key)) {
        fieldInfos.push({
          fieldName: key,
          label: key,
        });
      }
    });

    return {
      title: '{name}',
      content: [
        {
          type: 'fields',
          fieldInfos,
        },
      ],
    };
  }
}
