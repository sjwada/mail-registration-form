# テスト環境デプロイ用スクリプト

Write-Host "Deploying to Test Environment..." -ForegroundColor Cyan

# 1. Push changes
Write-Host "1. Pushing changes to GAS..." -ForegroundColor Yellow
clasp push --force
if ($LASTEXITCODE -ne 0) {
    Write-Error "clasp push failed. Please run 'clasp login' and try again."
    exit 1
}

# 2. Create new version
Write-Host "2. Creating new version..." -ForegroundColor Yellow
$versionOutput = clasp version "Test Deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
if ($LASTEXITCODE -ne 0) {
    Write-Error "clasp version failed."
    exit 1
}
Write-Host $versionOutput

# Extract version number
# Output format: "Created version 12"
$version = $versionOutput -replace "[^0-9]", ""
if (-not $version) {
    Write-Error "Could not determine version number."
    exit 1
}
Write-Host "   Created version: $version" -ForegroundColor Green

# 3. Deploy to Test Environment
$deploymentId = "AKfycbxjBpp-0S2UfZv7eYJoh7e5AmLv0GIlQvYy6xiTB4TR-YweAlkbgFx8yhmGdCvOUp-m"
Write-Host "3. Updating deployment ($deploymentId)..." -ForegroundColor Yellow
clasp deploy -V $version -i $deploymentId
if ($LASTEXITCODE -ne 0) {
    Write-Error "clasp deploy failed."
    exit 1
}

Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "Success! Test URL:" -ForegroundColor Green
Write-Host "https://script.google.com/a/macros/mebio-labo.com/s/$deploymentId/exec?token=mebio-parent-reg-2025-k7m3x9p4" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Green
