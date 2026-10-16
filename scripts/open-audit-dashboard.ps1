param(
    [ValidateSet("audit", "dashboard")]
    [string]$Page = "audit"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontend = Join-Path $root "frontend"
$dashboardUrl = if ($Page -eq "audit") {
    "http://127.0.0.1:5173/?page=audit"
} else {
    "http://127.0.0.1:5173/"
}
$healthUrl = "http://127.0.0.1:8000/health"

function Test-Endpoint([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-LocalPort([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        return $pending.AsyncWaitHandle.WaitOne(250) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

if (-not (Test-Endpoint $healthUrl)) {
    if (Test-LocalPort 8000) {
        throw "Port 8000 is occupied, but the Agent Shield API health endpoint did not respond."
    }
    Start-Process -FilePath "python" `
        -ArgumentList @("-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $root `
        -WindowStyle Hidden
}

if (-not (Test-Endpoint "http://127.0.0.1:5173/")) {
    if (Test-LocalPort 5173) {
        throw "Port 5173 is occupied, but the Agent Shield dashboard did not respond."
    }
    $npm = (Get-Command "npm.cmd" -ErrorAction Stop).Source
    Start-Process -FilePath $npm `
        -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
        -WorkingDirectory $frontend `
        -WindowStyle Hidden
}

$ready = $false
for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ((Test-Endpoint $healthUrl) -and (Test-Endpoint "http://127.0.0.1:5173/")) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    throw "Agent Shield did not become ready. Check that Python and Node.js are installed."
}

Start-Process $dashboardUrl
