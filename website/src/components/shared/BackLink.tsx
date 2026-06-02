import Link from 'next/link'

type Props = {
  href: string
  label: string
}

export function BackLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-void-teal/60 hover:text-void-teal transition-colors duration-200"
    >
      ← {label}
    </Link>
  )
}
