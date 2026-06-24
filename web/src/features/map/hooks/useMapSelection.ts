import { useCallback, useState } from 'react'
import type { InspectorFeature } from '../../../types/map'

export function useMapSelection() {
  const [selectedFeature, setSelectedFeature] = useState<InspectorFeature | null>(null)

  const clearSelection = useCallback(() => {
    setSelectedFeature(null)
  }, [])

  return {
    selectedFeature,
    setSelectedFeature,
    clearSelection,
  }
}
