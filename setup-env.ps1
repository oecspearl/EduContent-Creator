# PowerShell script to set up environment variables for Windows
# Run this script before starting the app: . .\setup-env.ps1

Write-Host "Setting up environment variables..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    # Generate a secure SESSION_SECRET
    $sessionSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    
    @"
SESSION_SECRET=$sessionSecret
NODE_ENV=development
PORT=5000
"@ | Out-File -FilePath .env -Encoding utf8
    
    Write-Host ".env file created with generated SESSION_SECRET" -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

# Load .env file and set environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "Set $key" -ForegroundColor Gray
        }
    }
    Write-Host "Environment variables loaded from .env" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found!" -ForegroundColor Red
}

Write-Host "`nYou can now run: npm run dev" -ForegroundColor Cyan



