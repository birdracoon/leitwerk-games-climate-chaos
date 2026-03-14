[CmdletBinding()]
param(
    [string]$ServerUser = "root",

    [string]$ServerHost = "87.106.7.198",
    [int]$ServerPort = 22,
    [string]$RemoteAppDir = "/var/www/climate-chaos-frontend",
    [string]$ServiceName = "climate-chaos-frontend",
    [string]$NodeMajor = "20",
    [string]$SshKeyPath = "",
    [string]$SshCertificatePath = "",
    [switch]$UseNvm,
    [switch]$SkipBuild,
    [switch]$SkipRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-CommandExists {
    param([Parameter(Mandatory = $true)][string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Benoetigtes Kommando '$CommandName' wurde nicht gefunden. Installiere OpenSSH Client und tar."
    }
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$ErrorMessage = "Kommando fehlgeschlagen"
    )

    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$ErrorMessage (ExitCode=$LASTEXITCODE)"
    }
}

function Quote-Bash {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)

    return "'" + $Value.Replace("'", '''"''"''') + "'"
}

Assert-CommandExists -CommandName "ssh"
Assert-CommandExists -CommandName "scp"
Assert-CommandExists -CommandName "tar"

$scriptDir = Split-Path -Parent $PSCommandPath
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

$timeStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "frontend-deploy-$timeStamp.tar.gz"
$localArchivePath = Join-Path $env:TEMP $archiveName
$remoteArchivePath = "/tmp/$archiveName"
$remoteScriptName = "frontend-remote-deploy-$timeStamp.sh"
$localRemoteScriptPath = Join-Path $env:TEMP $remoteScriptName
$remoteScriptPath = "/tmp/$remoteScriptName"
$remoteTarget = "$ServerUser@$ServerHost"

$sshArgs = @("-p", $ServerPort.ToString())
$scpArgs = @("-P", $ServerPort.ToString())

if ($SshKeyPath) {
    $resolvedKeyPath = (Resolve-Path $SshKeyPath).Path
    $sshArgs += @("-i", $resolvedKeyPath)
    $scpArgs += @("-i", $resolvedKeyPath)
}

if ($SshCertificatePath) {
    $resolvedCertPath = (Resolve-Path $SshCertificatePath).Path
    $certOption = "CertificateFile=$resolvedCertPath"
    $sshArgs += @("-o", $certOption)
    $scpArgs += @("-o", $certOption)
}

Write-Host "[1/5] Erstelle Deploy-Archiv..."
if (Test-Path $localArchivePath) {
    Remove-Item -Path $localArchivePath -Force
}

Push-Location $projectRoot
try {
    Invoke-External -File "tar" -Arguments @(
        "-czf", $localArchivePath,
        "--exclude=.git",
        "--exclude=node_modules",
        "--exclude=.next",
        "--exclude=.vercel",
        "--exclude=.DS_Store",
        "--exclude=*.log",
        "."
    ) -ErrorMessage "Konnte Deploy-Archiv nicht erstellen"
}
finally {
    Pop-Location
}

Write-Host "[2/5] Lade Archiv auf den Server hoch..."
Invoke-External -File "scp" -Arguments ($scpArgs + @($localArchivePath, "${remoteTarget}:${remoteArchivePath}")) -ErrorMessage "Upload fehlgeschlagen"

$quotedRemoteAppDir = Quote-Bash -Value $RemoteAppDir
$quotedRemoteArchivePath = Quote-Bash -Value $remoteArchivePath
$quotedTimeStamp = Quote-Bash -Value $timeStamp
$quotedNodeMajor = Quote-Bash -Value $NodeMajor
$quotedServiceName = Quote-Bash -Value $ServiceName
$useNvmValue = if ($UseNvm) { "1" } else { "0" }
$skipBuildValue = if ($SkipBuild) { "1" } else { "0" }
$skipRestartValue = if ($SkipRestart) { "1" } else { "0" }

$remoteScript = @"
set -euo pipefail

REMOTE_APP_DIR=$quotedRemoteAppDir
REMOTE_ARCHIVE_PATH=$quotedRemoteArchivePath
RELEASE_STAMP=$quotedTimeStamp
NODE_MAJOR=$quotedNodeMajor
SERVICE_NAME=$quotedServiceName
USE_NVM=$useNvmValue
SKIP_BUILD=$skipBuildValue
SKIP_RESTART=$skipRestartValue

mkdir -p "`$REMOTE_APP_DIR/releases"
RELEASE_DIR="`$REMOTE_APP_DIR/releases/`$RELEASE_STAMP"
mkdir -p "`$RELEASE_DIR"

tar -xzf "`$REMOTE_ARCHIVE_PATH" -C "`$RELEASE_DIR"
rm -f "`$REMOTE_ARCHIVE_PATH"

cd "`$RELEASE_DIR"

if [ "`$USE_NVM" = "1" ]; then
    export NVM_DIR="`${NVM_DIR:-`$HOME/.nvm}"
    if [ -s "`$NVM_DIR/nvm.sh" ]; then
        . "`$NVM_DIR/nvm.sh"
        nvm install "`$NODE_MAJOR"
        nvm use "`$NODE_MAJOR"
    else
        echo "WARNUNG: nvm wurde angefordert, aber nicht gefunden."
    fi
fi

npm ci

if [ "`$SKIP_BUILD" != "1" ]; then
    npm run build
fi

if [ -e "`$REMOTE_APP_DIR/current" ] && [ ! -L "`$REMOTE_APP_DIR/current" ]; then
    echo "FEHLER: `$REMOTE_APP_DIR/current ist ein echtes Verzeichnis, kein Symlink."
    echo "Bitte manuell bereinigen: rm -rf `$REMOTE_APP_DIR/current"
    exit 1
fi
ln -sfn "`$RELEASE_DIR" "`$REMOTE_APP_DIR/current"

if [ "`$SKIP_RESTART" != "1" ] && [ -n "`$SERVICE_NAME" ]; then
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl restart "`$SERVICE_NAME"
    else
        echo "WARNUNG: systemctl nicht verfuegbar, Service wurde nicht neugestartet."
    fi
fi

# Nur die letzten 5 Releases behalten.
if [ -d "`$REMOTE_APP_DIR/releases" ]; then
    ls -1dt "`$REMOTE_APP_DIR/releases"/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
fi
"@

Write-Host "[3/5] Fuehre Build/Deploy auf dem Server aus..."
# Bash auf Linux erwartet LF-Zeilenenden; CRLF fuehrt sonst zu Parsing-Fehlern.
$remoteScriptLf = $remoteScript -replace "`r", ""
[System.IO.File]::WriteAllText(
    $localRemoteScriptPath,
    $remoteScriptLf,
    [System.Text.UTF8Encoding]::new($false)
)

Invoke-External -File "scp" -Arguments ($scpArgs + @($localRemoteScriptPath, "${remoteTarget}:${remoteScriptPath}")) -ErrorMessage "Upload des Remote-Skripts fehlgeschlagen"

$quotedRemoteScriptPath = Quote-Bash -Value $remoteScriptPath
$remoteRunCommand = "bash $quotedRemoteScriptPath; EXIT_CODE=`$?; rm -f $quotedRemoteScriptPath; exit `$EXIT_CODE"
Invoke-External -File "ssh" -Arguments ($sshArgs + @($remoteTarget, $remoteRunCommand)) -ErrorMessage "Remote-Deploy fehlgeschlagen"

Write-Host "[4/5] Lokale Aufraeumarbeiten..."
if (Test-Path $localArchivePath) {
    Remove-Item -Path $localArchivePath -Force
}
if (Test-Path $localRemoteScriptPath) {
    Remove-Item -Path $localRemoteScriptPath -Force
}

Write-Host "[5/5] Deployment abgeschlossen."
Write-Host "Aktive Version: $RemoteAppDir/current"
