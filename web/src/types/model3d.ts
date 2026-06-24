export type Vector3 = {
  x: number
  y: number
  z: number
}

export type Model3DConfig = {
  enabled: boolean
  modelUrl?: string
  scale?: Vector3
  rotation?: Vector3
  altitudeOffset?: number
}

export type ResolvedModel3DConfig = Required<Pick<Model3DConfig, 'enabled'>> &
  Omit<Model3DConfig, 'enabled'>
