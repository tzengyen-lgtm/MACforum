$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

git config --global --add safe.directory $repo

if (-not (Test-Path -LiteralPath ".git")) {
  git init -b main
}

$remote = git remote
if ($remote -notcontains "origin") {
  git remote add origin "https://github.com/tzengyen-lgtm/MACforum.git"
}

git add index.html agenda.html tasks.html styles.css site.js README.md .nojekyll publish-to-github.ps1

$changes = git status --porcelain
if ($changes) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  git commit -m "Update website $stamp"
} else {
  Write-Host "No website changes to commit."
}

git branch -M main
git push -u origin main
