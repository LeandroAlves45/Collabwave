param(
  [Parameter(Mandatory = $true)]
  [string]$HookName
)

$ErrorActionPreference = "SilentlyContinue"

function Find-ProjectRoot {
  if ($env:CLAUDE_PROJECT_DIR -and (Test-Path -LiteralPath $env:CLAUDE_PROJECT_DIR)) {
    return (Resolve-Path -LiteralPath $env:CLAUDE_PROJECT_DIR).Path
  }

  $dir = (Get-Location).Path
  while ($dir) {
    if ((Test-Path -LiteralPath (Join-Path $dir ".claude")) -or (Test-Path -LiteralPath (Join-Path $dir ".git"))) {
      return $dir
    }

    $parent = Split-Path -Parent $dir
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $dir) {
      break
    }
    $dir = $parent
  }

  $scriptRoot = $PSScriptRoot
  if ($scriptRoot) {
    $fallback = (Resolve-Path -LiteralPath (Join-Path $scriptRoot "..\..")).Path
    if ((Test-Path -LiteralPath (Join-Path $fallback ".claude")) -or (Test-Path -LiteralPath (Join-Path $fallback ".git"))) {
      return $fallback
    }
  }

  return (Get-Location).Path
}

function Read-HookInput {
  $raw = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  try {
    return $raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Write-Decision {
  param(
    [ValidateSet("deny", "ask")][string]$Decision,
    [string]$Reason
  )
  @{
    permission    = $Decision
    user_message  = $Reason
    agent_message = $Reason
  } | ConvertTo-Json -Compress
  if ($Decision -eq "deny") { exit 2 }
  exit 0
}

function Exit-Allow {
  # Cursor lê estes hooks via settings; Claude Code ignora stdout em allow.
  Write-Output '{"permission":"allow"}'
  exit 0
}

function Get-ToolInputValue {
  param(
    [object]$InputObject,
    [string]$Name
  )

  if ($null -eq $InputObject -or $null -eq $InputObject.tool_input) {
    return ""
  }

  $property = $InputObject.tool_input.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) {
    return ""
  }

  return [string]$property.Value
}

function Normalize-PathForMatch {
  param([string]$Path)
  return ($Path -replace "\\", "/").ToLowerInvariant()
}

function Get-BaseNameForMatch {
  param([string]$Path)
  $normalized = $Path -replace "\\", "/"
  $leaf = ($normalized -split "/")[-1]
  return $leaf.ToLowerInvariant()
}

function Test-LikeAny {
  param(
    [string]$Value,
    [string[]]$Patterns
  )

  foreach ($pattern in $Patterns) {
    if ($Value -like $pattern) {
      return $true
    }
  }
  return $false
}

function Invoke-ProtectFiles {
  param([object]$InputObject)

  $filePath = Get-ToolInputValue $InputObject "file_path"
  if ([string]::IsNullOrWhiteSpace($filePath)) {
    Exit-Allow
  }

  $baseName = Get-BaseNameForMatch $filePath
  $path = Normalize-PathForMatch $filePath

  $protectedPatterns = @(
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "*.crt",
    "*.p12",
    "*.pfx",
    "id_rsa",
    "id_ed25519",
    "credentials.json",
    ".npmrc",
    ".pypirc",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.gen.ts",
    "*.generated.*",
    "*.min.js",
    "*.min.css"
  )

  foreach ($pattern in $protectedPatterns) {
    if ($baseName -like $pattern) {
      Write-Decision "deny" "Protected file: $baseName matches pattern '$pattern'"
    }
  }

  if (Test-LikeAny $path @(".git/*", "*/.git/*")) {
    Write-Decision "deny" "Cannot edit files inside .git/"
  }
  if (Test-LikeAny $path @("secrets/*", "*/secrets/*")) {
    Write-Decision "deny" "Cannot edit files inside secrets/"
  }
  if (Test-LikeAny $path @(".env", ".env.*", "*/.env", "*/.env.*")) {
    Write-Decision "deny" "Cannot edit .env files"
  }
  if (Test-LikeAny $path @(".claude/hooks/*", "*/.claude/hooks/*")) {
    Write-Decision "deny" "Cannot edit hook scripts. These enforce security boundaries."
  }
  if (Test-LikeAny $path @(".claude/settings.json", "*/.claude/settings.json", ".claude/settings.local.json", "*/.claude/settings.local.json")) {
    Write-Decision "ask" "Editing settings.json. This controls permissions and hooks. Confirm this change."
  }
  if (Test-LikeAny $path @("*/backend/infrastructure/database/migrations/*", "backend/infrastructure/database/migrations/*")) {
    Write-Decision "deny" "EF Core migrations should not be edited manually. Use: dotnet ef migrations add {name}"
  }
  if (Test-LikeAny $path @("docker-compose.yml", "docker-compose.*.yml", "*/docker-compose.yml", "*/docker-compose.*.yml")) {
    Write-Decision "ask" "Editing docker-compose. Infrastructure changes require review."
  }

  Exit-Allow
}

function Invoke-WarnLargeFiles {
  param([object]$InputObject)

  $filePath = Get-ToolInputValue $InputObject "file_path"
  if ([string]::IsNullOrWhiteSpace($filePath)) {
    Exit-Allow
  }

  $path = Normalize-PathForMatch $filePath
  $baseName = Get-BaseNameForMatch $filePath

  if (Test-LikeAny $path @("node_modules/*", "*/node_modules/*")) {
    Write-Decision "deny" "Cannot write into node_modules/. Install dependencies via package manager instead."
  }
  if (Test-LikeAny $path @("bin/*", "*/bin/*", "obj/*", "*/obj/*")) {
    Write-Decision "deny" "Cannot write into bin/ or obj/. These are generated by dotnet build."
  }
  if (Test-LikeAny $path @("dist/*", "*/dist/*", "build/*", "*/build/*")) {
    Write-Decision "deny" "Cannot write into build output directories. These are generated by the build process."
  }

  if (Test-LikeAny $baseName @("*.wasm", "*.so", "*.dylib", "*.dll", "*.exe", "*.o", "*.a")) {
    Write-Decision "deny" "Cannot write binary files. These should be compiled, not hand-written."
  }
  if (Test-LikeAny $baseName @("*.zip", "*.tar", "*.tar.gz", "*.tar.bz2", "*.tgz", "*.rar", "*.7z")) {
    Write-Decision "deny" "Cannot write archive files."
  }
  if (Test-LikeAny $baseName @("*.mp4", "*.mov", "*.avi", "*.mkv", "*.mp3", "*.wav", "*.flac")) {
    Write-Decision "deny" "Cannot write media files. Add these manually outside Claude Code."
  }
  if (Test-LikeAny $baseName @("*.pyc", "*.pyo", "*.class")) {
    Write-Decision "deny" "Cannot write compiled bytecode files."
  }

  Exit-Allow
}

function Invoke-ScanSecrets {
  param([object]$InputObject)

  if ($null -eq $InputObject) {
    Exit-Allow
  }

  $toolName = ""
  if ($InputObject.PSObject.Properties["tool_name"]) {
    $toolName = [string]$InputObject.tool_name
  }

  $content = ""
  if ($toolName -eq "Write") {
    $content = Get-ToolInputValue $InputObject "content"
  } elseif ($toolName -eq "Edit") {
    $content = Get-ToolInputValue $InputObject "new_string"
  } else {
    Exit-Allow
  }

  if ([string]::IsNullOrWhiteSpace($content)) {
    Exit-Allow
  }

  $secretFindings = New-Object System.Collections.Generic.List[string]
  if ($content -match "AKIA[0-9A-Z]{16}") {
    $secretFindings.Add("AWS access key (AKIA...)")
  }
  if ($content -match "(?i)(aws_secret_access_key|secret_key)\s*[=:]\s*['""]?[A-Za-z0-9/+=]{40}") {
    $secretFindings.Add("AWS secret key")
  }
  if ($content -match "(ghp_|gho_|ghs_|ghr_|github_pat_)[a-zA-Z0-9_]{20,}") {
    $secretFindings.Add("GitHub token")
  }
  if ($content -match "sk-[a-zA-Z0-9]{20,}") {
    $secretFindings.Add("API key (sk-...)")
  }
  if ($content -match "xox[bpras]-[0-9a-zA-Z-]{10,}") {
    $secretFindings.Add("Slack token")
  }
  if ($content -match "-----BEGIN\s+(RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----") {
    $secretFindings.Add("private key block")
  }
  if ($content -match "(mongodb|postgres|mysql|redis|amqp|smtp)(\+[a-z]+)?://[^:\s]+:[^@\s]+@") {
    $secretFindings.Add("connection string with credentials")
  }

  $genericSecretPattern = "(?i)(password|secret|token|api_key|apikey|api_secret)\s*[=:]\s*['""][^'""]{8,}['""]"
  $envReferencePattern = "(?i)(password|secret|token|api_key|apikey|api_secret)\s*[=:]\s*['""]?(process\.env|os\.environ|getenv|\$\{|ENV\[|env\()"
  if (($content -match $genericSecretPattern) -and ($content -notmatch $envReferencePattern)) {
    $secretFindings.Add("hardcoded credential")
  }

  if ($secretFindings.Count -gt 0) {
    Write-Decision "ask" ("Possible secret detected in content: " + (($secretFindings | ForEach-Object { "$_;" }) -join "") + " Review carefully before allowing.")
  }

  Exit-Allow
}

function Invoke-BlockDangerousCommands {
  param([object]$InputObject)

  $command = Get-ToolInputValue $InputObject "command"
  if ([string]::IsNullOrWhiteSpace($command)) {
    Exit-Allow
  }

  if ($command -like "*rm -rf /*" -or $command -like "*rm -rf ~*" -or $command -like "*rm -rf .*") {
    Write-Decision "deny" "Destructive command blocked: mass directory deletion."
  }
  if ($command -like "*git push --force*" -or $command -like "*git push -f*") {
    Write-Decision "deny" "Force push blocked. Confirm manually if it is really necessary."
  }
  if ($command -like "*dotnet ef database drop*") {
    Write-Decision "deny" "Database drop blocked. Run manually if this is intentional."
  }
  if ($command -like "*DROP TABLE*" -or $command -like "*DROP DATABASE*" -or $command -like "*TRUNCATE*") {
    Write-Decision "deny" "Destructive SQL command blocked. Confirm manually."
  }
  if ($command -like "*chmod -R 777*") {
    Write-Decision "deny" "Insecure permissions blocked."
  }
  if ($command -like "*:(){ :|:& };:*") {
    Write-Decision "deny" "Fork bomb blocked."
  }

  Exit-Allow
}

function Invoke-FormatOnSave {
  param(
    [object]$InputObject,
    [string]$Root
  )

  $filePath = Get-ToolInputValue $InputObject "file_path"
  if ([string]::IsNullOrWhiteSpace($filePath)) {
    exit 0
  }

  $resolvedPath = $filePath
  if (-not [System.IO.Path]::IsPathRooted($resolvedPath)) {
    $resolvedPath = Join-Path $Root $resolvedPath
  }
  if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
    exit 0
  }

  $extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()
  if ($extension -eq ".cs") {
    if (Get-Command dotnet -ErrorAction SilentlyContinue) {
      & dotnet format --include $resolvedPath *> $null
    }
    exit 0
  }

  if ($extension -in @(".ts", ".tsx", ".js", ".jsx", ".json", ".css")) {
    $candidatePrettier = @(
      (Join-Path $Root "frontend/node_modules/.bin/prettier.cmd"),
      (Join-Path $Root "frontend/node_modules/.bin/prettier"),
      (Join-Path $Root "Chatbot.Frontend/node_modules/.bin/prettier.cmd"),
      (Join-Path $Root "Chatbot.Frontend/node_modules/.bin/prettier")
    )

    foreach ($prettier in $candidatePrettier) {
      if (Test-Path -LiteralPath $prettier -PathType Leaf) {
        & $prettier --write $resolvedPath *> $null
        exit 0
      }
    }

    if (Get-Command npx -ErrorAction SilentlyContinue) {
      & npx --no-install prettier --write $resolvedPath *> $null
    }
  }

  exit 0
}

function Invoke-SessionStart {
  param([string]$Root)

  Write-Output "=== Chatbot Project ==="
  Write-Output "Stack: .NET 10 / ASP.NET Core / EF Core / PostgreSQL + React 19 / TypeScript / Vite"

  if (Test-Path -LiteralPath (Join-Path $Root ".git")) {
    $branch = & git -C $Root rev-parse --abbrev-ref HEAD 2>$null
    if ($branch -and $branch -ne "HEAD") {
      Write-Output "Branch atual: $branch"
    }

    $lastCommit = & git -C $Root log --oneline -1 2>$null
    if ($lastCommit) {
      Write-Output "Ultimo commit: $lastCommit"
    }
  }

  $memoryCandidates = @(
    (Join-Path $Root ".claude/MEMORY.md"),
    (Join-Path $Root ".claude/memory/MEMORY.md")
  )
  foreach ($memoryFile in $memoryCandidates) {
    if (Test-Path -LiteralPath $memoryFile -PathType Leaf) {
      Write-Output ""
      Write-Output "--- MEMORY.md ---"
      Get-Content -LiteralPath $memoryFile
      break
    }
  }

  $todoFile = Join-Path $Root "tasks/todo.md"
  if (Test-Path -LiteralPath $todoFile -PathType Leaf) {
    Write-Output ""
    Write-Output "--- tasks/todo.md ---"
    Get-Content -LiteralPath $todoFile
  }

  Write-Output "========================================"
  exit 0
}

function Invoke-ContextRecovery {
  param([string]$Root)

  $context = ""
  if (Test-Path -LiteralPath (Join-Path $Root ".git")) {
    $branch = & git -C $Root rev-parse --abbrev-ref HEAD 2>$null
    if ($branch -and $branch -ne "HEAD") {
      $context = "Branch: $branch"
    }

    $lastCommit = & git -C $Root log --oneline -1 2>$null
    if ($lastCommit) {
      $context = "$context | Last commit: $lastCommit"
    }

    $changes = (& git -C $Root status --porcelain 2>$null | Measure-Object).Count
    if ($changes -gt 0) {
      $context = "$context | Uncommitted changes: $changes files"
    }
  }

  @"
=== CONTEXT RECOVERED AFTER COMPACTION ===

CRITICAL PROJECT RULES (Chatbot Project)
Backend: C# 14, .NET 10, ASP.NET Core, Entity Framework Core, PostgreSQL, Redis (Sprint 3+)
Frontend: React 19, TypeScript, Vite, shadcn/ui, Zustand
Projeto pessoal, um unico utilizador, sem autenticacao no MVP

1. CLEAN ARCHITECTURE - MANDATORY
   Ordem de camadas: Domain -> Application -> Infrastructure -> WebApi
   Domain: entidades puras e regras de negocio, zero dependencias externas
   Application: use cases + interfaces (contratos) + DTOs
   Infrastructure: repositories, EF Core, AnthropicService (chamada real a API)
   WebApi: Minimal APIs, middleware, Dependency Injection
   NUNCA colocar logica de negocio em Endpoints
   NUNCA deixar use cases saberem detalhes de HTTP ou base de dados
   Regra de dependencia: dependencias apontam sempre para dentro

2. DATABASE MIGRATIONS - NON-NEGOTIABLE
   Criar migrations via: dotnet ef migrations add {nome} --project backend/Infrastructure --startup-project backend/WebApi
   Aplicar migrations via: dotnet ef database update
   NUNCA editar um ficheiro de migration existente (pode ja ter corrido em producao)
   Nova feature = nova migration

3. ERROR HANDLING
   Application layer usa Result<T> pattern. Nunca lanca exception para fluxo normal
   Exceptions apenas para erros inesperados (null references, ligacao a DB quebrada)
   Middleware global trata excecoes e devolve 500 sem stack trace ao cliente

4. TESTING REQUIREMENTS
   xUnit no backend
   Domain: testes sem mocks, logica pura
   Application: testes com mocks de Repository
   Infrastructure: testes com database em memoria
   WebApi: testes de integracao com WebApplicationFactory
   Correr antes de marcar tarefa concluida: dotnet test

5. SECURITY
   ANTHROPIC_API_KEY sempre em environment variable, nunca no codigo ou no frontend
   Input validation com Fluent Validation na Application layer
   CORS restrito ao origin do frontend
   Nunca logar senhas, tokens ou API keys
   HTTPS forcado em producao

6. CACHING (Redis, a partir do Sprint 3)
   Padrao: Redis first -> cache miss -> DB -> set TTL
   Cache de conversations recentes 30 min, mensagens da conversation aberta 1 hora
   Fallback: se Redis estiver em baixo, continuar a funcionar sem cache

7. GIT WORKFLOW
   Feature branches, conventional commits
   Testes tem de passar antes de commit

COMMANDS:
  dotnet run --project backend/WebApi
  dotnet test backend/Tests
  dotnet ef migrations add {nome} --project backend/Infrastructure --startup-project backend/WebApi
  dotnet ef database update --project backend/Infrastructure --startup-project backend/WebApi
  npm run dev
  npm run test
"@

  if ($context) {
    Write-Output ""
    Write-Output "Current state: $context"
  }

  $claudeFile = Join-Path $Root ".claude/CLAUDE.md"
  $rootClaudeFile = Join-Path $Root "CLAUDE.md"
  if (Test-Path -LiteralPath $claudeFile -PathType Leaf) {
    Write-Output ""
    Write-Output "=== CLAUDE.md (re-injected) ==="
    Get-Content -LiteralPath $claudeFile
  } elseif (Test-Path -LiteralPath $rootClaudeFile -PathType Leaf) {
    Write-Output ""
    Write-Output "=== CLAUDE.md (re-injected) ==="
    Get-Content -LiteralPath $rootClaudeFile
  }

  Write-Output ""
  Write-Output "=== END CONTEXT RECOVERY ==="
  exit 0
}

$root = Find-ProjectRoot
Set-Location -LiteralPath $root
$inputObject = Read-HookInput

switch ($HookName) {
  "protect-files-ADJUSTED.sh" { Invoke-ProtectFiles $inputObject }
  "warn-large-files-ADJUSTED.sh" { Invoke-WarnLargeFiles $inputObject }
  "scan-secrets-ADJUSTED.sh" { Invoke-ScanSecrets $inputObject }
  "block-dangerous-commands.sh" { Invoke-BlockDangerousCommands $inputObject }
  "format-on-save.sh" { Invoke-FormatOnSave $inputObject $root }
  "session-start.sh" { Invoke-SessionStart $root }
  "context-recovery-ADJUSTED.sh" { Invoke-ContextRecovery $root }
  default {
    Write-Error "Unknown Claude hook: $HookName"
    exit 1
  }
}
