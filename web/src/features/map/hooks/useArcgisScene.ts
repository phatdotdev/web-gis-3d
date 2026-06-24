import { useCallback, useRef } from 'react'
import type { MapRenderContext } from '../../../types/map'

export type ArcgisMapContexts = {
  layer: MapRenderContext
  entity: MapRenderContext
}

export function useArcgisScene() {
  const contextsRef = useRef<ArcgisMapContexts | null>(null)

  const setContexts = useCallback((contexts: ArcgisMapContexts) => {
    contextsRef.current = contexts
  }, [])

  return {
    contextsRef,
    setContexts,
  }
}
