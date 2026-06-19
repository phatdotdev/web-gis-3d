import React, { useState, useEffect } from "react";
import { Crosshair, Edit2, Trash2, Info, Loader2 } from "lucide-react";

import { useAppDispatch } from "../../store/hooks";
import { deleteEntity, goToEntity } from "../../store/mapSlice";
import { getEntityCenter, fmtCoord } from "../../utils/geometry";
import type { BackendSpatialEntity } from "../../types/backend";
import type { BackendLayer } from "../../types/backend";
import { backendHost } from "../../utils/backendApi";
import { EntityEditForm } from "./EntityEditForm";

type Props = {
  layer: BackendLayer;
};

export const EntityListModal: React.FC<Props> = ({ layer }) => {
  const dispatch = useAppDispatch();
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [expandedMetadata, setExpandedMetadata] = useState<string[]>([]);
  const [entities, setEntities] = useState<BackendSpatialEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchEntities = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${backendHost}/api/spatial-entities?layerId=${layer.id}`);
        if (!res.ok) throw new Error("Failed to load entities");
        const data = await res.json();
        if (isMounted) setEntities(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchEntities();
    return () => { isMounted = false; };
  }, [layer.id]);

  const toggleMetadata = (id: string) => {
    setExpandedMetadata((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };

  const handleDelete = async (entityId: string) => {
    await dispatch(deleteEntity(entityId)).unwrap();
    setEntities((prev) => prev.filter((e) => e.id !== entityId));
  };

  const handleGoTo = (entity: BackendSpatialEntity) => {
    dispatch(goToEntity(entity));
  };

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center text-sm text-[#3b82f6] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
        <Loader2 className="animate-spin mr-2" size={18} /> Đang tải danh sách đối tượng...
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
        Không có đối tượng nào.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-0.5 pb-1.5 border-b border-[#e2e8f0] mb-1">
        <span className="text-xs font-bold text-[#475569] uppercase tracking-wide">
          Danh sách thực thể
        </span>
        <span className="text-[10.5px] font-bold text-[#3b82f6] bg-[#dbeafe] px-1.5 py-0.5 rounded-lg">
          {entities.length}
        </span>
      </div>

      {entities.map((entity) => {
        const isEditing = editingEntityId === entity.id;
        const isMetaExpanded = expandedMetadata.includes(entity.id);
        const center = getEntityCenter(entity.geometry);
        const geoType = (entity.geometry as { type?: string })?.type;
        const metadata = entity.metadata;
        const hasMetadata = metadata && Object.keys(metadata).length > 0;

        const iconUrl = layer.iconUrl ?? entity.iconUrl ?? undefined;
        const resolvedIconUrl = iconUrl
          ? iconUrl.startsWith("http")
            ? iconUrl
            : `${backendHost}${iconUrl.startsWith("/") ? "" : "/"}${iconUrl}`
          : undefined;

        return (
          <div
            key={entity.id}
            className={`border rounded-lg p-3 flex flex-col bg-white transition-all duration-150 hover:bg-[#f8fafc] hover:border-[#cbd5e1] ${isEditing ? "border-[#93c5fd] shadow-[0_0_0_2px_rgba(59,130,246,0.08)]" : "border-[#e2e8f0]"}`}
          >
            <div className="flex justify-between items-center w-full gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {resolvedIconUrl && (
                  <div className="w-8 h-8 rounded bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={resolvedIconUrl}
                      alt={entity.name || entity.id}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-[#1e293b] truncate">
                    {entity.name || entity.id}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#15803d] uppercase tracking-wide">
                      {entity.renderType}
                    </span>
                    {geoType && (
                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] uppercase tracking-wide">
                        {geoType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 items-center">
                {center && (
                  <button
                    className="inline-flex items-center gap-1 bg-[#2563eb] text-white border-none text-[11px] font-semibold py-1.5 px-2.5 rounded-md cursor-pointer transition-all duration-150 hover:bg-[#1d4ed8] hover:shadow-[0_2px_8px_rgba(37,99,235,0.3)] active:scale-[0.96]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGoTo(entity);
                    }}
                    title={`Đi đến ${fmtCoord(center.lat)}, ${fmtCoord(center.lng)}`}
                  >
                    <Crosshair size={13} />
                    <span>Đi đến</span>
                  </button>
                )}
                {hasMetadata && (
                  <button
                    className="flex items-center justify-center w-[30px] h-[30px] border border-[#e2e8f0] rounded-[7px] bg-white cursor-pointer text-[#64748b] transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#334155] hover:border-[#cbd5e1]"
                    onClick={() => toggleMetadata(entity.id)}
                    title="Xem chi tiết (Metadata)"
                  >
                    <Info size={14} />
                  </button>
                )}
                <button
                  className="flex items-center justify-center w-[30px] h-[30px] border border-[#e2e8f0] rounded-[7px] bg-white cursor-pointer text-[#64748b] transition-all duration-150 hover:bg-[#eff6ff] hover:text-[#2563eb] hover:border-[#93c5fd]"
                  onClick={() => setEditingEntityId(entity.id)}
                  title="Chỉnh sửa hiển thị"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="flex items-center justify-center w-[30px] h-[30px] border border-[#e2e8f0] rounded-[7px] bg-white cursor-pointer text-[#64748b] transition-all duration-150 hover:bg-[#fef2f2] hover:text-[#dc2626] hover:border-[#fca5a5]"
                  onClick={() => handleDelete(entity.id)}
                  title="Xóa"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 w-full">
              {center && (
                <div className="inline-flex items-center gap-1 text-[11px] py-1 px-2 bg-[#eff6ff] rounded border border-[#bfdbfe] text-[#1d4ed8]">
                  <Crosshair size={11} />
                  <span className="text-[#3b82f6] font-medium">Tọa độ:</span>
                  <span className="font-semibold font-mono text-[10.5px]">
                    {fmtCoord(center.lat)}, {fmtCoord(center.lng)}
                  </span>
                </div>
              )}
              {entity.elevation != null && entity.elevation !== 0 && (
                <div className="inline-flex items-center gap-1 text-[11px] py-1 px-2 bg-[#f1f5f9] rounded border border-[#e2e8f0]">
                  <span className="text-[#94a3b8] font-medium">Cao độ:</span>
                  <span className="text-[#334155] font-semibold font-mono text-[10.5px]">
                    {entity.elevation}m
                  </span>
                </div>
              )}
              {entity.color && (
                <div className="inline-flex items-center gap-1 text-[11px] py-1 px-2 bg-[#f1f5f9] rounded border border-[#e2e8f0]">
                  <span className="text-[#94a3b8] font-medium">Màu:</span>
                  <span className="text-[#334155] font-semibold font-mono text-[10.5px] inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm border border-black/12 shrink-0"
                      style={{ backgroundColor: entity.color }}
                    />
                    {entity.color}
                  </span>
                </div>
              )}
            </div>

            {isMetaExpanded && hasMetadata && (
              <div className="mt-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg overflow-hidden animate-[fade-slide_0.2s_ease]">
                <div className="py-2 px-3 text-[11.5px] font-bold text-[#475569] bg-[#f1f5f9] border-b border-[#e2e8f0] flex items-center gap-1.5">
                  <Info size={14} /> Metadata
                </div>
                <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                  <table className="w-full border-collapse text-[11px] text-left">
                    <tbody>
                      {Object.entries(metadata).map(([key, val]) => (
                        <tr
                          key={key}
                          className="border-b border-[#f1f5f9] last:border-b-0 even:bg-white"
                        >
                          <td className="py-1.5 px-2.5 font-semibold text-[#64748b] whitespace-nowrap align-top w-[30%]">
                            {key}
                          </td>
                          <td className="py-1.5 px-2.5 text-[#1e293b] font-mono break-all">
                            {typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isEditing && (
              <EntityEditForm
                entity={entity}
                onCancel={() => setEditingEntityId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
