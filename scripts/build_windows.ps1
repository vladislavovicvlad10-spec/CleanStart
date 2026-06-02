param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required. Install it before building CleanStart."
    }
}

Require-Command "node"
Require-Command "npm"
Require-Command "cargo"

if (-not $SkipInstall) {
    npm install
}

npm run build
npm run tauri -- build
