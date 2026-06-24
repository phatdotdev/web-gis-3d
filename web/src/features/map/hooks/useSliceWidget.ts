import type Slice from '@arcgis/core/widgets/Slice'
import type SceneView from '@arcgis/core/views/SceneView'
import { useEffect } from 'react'

type UseSliceWidgetOptions = {
  enabled: boolean
  view: SceneView | null
}

export function useSliceWidget({ enabled, view }: UseSliceWidgetOptions): void {
  useEffect(() => {
    if (!enabled || !view) {
      return undefined
    }

    let slice: Slice | null = null
    let cancelled = false

    async function mountSlice() {
      const { default: SliceWidget } = await import('@arcgis/core/widgets/Slice')
      if (cancelled || !view) {
        return
      }

      slice = new SliceWidget({ view })
      view.ui.add(slice, 'bottom-right')
    }

    void mountSlice()

    return () => {
      cancelled = true
      if (slice) {
        view.ui.remove(slice)
        slice.destroy()
      }
    }
  }, [enabled, view])
}

