$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$healthUrl = "http://127.0.0.1:8000/health"
$auditUrl = "http://127.0.0.1:8000/api/audit"
$desktop = [Environment]::GetFolderPath("Desktop")
$outputPath = Join-Path $desktop "Agent Shield Audit Log.txt"

function Test-Endpoint([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

if (-not (Test-Endpoint $healthUrl)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($listener) {
        throw "Port 8000 is occupied, but the Agent Shield API health endpoint did not respond."
    }

    $python = Get-Command "python" -ErrorAction Stop
    Start-Process -FilePath $python.Source `
        -ArgumentList @("-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $root `
        -WindowStyle Hidden

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Test-Endpoint $healthUrl) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw "The Agent Shield API did not start. Check that Python and backend dependencies are installed."
    }
}

$events = [System.Collections.Generic.List[object]]::new()
$limit = 500
$offset = 0
do {
    $response = Invoke-WebRequest -Uri "$($auditUrl)?limit=$limit&offset=$offset" -TimeoutSec 10 -UseBasicParsing
    $page = ConvertFrom-Json -InputObject $response.Content
    $pageCount = 0
    foreach ($event in $page) {
        $events.Add($event)
        $pageCount++
    }
    $offset += $pageCount
} while ($pageCount -eq $limit)

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("AGENT SHIELD - AUDIT LOG")
$lines.Add("Exported: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$lines.Add("Records: $($events.Count)")
$lines.Add("")

foreach ($event in $events) {
    $lines.Add("[$($event.timestamp)] $($event.decision) - $($event.event_type)")
    $lines.Add("Request ID: $($event.request_id)")
    $lines.Add("Action: $($event.action)")
    $lines.Add("Risk: $($event.risk_level)")
    $reason = [string]$event.reason
    if ($event.detail -match "\[reason=(.*?)\](?:\s+\[request_id=|$)") {
        $reason = $matches[1]
    }
    $lines.Add("Reason: $reason")
    $lines.Add("")
}

[System.IO.File]::WriteAllLines($outputPath, $lines, [System.Text.UTF8Encoding]::new($false))
Start-Process -FilePath "notepad.exe" -ArgumentList @($outputPath)
Write-Output "Saved $($events.Count) audit records to $outputPath and opened it in Notepad."
