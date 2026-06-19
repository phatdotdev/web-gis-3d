import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import type { BackendLayer } from "../types/backend";
import { backendHost } from "../utils/backendApi";

type LayerBuildResult = {
  layers: GeoJSONLayer[];
  blobUrls: string[];
};

type ColorTuple = [number, number, number, number];

const getMapPinIcon = (color: string = "#ef4444") => {
  const encodedColor = encodeURIComponent(color);
  return `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2264%22 viewBox=%220 0 48 64%22%3E%3Cfilter id=%22s%22 x=%22-30%25%22 y=%22-20%25%22 width=%22160%25%22 height=%22160%25%22%3E%3CfeDropShadow dx=%220%22 dy=%223%22 stdDeviation=%223%22 flood-color=%22%230f172a%22 flood-opacity=%22.28%22/%3E%3C/filter%3E%3Cpath filter=%22url(%23s)%22 d=%22M24 61s18-20.6 18-36C42 13.4 34 5 24 5S6 13.4 6 25c0 15.4 18 36 18 36Z%22 fill=%22${encodedColor}%22/%3E%3Ccircle cx=%2224%22 cy=%2225%22 r=%2212%22 fill=%22%23ffffff%22/%3E%3Ccircle cx=%2224%22 cy=%2225%22 r=%226%22 fill=%22%232563eb%22/%3E%3C/svg%3E`;
};

const resolveColor = (color?: string | null, opacity?: number | null): ColorTuple => {
  if (!color || typeof color !== "string") {
    return [56, 189, 248, opacity ?? 0.9];
  }
  if (color.startsWith("#")) {
    const value = color.replace("#", "").trim();
    const expand = (chunk: string) => (chunk.length === 1 ? `${chunk}${chunk}` : chunk);
    const r = expand(value.slice(0, 2));
    const g = expand(value.slice(2, 4));
    const b = expand(value.slice(4, 6));
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), opacity ?? 0.9];
  }
  return [56, 189, 248, opacity ?? 0.9];
};

const resolveUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/model/")) return url;
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

const resolveRendererUrls = (renderer: any): any => {
  if (!renderer) return renderer;
  const clone = JSON.parse(JSON.stringify(renderer));
  const traverse = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }
    if (obj.href && typeof obj.href === "string" && obj.href.startsWith("/uploads/")) {
      obj.href = resolveUrl(obj.href);
    }
    Object.values(obj).forEach(traverse);
  };
  traverse(clone);
  return clone;
};

export const createBackendLayer = (
  layer: BackendLayer,
  _show3DModels = true,
  showPositioningIcons = true,
): LayerBuildResult => {
  const layers: GeoJSONLayer[] = [];
  const blobUrls: string[] = [];

  const featureCollection = layer.featureCollection;
  let geoJsonUrl = resolveUrl(layer.featureCollectionUrl) ?? `${backendHost}/api/layers/${layer.id}/geojson`;

  if (featureCollection) {
    geoJsonUrl = URL.createObjectURL(
      new Blob([JSON.stringify(featureCollection)], {
        type: "application/geo+json",
      }),
    );
    blobUrls.push(geoJsonUrl);
  }

  let resolvedRenderer = resolveRendererUrls(layer.renderer);

  if ((layer.type.toLowerCase() === "point" || layer.type === "Point") && featureCollection?.features?.length > 0) {
    const uniqueModelUrls = new Set<string>();
    featureCollection.features.forEach((f: any) => {
      if (f.properties?.modelUrl) {
        uniqueModelUrls.add(f.properties.modelUrl);
      }
    });

    if (uniqueModelUrls.size > 0 || layer.modelUrl) {
      const uniqueValueInfos: any[] = [];
      uniqueModelUrls.forEach((modelUrl) => {
        const resolvedModelUrl = resolveUrl(modelUrl);
        uniqueValueInfos.push({
          value: modelUrl,
          symbol: {
            type: "point-3d",
            symbolLayers: [
              {
                type: "object",
                resource: { href: resolvedModelUrl },
                anchor: "bottom",
              },
            ],
          },
        });
      });

      const defaultModelUrl = resolveUrl(layer.modelUrl);
      const defaultSymbol = defaultModelUrl
        ? {
            type: "point-3d",
            symbolLayers: [
              {
                type: "object",
                resource: { href: defaultModelUrl },
                anchor: "bottom",
              },
            ],
          }
        : {
            type: "point-3d",
            symbolLayers: [
              {
                type: "icon",
                resource: { primitive: "circle" },
                size: 8,
                material: { color: resolveColor(layer.metadata?.color as string, 0.9) },
              },
            ],
          };

      resolvedRenderer = {
        type: "unique-value",
        field: "modelUrl",
        defaultSymbol,
        uniqueValueInfos,
        visualVariables: [
          {
            type: "size",
            axis: "width",
            field: "scaleX",
            valueUnit: "unknown",
          },
          {
            type: "size",
            axis: "depth",
            field: "scaleY",
            valueUnit: "unknown",
          },
          {
            type: "size",
            axis: "height",
            field: "scaleZ",
            valueUnit: "unknown",
          },
          {
            type: "rotation",
            field: "rotationZ",
            rotationType: "geographic",
          },
        ],
      };
    } else {
      if (!resolvedRenderer) {
        resolvedRenderer = {
          type: "simple",
          symbol: {
            type: "point-3d",
            symbolLayers: [
              {
                type: "icon",
                resource: { href: getMapPinIcon(layer.metadata?.color as string || "#ef4444") },
                size: 28,
              },
            ],
          },
        };
      } else if (resolvedRenderer.type === "simple") {
        resolvedRenderer.visualVariables = [
          {
            type: "size",
            axis: "width",
            field: "scaleX",
            valueUnit: "unknown",
          },
          {
            type: "size",
            axis: "depth",
            field: "scaleY",
            valueUnit: "unknown",
          },
          {
            type: "size",
            axis: "height",
            field: "scaleZ",
            valueUnit: "unknown",
          },
          {
            type: "rotation",
            field: "rotationZ",
            rotationType: "geographic",
          },
        ];
      }
    }
  }

  const geoLayer = new GeoJSONLayer({
    url: geoJsonUrl,
    title: layer.name,
    renderer: resolvedRenderer,
    visible: layer.visible,
    elevationInfo: {
      mode: "relative-to-ground",
      featureExpressionInfo: { expression: "$feature.elevation" },
      unit: "meters",
    },
    popupTemplate: layer.popupTemplate,
  });
  layers.push(geoLayer);

  const hasVertexCollection = Boolean(
    layer.vertexFeatureCollection?.features?.length || layer.vertexFeatureCollectionUrl,
  );

  if (hasVertexCollection) {
    let vertexUrl = resolveUrl(layer.vertexFeatureCollectionUrl);

    if (layer.vertexFeatureCollection) {
      vertexUrl = URL.createObjectURL(
        new Blob([JSON.stringify(layer.vertexFeatureCollection)], {
          type: "application/geo+json",
        }),
      );
      blobUrls.push(vertexUrl);
    }

    const resolvedIconUrl = showPositioningIcons ? resolveUrl(layer.iconUrl) : undefined;
    let vertexRenderer: any = null;

    if (showPositioningIcons) {
      if (resolvedIconUrl) {
        vertexRenderer = {
          type: "simple",
          symbol: {
            type: "point-3d",
            symbolLayers: [
              {
                type: "icon",
                resource: { href: resolvedIconUrl },
                size: 12,
              },
            ],
          },
        };
      } else {
        const uniqueValueInfos: any[] = [];
        const uniqueColors = new Set<string>();

        if (layer.vertexFeatureCollection?.features) {
          layer.vertexFeatureCollection.features.forEach((f: any) => {
            if (f.properties?.color) {
              uniqueColors.add(f.properties.color);
            }
          });
        }

        uniqueColors.forEach((color) => {
          uniqueValueInfos.push({
            value: color,
            symbol: {
              type: "point-3d",
              symbolLayers: [
                {
                  type: "icon",
                  resource: { href: getMapPinIcon(color) },
                  size: 28,
                },
              ],
            },
          });
        });

        const defaultColor = layer.metadata?.color || "#ef4444";
        const defaultSymbol = {
          type: "point-3d",
          symbolLayers: [
            {
              type: "icon",
              resource: { href: getMapPinIcon(defaultColor) },
              size: 28,
            },
          ],
        };

        vertexRenderer = {
          type: "unique-value",
          field: "color",
          defaultSymbol,
          uniqueValueInfos,
        };
      }
    }

    if (!vertexRenderer) {
      vertexRenderer = {
        type: "simple",
        symbol: {
          type: "point-3d",
          symbolLayers: [
            {
              type: "icon",
              resource: { href: getMapPinIcon(layer.metadata?.color || "#ef4444") },
              size: 28,
            },
          ],
        },
      };
    }

    const vertexLayer = new GeoJSONLayer({
      url: vertexUrl,
      title: `${layer.name} points`,
      visible: layer.visible && showPositioningIcons,
      renderer: vertexRenderer as any,
      elevationInfo: {
        mode: "relative-to-ground",
      },
      popupTemplate: layer.popupTemplate,
    });
    layers.push(vertexLayer);
  }

  return { layers, blobUrls };
};
