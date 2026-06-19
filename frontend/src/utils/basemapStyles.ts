import esriRequest from "@arcgis/core/request";

type RawBasemapStyle = {
  path: string;
  name: string;
  complete?: boolean;
  deprecated?: boolean;
};

type BasemapStyle = {
  id: string;
  name: string;
};

const BASEMAP_STYLES_URL =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/self";

export const loadBasemapStyles = async (signal?: AbortSignal) => {
  const response = await esriRequest(BASEMAP_STYLES_URL, {
    responseType: "json",
    signal,
  });

  const styles = (response.data?.styles ?? []) as RawBasemapStyle[];

  return styles
    .filter((style) => style.complete && !style.deprecated)
    .map((style) => ({
      id: style.path,
      name: style.name,
    })) satisfies BasemapStyle[];
};

export type { BasemapStyle };
