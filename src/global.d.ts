declare module 'global/window' {
  const window: Window & typeof globalThis & {shaka?: import('./types').ShakaNamespace}

  export default window
}

declare module 'global/document' {
  const document: Document

  export default document
}
