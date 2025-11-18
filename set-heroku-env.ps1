# Heroku Environment Variables Setup Script
# This script sets all environment variables from your .env file to Heroku
# 
# Usage: .\set-heroku-env.ps1
# Or: .\set-heroku-env.ps1 -AppName your-app-name

param(
    [string]$AppName = ""
)

Write-Host "`n🚀 Setting Heroku Environment Variables" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# Check if Heroku CLI is installed
try {
    $herokuVersion = heroku --version 2>&1
    Write-Host "✓ Heroku CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Heroku CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    heroku auth:whoami 2>&1 | Out-Null
    Write-Host "✓ Logged into Heroku`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged into Heroku. Please run: heroku login" -ForegroundColor Red
    exit 1
}

# Get app name
if ($AppName -eq "") {
    $AppName = Read-Host "Enter your Heroku app name (or press Enter to skip app name)"
    if ($AppName -eq "") {
        Write-Host "⚠️  No app name provided. Commands will be generic." -ForegroundColor Yellow
        $AppFlag = ""
    } else {
        $AppFlag = "-a $AppName"
    }
} else {
    $AppFlag = "-a $AppName"
    Write-Host "Using app: $AppName`n" -ForegroundColor Cyan
}

# Read .env file
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Reading variables from .env file...`n" -ForegroundColor Yellow

# Parse .env file and set variables
$variables = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    # Skip comments and empty lines
    if ($line -and -not $line.StartsWith("#") -and $line -match '^([A-Z_]+)=(.*)$') {
        $key = $matches[1]
        $value = $matches[2]
        
        # Skip PORT in production (Heroku sets this automatically)
        if ($key -eq "PORT") {
            Write-Host "⚠️  Skipping PORT (Heroku sets this automatically)" -ForegroundColor Yellow
            return
        }
        
        # Set NODE_ENV to production for Heroku
        if ($key -eq "NODE_ENV") {
            $value = "production"
            Write-Host "ℹ️  Setting NODE_ENV to 'production' (required for Heroku)" -ForegroundColor Cyan
        }
        
        $variables[$key] = $value
    }
}

# Set variables in Heroku
Write-Host "`nSetting environment variables in Heroku...`n" -ForegroundColor Yellow

$successCount = 0
$failCount = 0

foreach ($key in $variables.Keys) {
    $value = $variables[$key]
    
    # Escape special characters in value for PowerShell
    $escapedValue = $value -replace '"', '\"' -replace '\$', '`$'
    
    try {
        if ($AppFlag) {
            heroku config:set "${key}=${value}" $AppFlag 2>&1 | Out-Null
        } else {
            heroku config:set "${key}=${value}" 2>&1 | Out-Null
        }
        
        Write-Host "✓ Set $key" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ Failed to set $key" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "✅ Complete!" -ForegroundColor Green
Write-Host "   Successfully set: $successCount variables" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "   Failed: $failCount variables" -ForegroundColor Red
}

Write-Host "`n📋 Verify your config:" -ForegroundColor Cyan
if ($AppFlag) {
    Write-Host "   heroku config $AppFlag" -ForegroundColor White
} else {
    Write-Host "   heroku config" -ForegroundColor White
}

Write-Host "`n"

