import React, { useState, useEffect } from "react";
import { Search, Plus, Loader2, Box, Crosshair, ArrowLeft } from "lucide-react";

import { useAppDispatch } from "../../store/hooks";
import { goToEntity, deleteEntity } from "../../store/mapSlice";
import { backendHost } from "../../utils/backendApi";
import type { BackendSpatialEntity } from "../../types/backend";
import { FeatureForm } from "./FeatureForm";
import { FeatureDetail } from "./FeatureDetail";

type ViewState = "list" | "create" | "edit" | "detail";

export const FeaturePanel: React.FC = () => {
  const dispatch = useAppDispatch();

  const [view, setView] = useState<ViewState>("list");
  const [entities, setEntities] = useState<BackendSpatialEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<BackendSpatialEntity | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEntities = async () => {
    try {
      setLoading(true);
      // Only fetch independent features (not belonging to any layer)
      const url = `${backendHost}/api/spatial-entities?layerId=none`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load entities");
      const data = await res.json() as BackendSpatialEntity[];
      // Also filter out entities belonging to a scene
      setEntities(data.filter((e) => !e.scene?.id && !e.sceneId));
    } catch (err) {
      console.error("Error fetching features:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEntity = (entity: BackendSpatialEntity) => {
    setSelectedEntity(entity);
    setView("detail");
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đối tượng này?")) {
      try {
        await dispatch(deleteEntity(entityId)).unwrap();
        setEntities((prev) => prev.filter((e) => e.id !== entityId));
        setView("list");
        setSelectedEntity(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Client-side search filtering
  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = (entity.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* Title & Back button if in subviews */}
      {view !== "list" && (
        <button
          onClick={() => {
            setView("list");
            setSelectedEntity(null);
            void fetchEntities();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#1e293b] border-none bg-transparent cursor-pointer py-1 self-start"
        >
          <ArrowLeft size={13} />
          Quay lại danh sách
        </button>
      )}

      {/* VIEW: CREATE */}
      {view === "create" && (
        <FeatureForm
          layerId={undefined}
          onClose={() => {
            setView("list");
            void fetchEntities();
          }}
        />
      )}

      {/* VIEW: EDIT */}
      {view === "edit" && selectedEntity && (
        <FeatureForm
          entity={selectedEntity}
          onClose={() => {
            setView("list");
            setSelectedEntity(null);
            void fetchEntities();
          }}
        />
      )}

      {/* VIEW: DETAIL */}
      {view === "detail" && selectedEntity && (
        <FeatureDetail
          entity={selectedEntity}
          onEdit={() => setView("edit")}
          onDelete={() => handleDeleteEntity(selectedEntity.id)}
          onClose={() => {
            setView("list");
            setSelectedEntity(null);
            void fetchEntities();
          }}
        />
      )}

      {/* VIEW: LIST */}
      {view === "list" && (
        <div className="flex flex-col gap-3">
          {/* Create CTA Button */}
          <button
            onClick={() => setView("create")}
            className="w-full py-2.5 px-4 rounded-lg border border-dashed border-[#c8d5e2] bg-[#f8fafc] text-[#334155] font-semibold text-[12.5px] cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-[#eef2f7] hover:border-[#93c5fd] active:scale-[0.98]"
          >
            <Plus size={15} />
            Thêm Feature mới
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Tìm kiếm feature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-9 pr-4 border border-[#e2e8f0] rounded-lg text-xs focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] placeholder:text-[#94a3b8] bg-white text-[#1e293b]"
            />
          </div>

          {/* List Section */}
          {loading ? (
            <div className="py-12 flex items-center justify-center text-xs text-[#3b82f6] gap-2">
              <Loader2 className="animate-spin" size={16} />
              Đang tải features độc lập...
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
              Không có feature độc lập nào.
              <br />
              <span className="text-[10px] text-[#b0b8c4] mt-1 block">
                Feature thuộc Layer xem ở tab "Lớp dữ liệu", thuộc Scene xem ở tab "Scenes"
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.1)] [&::-webkit-scrollbar-thumb]:rounded">
              {filteredEntities.map((entity) => {
                return (
                  <div
                    key={entity.id}
                    onClick={() => handleSelectEntity(entity)}
                    className="border border-[#e2e8f0] rounded-lg p-2.5 bg-white flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-[#93c5fd] hover:shadow-[0_2px_8px_rgba(33,150,243,0.04)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center text-[#3b82f6] shrink-0">
                        <Box size={14} />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-[12px] font-semibold text-[#1e293b] truncate leading-tight">
                          {entity.name || `Feature_${entity.id.slice(0, 5)}`}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] text-[#64748b] bg-[#e2e8f0] px-1 rounded">
                            Độc lập
                          </span>
                          <span className="text-[8.5px] font-bold text-[#10b981] bg-[#dcfce7] px-1 rounded uppercase tracking-wide">
                            {entity.renderType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(goToEntity(entity));
                      }}
                      className="p-1.5 rounded hover:bg-[#eff6ff] hover:text-[#2563eb] text-[#64748b] cursor-pointer shrink-0 transition-colors"
                      title="Bay tới feature"
                    >
                      <Crosshair size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
