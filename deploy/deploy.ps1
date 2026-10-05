# Publica o Mangaflix Prime na VPS (Docker Swarm + Traefik):
#   frontend -> https://front-teste.iagtp.com.br
#   backend  -> https://back-api-teste.iagtp.com.br
#
# Depois do deploy:
#   1. Gera um APK novo na pasta apk\
#   2. Salva e sincroniza as mudanças no GitHub em https://github.com/GTPSmartAI/teste
#
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1                          # deploy + APK + GitHub
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -Message "o que mudou"   # mensagem do commit
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -NoApk                   # sem gerar o APK
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -NoGit                   # sem GitHub
#
param(
    [switch]$NoGit, 
    [switch]$NoApk, 
    [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vps = 'root@2.25.124.5'
$remote = '/root/MANGAFLIX-APP'
$apiUrl = 'https://back-api-teste.iagtp.com.br'
$githubRepo = 'https://github.com/GTPSmartAI/teste'
$tag = Get-Date -Format 'yyyyMMdd-HHmmss'
$work = Join-Path $env:TEMP "mangaflix-deploy-$tag"
New-Item -ItemType Directory -Force $work | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false

function Invoke-Native([scriptblock]$cmd, [string]$what) {
    & $cmd
    if ($LASTEXITCODE -ne 0) { throw "$what falhou (codigo $LASTEXITCODE)" }
}

try {
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "INICIANDO PIPELINE DE DEPLOY: MANGAFLIX PRIME" -ForegroundColor Green
    Write-Host "Dominios: front-teste.iagtp.com.br | back-api-teste.iagtp.com.br" -ForegroundColor DarkCyan
    Write-Host "==========================================================" -ForegroundColor Green

    # 1. Build Frontend Web
    Write-Host "`n[1/4] Build do frontend web (API: $apiUrl)..." -ForegroundColor Cyan
    Push-Location "$root\frontend"
    try {
        $env:VITE_API_URL = $apiUrl
        Invoke-Native { cmd.exe /c "npm run build" } 'npm run build'
    } finally {
        Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
        Pop-Location
    }

    # 2. Empacotando arquivos para envio
    Write-Host "`n[2/4] Empacotando artefatos..." -ForegroundColor Cyan
    Invoke-Native { tar -czf "$work\frontend-dist.tgz" -C "$root\frontend\dist" . } 'tar frontend'
    Invoke-Native {
        tar -czf "$work\backend.tgz" --exclude .env --exclude uploads --exclude __pycache__ `
            --exclude '*.log' --exclude venv --exclude scratch --exclude .git -C "$root\backend" .
    } 'tar backend'
    Copy-Item "$PSScriptRoot\nginx-frontend.conf", "$PSScriptRoot\remote_deploy.sh" $work

    # Ambiente do backend em produção: o .env local (senhas do banco e do MinIO) com os ajustes do container.
    # Senhas ficam só no backend\.env, nunca neste script (ele vai para o GitHub).
    if (-not (Test-Path "$root\backend\.env")) { throw "Falta o backend\.env (senhas do banco e do MinIO)." }
    $overrides = [ordered]@{
        HOST    = '0.0.0.0'
        PORT    = '5000'
        DEBUG   = 'false'
        DB_HOST = '172.17.0.1'   # MariaDB roda direto na VPS; o container chega nele pelo docker0
        TZ      = 'America/Sao_Paulo'
    }

    $envLines = New-Object System.Collections.Generic.List[string]
    foreach ($line in Get-Content "$root\backend\.env") {
        if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { continue }
        $key = $Matches[1]; $value = $Matches[2].Trim()
        if ($overrides.Contains($key)) { continue }
        # docker --env-file não tira aspas como o python-dotenv
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") { $value = $Matches[1] }
        $envLines.Add("$key=$value")
    }
    foreach ($k in $overrides.Keys) { $envLines.Add("$k=$($overrides[$k])") }
    [IO.File]::WriteAllText("$work\backend.env", ($envLines -join "`n") + "`n", $utf8)

    # 3. Enviar para a VPS
    Write-Host "`n[3/4] Enviando artefatos para a VPS ($vps)..." -ForegroundColor Cyan
    Invoke-Native { ssh -n -o BatchMode=yes $vps "mkdir -p $remote/incoming && chmod 700 $remote" } 'ssh mkdir'
    $files = Get-ChildItem $work -File | Where-Object Name -ne 'backend.env' | ForEach-Object FullName
    foreach ($f in $files) {
        Invoke-Native { scp -q -o BatchMode=yes "$f" "${vps}:$remote/incoming/" } "scp $(Split-Path $f -Leaf)"
    }
    Invoke-Native { scp -q -o BatchMode=yes "$work\backend.env" "${vps}:$remote/backend.env" } 'scp env'
    Invoke-Native { ssh -n -o BatchMode=yes $vps "chmod 600 $remote/backend.env" } 'ssh chmod'

    # 4. Executar deploy remoto na VPS
    Write-Host "`n[4/4] Executando atualizacao de servicos no Docker Swarm..." -ForegroundColor Cyan
    Invoke-Native {
        ssh -n -o BatchMode=yes $vps "sed -i 's/\r$//' $remote/incoming/remote_deploy.sh && bash $remote/incoming/remote_deploy.sh $tag"
    } 'deploy remoto'

    Write-Host "`nDeploy na VPS Concluido com Sucesso!" -ForegroundColor Green
    Write-Host "  Frontend: https://front-teste.iagtp.com.br" -ForegroundColor Green
    Write-Host "  Backend:  https://back-api-teste.iagtp.com.br" -ForegroundColor Green

} finally {
    Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------ APK
if (-not $NoApk) {
    Write-Host "`n== Gerando APK Android ==" -ForegroundColor Cyan
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\build-apk.ps1"
    if ($LASTEXITCODE -ne 0) {
        # O site já foi publicado; o GitHub segue normalmente
        Write-Host "O deploy na VPS foi feito, mas o APK falhou (codigo $LASTEXITCODE). Gere de novo com deploy\build-apk.ps1." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------ GitHub
if ($NoGit) { return }
Write-Host "`n== Sincronizando com GitHub ==" -ForegroundColor Cyan
Push-Location $root
try {
    if (-not (Test-Path "$root\.git")) {
        Write-Host "Inicializando repositorio Git local..." -ForegroundColor DarkCyan
        Invoke-Native { git init -b main } 'git init'
    }

    $remotes = git remote
    if ($remotes -notcontains 'origin') {
        Invoke-Native { git remote add origin $githubRepo } 'git remote add origin'
    } else {
        Invoke-Native { git remote set-url origin $githubRepo } 'git remote set-url'
    }

    Invoke-Native { git add -A } 'git add'

    # Trava: arquivos de senha/chave nunca vão para o GitHub (o .gitignore já cobre; isto é a segunda barreira)
    $staged = @(git diff --cached --name-only)
    $blocked = $staged | Where-Object { $_ -match '(^|/)\.env$|\.env\.local$|\.keystore$|\.jks$|keystore\.properties$|(^|/)id_(rsa|ed25519)|gdrive_credentials\.json' }
    # Linhas novas com cara de segredo: KEY=valor de .env, ou senha entre aspas no código (com letras e números)
    $envPat = '^\+[A-Z_]*(PASSWORD|SECRET|TOKEN|API_KEY)[A-Z_]*=\S{6,}'
    $litPat = '(?i)(password|secret|token|api_?key)\w*["'']?\s*[:=]\s*["''](?=[^"'']*\d)(?=[^"'']*[a-z])[^"''\s]{8,}["'']|BEGIN [A-Z ]*PRIVATE KEY'
    $secretLines = @(git diff --cached -U0) | Where-Object { $_ -cmatch $envPat -or ($_.StartsWith('+') -and $_ -match $litPat) }

    if ($blocked -or $secretLines) {
        git reset -q
        Write-Host "GitHub NAO atualizado: parece haver senha ou chave nas mudancas." -ForegroundColor Red
        $blocked | ForEach-Object { Write-Host "  arquivo: $_" -ForegroundColor Red }
        if ($secretLines) { Write-Host "  $(@($secretLines).Count) linha(s) com cara de senha (ex.: PASSWORD=...)" -ForegroundColor Red }
        Write-Host "  O deploy na VPS foi feito. Tire os segredos e rode de novo." -ForegroundColor Yellow
        return
    }

    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Nenhuma alteracao pendente para commit." -ForegroundColor DarkGray
    } else {
        $msg = if ($Message) { $Message } else { "deploy $tag" }
        Invoke-Native { git commit -q -m $msg } 'git commit'
        Write-Host "Commit registrado: $msg ($($staged.Count) arquivos)" -ForegroundColor Cyan
    }

    $branch = git branch --show-current
    if (-not $branch) { $branch = 'main' }
    Write-Host "Enviando para o repositorio GitHub ($branch)..." -ForegroundColor Cyan
    Invoke-Native { git push -u origin $branch } 'git push'
    Write-Host "GitHub 100% atualizado: $githubRepo" -ForegroundColor Green

} catch {
    Write-Host "O deploy na VPS foi feito, mas o push no GitHub falhou: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}
