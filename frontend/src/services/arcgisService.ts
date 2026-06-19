/**
 * Tiện ích dịch vụ xử lý truy vấn dữ liệu từ ArcGIS REST Query URL
 */

/**
 * Chuẩn hóa và bổ sung các tham số truy vấn mặc định cho URL ArcGIS REST Query
 * @param inputUrl URL nguồn do người dùng nhập
 */
export function formatArcgisUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl.trim());
    
    // Kiểm tra xem URL có phải là ArcGIS REST Query endpoint không
    const isArcgisQuery = 
      url.pathname.endsWith("/query") || 
      url.pathname.includes("/MapServer/") || 
      url.pathname.includes("/FeatureServer/");
    
    if (isArcgisQuery) {
      // Nếu URL chỉ tới lớp bản đồ mà chưa trỏ tới /query, tự động thêm /query
      if (!url.pathname.endsWith("/query")) {
        const mapServerRegex = /\/(MapServer|FeatureServer)\/\d+\/?$/;
        if (mapServerRegex.test(url.pathname)) {
          url.pathname = url.pathname.replace(/\/?$/, "/query");
        }
      }
      
      // Bổ sung các tham số truy vấn mặc định nếu chưa có
      if (!url.searchParams.has("where")) {
        url.searchParams.set("where", "1=1");
      }
      if (!url.searchParams.has("outFields")) {
        url.searchParams.set("outFields", "*");
      }
      if (!url.searchParams.has("returnGeometry")) {
        url.searchParams.set("returnGeometry", "true");
      }
      if (!url.searchParams.has("f")) {
        url.searchParams.set("f", "geojson");
      }
      // outSR=4326 bảo đảm máy chủ ArcGIS tự động chuyển đổi hệ tọa độ VN_2000 (nếu có)
      // về hệ tọa độ chuẩn WGS84 (Kinh độ/Vĩ độ) trước khi trả về trình duyệt
      if (!url.searchParams.has("outSR")) {
        url.searchParams.set("outSR", "4326");
      }
    }
    
    return url.toString();
  } catch (e) {
    return inputUrl;
  }
}

/**
 * Chuyển đổi định dạng Esri JSON sang GeoJSON chuẩn
 * @param esriJson Đối tượng dữ liệu Esri JSON
 */
export function convertEsriJsonToGeoJson(esriJson: any): any {
  const geojson = {
    type: "FeatureCollection",
    features: [] as any[],
  };

  const geometryType = esriJson.geometryType;
  const features = esriJson.features || [];

  for (const esriFeature of features) {
    const properties = esriFeature.attributes || {};
    let geometry: any = null;

    if (esriFeature.geometry) {
      const typeLower = (geometryType || "").toLowerCase();
      
      if (typeLower === "esrigeometrypoint" || typeLower === "point") {
        const x = esriFeature.geometry.x;
        const y = esriFeature.geometry.y;
        const z = esriFeature.geometry.z;
        const coords = z !== undefined ? [x, y, z] : [x, y];
        geometry = {
          type: "Point",
          coordinates: coords,
        };
      } else if (typeLower === "esrigeometrymultipoint" || typeLower === "multipoint") {
        geometry = {
          type: "MultiPoint",
          coordinates: esriFeature.geometry.points || [],
        };
      } else if (typeLower === "esrigeometrypolyline" || typeLower === "polyline") {
        const paths = esriFeature.geometry.paths || [];
        if (paths.length === 1) {
          geometry = {
            type: "LineString",
            coordinates: paths[0],
          };
        } else {
          geometry = {
            type: "MultiLineString",
            coordinates: paths,
          };
        }
      } else if (typeLower === "esrigeometrypolygon" || typeLower === "polygon") {
        const rings = esriFeature.geometry.rings || [];
        geometry = {
          type: "Polygon",
          coordinates: rings,
        };
      }
    }

    geojson.features.push({
      type: "Feature",
      geometry: geometry,
      properties: properties,
    });
  }

  return geojson;
}

/**
 * Tải dữ liệu từ URL ArcGIS REST Query, tự động phân trang nếu vượt giới hạn transfer limit
 * @param formattedUrl URL đã chuẩn hóa
 */
export async function fetchArcgisData(formattedUrl: string): Promise<any> {
  let offset = 0;
  const limit = 1000;
  let hasMore = true;
  let allFeatures: any[] = [];
  
  while (hasMore) {
    const pageUrl = new URL(formattedUrl);
    pageUrl.searchParams.set("resultOffset", offset.toString());
    pageUrl.searchParams.set("resultRecordCount", limit.toString());

    const response = await fetch(pageUrl.toString());
    if (!response.ok) {
      throw new Error(`Máy chủ ArcGIS trả về mã lỗi HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data) {
      break;
    }

    // Kiểm tra xem phản hồi có lỗi từ phía ArcGIS REST không
    if (data.error) {
      throw new Error(data.error.message || "Lỗi truy vấn từ máy chủ ArcGIS.");
    }

    let pageFeatures: any[] = [];
    let exceeded = false;

    // Phân tích định dạng dữ liệu trả về (GeoJSON hoặc Esri JSON)
    if (data.type === "FeatureCollection") {
      pageFeatures = data.features || [];
      exceeded = data.exceededTransferLimit === true;
    } else if (data.features && (data.geometryType || data.fields)) {
      // Chuyển đổi từ Esri JSON sang GeoJSON
      const geojsonData = convertEsriJsonToGeoJson(data);
      pageFeatures = geojsonData.features || [];
      exceeded = data.exceededTransferLimit === true;
    } else if (Array.isArray(data.features)) {
      pageFeatures = data.features;
    } else if (data.type === "Feature" && data.geometry) {
      pageFeatures = [data];
    } else {
      throw new Error("Không thể xác định định dạng dữ liệu (không phải GeoJSON hoặc Esri JSON).");
    }

    allFeatures = allFeatures.concat(pageFeatures);

    // Tiếp tục phân trang nếu máy chủ ArcGIS báo vượt quá giới hạn và trang hiện tại có dữ liệu
    if (exceeded && pageFeatures.length > 0) {
      offset += limit;
    } else {
      hasMore = false;
    }
  }

  return {
    type: "FeatureCollection",
    features: allFeatures,
  };
}
