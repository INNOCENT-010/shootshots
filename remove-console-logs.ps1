# remove-console-logs.ps1
param(
    [string]$Path = "."
)

Write-Host "Removing console logs from $Path..." -ForegroundColor Yellow

$count = 0

# Get all TypeScript/JavaScript files
$files = Get-ChildItem -Path $Path -Include *.ts, *.tsx, *.js, *.jsx -Recurse | 
    Where-Object { 
        $_.FullName -notmatch 'node_modules' -and 
        $_.FullName -notmatch '\.next' -and
        $_.FullName -notmatch 'dist'
    }

foreach ($file in $files) {
    $originalContent = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    
    $newLines = @()
    $removedCount = 0
    
    foreach ($line in $lines) {
        # Check if line contains console.log (with or without semicolon)
        if ($line -match '^\s*console\.(log|error|warn|info|debug|trace)\(.*\)(\s*;)?\s*$') {
            $removedCount++
            continue
        }
        # Check if console.log is part of a line (not at beginning)
        if ($line -match 'console\.(log|error|warn|info|debug|trace)\(.*\)') {
            # Remove the console.log but keep the rest of the line
            $line = $line -replace 'console\.(log|error|warn|info|debug|trace)\([^)]*\)(\s*;)?\s*', ''
            $removedCount++
        }
        $newLines += $line
    }
    
    if ($removedCount -gt 0) {
        Set-Content -Path $file.FullName -Value ($newLines -join "`n") -NoNewline
        $count += $removedCount
        Write-Host "  Removed $removedCount console logs from $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nTotal console logs removed: $count" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green