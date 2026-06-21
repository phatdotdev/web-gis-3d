# Scene LOD Improvement Report

## 1. Van de truoc day

- Scene 3D chua co state LOD tap trung de nguoi dung chu dong chon muc chi tiet.
- `useSceneLodLoader` phu thuoc vao selection/editing node, nen click node co the kich hoat cleanup va add/remove lai graphics.
- Click scene node co nhanh fetch lai scene theo id de tao inspector, trong khi graphic da co du lieu can thiet.
- Logic tinh node, render, hit-test va inspector bi tron trong `MapScene`/`ScenePanel`.

## 2. LOD control da them

- Them `SceneLodControls` trong `frontend/src/features/Scene3D/SceneLodControls.tsx`.
- Control duoc dat trong `ScenePanel`, ngay sau khu vuc upload/place scene.
- Nguoi dung co the chon:
  - `LOD0`: model goc.
  - `LOD1`: thanh phan da tach.
  - `LOD2`: san sang cho chi tiet sau nay.

## 3. Tach render va selection

- Them adapter `sceneNodeAdapter.ts` de chuan hoa `BackendScene3D` thanh `SceneNode`.
- Them `SceneLodRenderer.ts` de quan ly cache `Map<string, Graphic>` va dong bo visibility theo LOD.
- Them `SceneSelectionManager.ts` de xu ly hit-test scene graphic theo `activeLodLevel`.
- `MapScene` bay gio chi dieu phoi view/layer/state/inspector, khong con tu tao lai virtual scene bang fetch scene khi click.

## 4. Sua click model bi giat/load lai

- Bo dependency selection khoi render effect cua `useSceneLodLoader`.
- Doi LOD chi cap nhat graphic visibility va nhom hit-test, khong reset camera.
- Scene graphic da load duoc giu trong cache; chi fetch children lan dau khi can LOD cao hon.
- Click scene node doc du lieu tu attributes cua graphic da cache, khong `fetchSceneById`, khong reload GLB.

## 5. File da sua

- `frontend/src/store/mapSlice.ts`
- `frontend/src/types/backend.ts`
- `frontend/src/hooks/useSceneLodLoader.ts`
- `frontend/src/components/MapScene.tsx`
- `frontend/src/features/SceneManager/ScenePanel.tsx`
- `frontend/src/features/EntityInspector/EntityInspectorPanel.tsx`
- `frontend/src/features/Scene3D/sceneNodeAdapter.ts`
- `frontend/src/features/Scene3D/SceneLodRenderer.ts`
- `frontend/src/features/Scene3D/SceneSelectionManager.ts`
- `frontend/src/features/Scene3D/SceneLodControls.tsx`

## 6. Cach test thu cong

1. Mo ban do 3D.
2. Bat mot Scene 3D da tach tu GLB.
3. Chon `LOD0`.
4. Click vao model goc.
5. Kiem tra inspector hien thong tin scene goc, model URL va so node con.
6. Chon `LOD1`.
7. Click vao tung phan model da tach.
8. Kiem tra inspector hien dung breadcrumb, parent scene, transform va metadata cua tung phan.
9. Click qua lai nhieu lan de xac nhan model khong bien mat, khong flash layer va inspector chi doi noi dung.
10. Zoom gan/xa va xoay camera de xac nhan camera khong reset khi click hoac doi LOD.

## 7. Co the cai thien tiep

- Bo sung renderer nested LOD2 day du khi backend co node cap 2 that su.
- Them outline/bounding box rieng cho selected node neu ArcGIS symbol/layer view ho tro on dinh.
- Hien thi so luong node theo tung LOD trong `SceneLodControls`.
- Viet test don vi cho adapter tinh toa do child/root.

## 8. Kiem tra da chay

- `npm run build` trong `frontend`: thanh cong.
