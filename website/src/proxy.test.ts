import { describe, expect, it } from 'vitest'
import { isPublicStaticToolAssetPath } from './proxy'

describe('proxy static tool coverage', () => {
  it('treats all iframe-backed static tool assets as public paths with CSP coverage', () => {
    expect(isPublicStaticToolAssetPath('/tools/fuel-calculator/index.html')).toBe(true)
    expect(isPublicStaticToolAssetPath('/tools/map/index.html')).toBe(true)
    expect(isPublicStaticToolAssetPath('/tools/baseops/index.html')).toBe(true)
  })

  it('does not classify app tool pages as static tool assets', () => {
    expect(isPublicStaticToolAssetPath('/tools/fuel-calculator')).toBe(false)
    expect(isPublicStaticToolAssetPath('/tools')).toBe(false)
  })
})
