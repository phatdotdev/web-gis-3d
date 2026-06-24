export function readJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Khong doc duoc file JSON.'))
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as T)
      } catch {
        reject(new Error('File khong phai JSON hop le.'))
      }
    }

    reader.readAsText(file)
  })
}
