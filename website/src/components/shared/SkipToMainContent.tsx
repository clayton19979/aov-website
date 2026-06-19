type SkipToMainContentProps = {
  children: React.ReactNode
}

export function SkipToMainContent({ children }: SkipToMainContentProps) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:border focus:border-void-teal/60 focus:bg-void-black focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:tracking-widest focus:text-void-teal focus:uppercase focus:shadow-[0_0_18px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
      >
        Skip to main content
      </a>
      <div id="main-content" tabIndex={-1}>{children}</div>
    </>
  )
}
