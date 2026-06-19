import { useEffect } from "react";

import { useAppDispatch } from "./store/hooks";
import { loadLayers } from "./store/mapSlice";
import MapControls from "./components/MapControls";
import MapScene from "./components/MapScene";
import { LayerPanel } from "./features/LayerManager/LayerPanel";
import ThreeDEditorPanel from "./features/ThreeDEditor/ThreeDEditorPanel";
import { SliceExternalViewer } from "./features/ThreeDEditor/SliceExternalViewer";
import { EntityInspectorPanel } from "./features/EntityInspector/EntityInspectorPanel";

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(loadLayers());
  }, [dispatch]);

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      <MapScene />
      <LayerPanel />
      <MapControls />
      <ThreeDEditorPanel />
      <SliceExternalViewer />
      <EntityInspectorPanel />
    </div>
  );
}

export default App;
