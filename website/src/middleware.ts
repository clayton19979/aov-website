// Next.js middleware entry point.
//
// The actual logic lives in proxy.ts, which is kept as a separate module
// so its exports (proxy, isPublicStaticToolAssetPath) can be unit-tested
// without the constraints of the Next.js middleware runtime.
//
// All Next.js requires is that THIS file exports a function named `middleware`
// and (optionally) a `config` object with a `matcher` — both are re-exported
// from proxy.ts here.
export { proxy as middleware, config } from './proxy'
