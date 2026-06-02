import { notFound } from 'next/navigation'
import { tools } from '@/data/tools'
import { toolComponents } from '@/components/tools/toolComponents'
import { ToolShell } from '@/components/tools/ToolShell'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return tools
    .filter(t => t.status === 'live')
    .map(t => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const tool = tools.find(t => t.slug === slug)
  return { title: tool ? `${tool.name} — AoV` : 'Tool — AoV' }
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params
  const tool = tools.find(t => t.slug === slug && t.status === 'live')

  if (!tool) notFound()

  const ToolComponent = toolComponents[slug]

  return (
    <ToolShell tool={tool}>
      {ToolComponent ? <ToolComponent /> : (
        <div className="font-mono text-xs text-white/20 tracking-widest uppercase">
          Interface not yet registered.
        </div>
      )}
    </ToolShell>
  )
}
