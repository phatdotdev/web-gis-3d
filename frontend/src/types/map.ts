export type TerrainMode = "world-elevation" | "world-topobathymetry" | "flat";

export type MapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  scale: number;
};
