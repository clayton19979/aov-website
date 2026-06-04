$ErrorActionPreference = "Stop"

$repoRoot = "C:\Users\clayt\Documents\AoV"
$promptPath = Join-Path $repoRoot "tools\automation\evefrontier-ideas-job-prompt.md"
$nodeCli = "C:\Program Files\nodejs\node.exe"
$codexJs = "C:\Users\clayt\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js"
$outputPath = Join-Path $env:TEMP "evefrontier-ideas-last.txt"

if (-not (Test-Path -LiteralPath $promptPath)) {
    throw "Prompt file not found: $promptPath"
}

if (-not (Test-Path -LiteralPath $nodeCli)) {
    throw "Node CLI not found: $nodeCli"
}

if (-not (Test-Path -LiteralPath $codexJs)) {
    throw "Codex JS entrypoint not found: $codexJs"
}

$prompt = Get-Content -LiteralPath $promptPath -Raw
$arguments = @(
    $codexJs,
    "--search",
    "-C", $repoRoot,
    "-s", "danger-full-access",
    "-a", "never",
    "exec",
    "--color", "never",
    "--output-last-message", $outputPath,
    "-"
)

$prompt | & $nodeCli @arguments
exit $LASTEXITCODE
