param(
    [switch]$OneFile
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

$Python = Join-Path $ProjectRoot "venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

& $Python -m pip install -r requirements.txt

$PyInstallerArgs = @(
    "-m", "PyInstaller",
    "--name", "CleanStart",
    "--windowed",
    "--clean",
    "--noconfirm",
    "--add-data", "README.md;.",
    "--add-data", "assets;assets",
    "main.py"
)

$IconPath = Join-Path $ProjectRoot "assets\app.ico"
if (Test-Path $IconPath) {
    $PyInstallerArgs = @(
        "-m", "PyInstaller",
        "--name", "CleanStart",
        "--windowed",
        "--clean",
        "--noconfirm",
        "--icon", $IconPath,
        "--add-data", "README.md;.",
        "--add-data", "assets;assets",
        "main.py"
    )
}

if ($OneFile) {
    $PyInstallerArgs = $PyInstallerArgs[0..5] + @("--onefile") + $PyInstallerArgs[6..($PyInstallerArgs.Count - 1)]
}

& $Python @PyInstallerArgs

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "Output folder: $ProjectRoot\dist\CleanStart"
if ($OneFile) {
    Write-Host "One-file executable: $ProjectRoot\dist\CleanStart.exe"
}
