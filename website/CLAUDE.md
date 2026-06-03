@AGENTS.md

## Session Context
*Last updated: 2026-06-02*

### Active Work
- AoV website on `aov-v1.1` branch — active development branch, separate from `master`
- Hourly autonomous improvement agent now live — reviews codebase and ships one high-impact change per hour

### Key Decisions
- Autonomous agent targets `aov-v1.1` branch only — never touches `master`
- Agent model: `claude-sonnet-4-6`
- Agent uses Default Anthropic Cloud environment (`env_01LFmkNKfhiUncGmFwuxZrGM`)

### Setup State
- Claude GitHub App: authorized on GitHub account (owned by anthropics) — "Never used" status, access to `aov-website` repo should be active
- Hourly routine created: `trig_018gppYMShCMnSHftkjitTtd`
- Manage at: `https://claude.ai/code/routines/trig_018gppYMShCMnSHftkjitTtd`
- First run: 2026-06-03T04:05 UTC (11:05 PM CT)

### Next Steps
- After first run (~11:05 PM CT), check routine output at the link above to confirm GitHub push succeeded
- If push fails, GitHub App may need explicit repo access granted — check `https://github.com/settings/installations` and configure repo access for Claude
- Monitor `aov-v1.1` branch for commits from the agent
