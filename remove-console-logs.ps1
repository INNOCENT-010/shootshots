# remove-console-logs.ps1 - PRODUCTION READY (NO EMOJIS)
param(
    [string]$Path = ".",
    [switch]$WhatIf
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     REMOVING CONSOLE LOGS FOR PROD    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$count = 0
$filesChanged = 0

# Patterns to match different console statements
$patterns = @(
    '^\s*console\.(log|error|warn|info|debug|trace)\([^;]*\);?\s*$',
    '^\s*//\s*console\.(log|error|warn|info|debug|trace)\([^;]*\);?\s*$',
    '^\s*console\.(log|error|warn|info|debug|trace)\([^)]*\)(\s*;)?\s*$',
    '^\s*console\.(log|error|warn|info|debug|trace)\([^)]*\)\s*$',
    '^\s*console\.(log|error|warn|info|debug|trace)\([\s\S]*?\);?\s*$'
)

# Get all TypeScript/JavaScript files
$files = Get-ChildItem -Path $Path -Include *.ts, *.tsx, *.js, *.jsx -Recurse | 
    Where-Object { 
        $_.FullName -notmatch 'node_modules' -and 
        $_.FullName -notmatch '\.next' -and
        $_.FullName -notmatch 'dist' -and
        $_.FullName -notmatch 'coverage'
    }

Write-Host "`nScanning $($files.Count) files..." -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    $lineCount = @($content -split "`n").Count
    
    # Remove full console.log lines
    foreach ($pattern in $patterns) {
        $content = $content -replace $pattern, ''
    }
    
    # Remove inline console.log that may be on same line as code
    $content = $content -replace 'console\.(log|error|warn|info|debug|trace)\([^)]*\);?\s*', ''
    
    # Remove commented console.log lines
    $content = $content -replace '^\s*//.*console\.(log|error|warn|info|debug|trace).*$', ''
    
    # Clean up multiple blank lines
    $content = $content -replace "`n{3,}", "`n`n"
    
    # Calculate removed lines
    $newLineCount = @($content -split "`n").Count
    $removedLines = $lineCount - $newLineCount
    
    if ($content -ne $originalContent) {
        $filesChanged++
        $count += $removedLines
        
        if ($WhatIf) {
            Write-Host "  [DRY RUN] Would remove $removedLines console logs from $($file.Name)" -ForegroundColor Magenta
        } else {
            Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
            Write-Host "  + Removed $removedLines console logs from $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "DRY RUN COMPLETE - Would remove $count console logs from $filesChanged files" -ForegroundColor Magenta
} else {
    Write-Host "SUCCESS! Removed $count console logs from $filesChanged files" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan

# Show remaining console logs (for verification)
Write-Host "`nChecking for any remaining console logs..." -ForegroundColor Yellow
$remaining = Select-String -Path ($files.FullName) -Pattern "console\.(log|error|warn|info|debug|trace)\(" -List | 
    Select-Object Path, LineNumber, Line

if ($remaining) {
    Write-Host "WARNING: Found remaining console logs in:" -ForegroundColor Red
    $remaining | ForEach-Object {
        Write-Host "  $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
    }
} else {
    Write-Host "No remaining console logs found!" -ForegroundColor Green
}