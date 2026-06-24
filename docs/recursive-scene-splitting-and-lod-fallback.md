# Recursive Scene Splitting and LOD Fallback

## 1. Logic cu sai o dau

Logic hien tai xem Scene 3D gan nhu danh sach phang theo LOD. Renderer bat/tat graphic bang dieu kien `graphic.attributes.lodLevel === activeLodLevel`, nen khi user chon LOD2, cac nhanh moi co toi LOD1 se bi an.

## 2. Vi sao `lodLevel === activeLodLevel` khong du

Scene 3D la cay phan cap, khong phai moi nhanh deu du cap sau nhu nhau. Neu loc bang LOD tuyet doi, nhanh chua split sau hon khong co node LOD2 de hien thi va bien mat khoi ban do.

## 3. Logic fallback theo cay

Renderer da doi sang resolve tung nhanh:

- Neu node hien tai da dat hoac vuot LOD user chon, hien node do.
- Neu node chua dat LOD nhung khong co con, fallback hien node do.
- Neu node co con, tiep tuc resolve tung node con va gop ket qua.

Ket qua la LOD2 se hien node sau nhat co the tren moi nhanh, nhung khong vuot qua LOD2.

## 4. Split tiep tu node con

Backend them endpoint:

```txt
POST /scenes/:id/upload-and-split-children
POST /scenes/:id/split
```

Endpoint upload nhan file GLB/GLTF moi. Endpoint `POST /scenes/:id/split` split truc tiep tu file hien co cua node dang chon, dung cho flow click node trong SceneView roi chia tiep chinh node do.

Ca hai flow tao cac node con moi voi:

- `parent = node :id`
- `lodLevel = parent.lodLevel + 1`
- transform con giu dang local/relative voi node cha

Node cha van ton tai. File root shell cua lan split duoc luu vao metadata `childSplitSourceUrl`; chi gan vao `parent.fileUrl` khi parent chua co file.

Frontend them nut split tiep tren tung node co file trong Scene tree va tren inspector cua node dang duoc click trong SceneView. Sau khi split, app reload lai tree/root scene, chuyen root sang LOD tiep theo va invalidate cache cua nhanh vua split.

## 5. Cache

`SceneLodRenderer` tiep tuc cache theo node:

- `loadedSceneNodes: Map<string, SceneGraphic>`
- `childrenCache: Map<string, BackendScene3D[]>`

Khi doi LOD, graphic da load khong bi remove/load lai; renderer chi doi `visible`. Khi split mot nhanh, event reload co `parentId` de invalidate cache cua nhanh do thay vi mac dinh clear toan bo.

## 6. Click selection tach khoi render

Click map chi chon graphic dang visible va build inspector metadata tu attributes cua graphic. Renderer luu them `breadcrumb`, `childCount`, `rootSceneId`, world transform va parent world transform vao attributes de inspector/hit-test khong can fetch lai ca scene tree khi click.

## 7. File da sua

- `backend/src/scenes/scenes.controller.ts`
- `backend/src/scenes/scenes.service.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/MapScene.tsx`
- `frontend/src/features/Scene3D/SceneLodRenderer.ts`
- `frontend/src/features/Scene3D/SceneSelectionManager.ts`
- `frontend/src/features/Scene3D/sceneNodeAdapter.ts`
- `frontend/src/features/EntityInspector/EntityInspectorPanel.tsx`
- `frontend/src/features/SceneManager/ScenePanel.tsx`
- `frontend/src/hooks/useSceneLodLoader.ts`
- `frontend/src/store/mapSlice.ts`
- `frontend/src/types/backend.ts`
- `frontend/src/utils/backendApi.ts`

## 8. Cach test thu cong

1. Upload va place/split mot scene goc.
2. Chon LOD0 va kiem tra model tong the van hien.
3. Chon LOD1 va kiem tra cac node cap 1 hien.
4. Click mot node cap 1 trong SceneView.
5. Trong inspector, bam `Chia cat` de split truc tiep file cua node do.
6. Chon LOD1 va kiem tra node cha van hien.
7. Chon LOD2 va kiem tra node cha duoc thay bang cac node con moi.
8. Kiem tra cac nhanh khac chua split toi LOD2 van con hien bang node sau nhat hien co.
9. Click qua lai nhieu node de kiem tra inspector, breadcrumb va highlight.
10. Di chuyen camera, doi LOD va click node de kiem tra camera khong reset.

## Verification

- `npm run build` trong `frontend`
- `npm run build` trong `backend`
