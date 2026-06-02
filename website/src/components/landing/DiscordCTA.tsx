const DISCORD_URL = 'https://discord.gg/uZtwGbngr7'

export function DiscordCTA() {
  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group inline-flex items-center gap-3
        border border-void-teal/50 hover:border-void-teal
        px-8 py-3
        font-mono text-xs tracking-widest uppercase
        text-void-teal hover:text-void-black
        bg-transparent hover:bg-void-teal
        transition-all duration-300
      "
    >
      <span>Request Entry</span>
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">↗ Discord</span>
    </a>
  )
}
