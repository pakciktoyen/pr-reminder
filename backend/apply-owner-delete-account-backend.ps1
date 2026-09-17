$ErrorActionPreference = "Stop"

$serverPath = "C:\Users\Toyen\pr-reminder\backend\server.cjs"

if (-not (Test-Path $serverPath)) {
  throw "backend/server.cjs tidak ditemukan: $serverPath"
}

$backupPath = "$serverPath.backup-before-owner-delete-account"

$server = [System.IO.File]::ReadAllText($serverPath)
$server = $server -replace "`r`n", "`n"
$server = $server -replace "`r", "`n"

# Jangan tambahkan route dua kali.
if ($server -match 'app\.delete\(\s*"/api/admin/users/:id"') {
  Write-Host "Endpoint DELETE /api/admin/users/:id sudah ada. Tidak diubah." -ForegroundColor Yellow
  Write-Host "Backend siap."
  Write-Host "File: $serverPath"
  exit 0
}

$route = @'
/* =========================================================
   ADMIN DELETE USER
========================================================= */

app.delete(
  "/api/admin/users/:id",
  authenticateAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (!Number.isInteger(userId)) {
        return res.status(400).json({
          message: "ID pengguna tidak valid.",
        });
      }

      const result = await pool.query(
        `
        DELETE FROM users
        WHERE id = $1
        RETURNING
          id,
          username,
          full_name,
          role
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Pengguna tidak ditemukan.",
        });
      }

      const deletedUser = result.rows[0];

      console.log(
        `Admin deleted user permanently: id=${deletedUser.id}, username=${deletedUser.username}, role=${deletedUser.role}, admin=${req.admin.id}`
      );

      return res.json({
        success: true,
        message:
          `Akun ${deletedUser.username} berhasil dihapus permanen.`,
        user: {
          id: deletedUser.id,
          username: deletedUser.username,
          fullName: deletedUser.full_name,
          role: deletedUser.role,
        },
      });
    } catch (error) {
      console.error(
        "DELETE /api/admin/users/:id:",
        error
      );

      return res.status(500).json({
        message: "Gagal menghapus akun.",
      });
    }
  }
);

'@

$inserted = $false

# Anchor 1: ADMIN TASKS comment
$regexTasks = '(?s)/\* =========================================================\s+ADMIN TASKS\s+========================================================= \*/'
if ($server -match $regexTasks) {
  $server = [regex]::Replace(
    $server,
    $regexTasks,
    { param($m) $route + $m.Value },
    1
  )
  $inserted = $true
}

# Anchor 2: ADMIN CLASSES comment (used by existing delete-all-tasks patch)
if (-not $inserted) {
  $regexClasses = '(?s)/\* =========================================================\s+ADMIN CLASSES\s+========================================================= \*/'
  if ($server -match $regexClasses) {
    $server = [regex]::Replace(
      $server,
      $regexClasses,
      { param($m) $route + $m.Value },
      1
    )
    $inserted = $true
  }
}

# Anchor 3: actual tasks route
if (-not $inserted) {
  $regexTasksRoute = '(?s)app\.get\(\s*"/api/admin/tasks"'
  if ($server -match $regexTasksRoute) {
    $server = [regex]::Replace(
      $server,
      $regexTasksRoute,
      { param($m) $route + $m.Value },
      1
    )
    $inserted = $true
  }
}

if (-not $inserted) {
  throw "Tidak menemukan bagian ADMIN TASKS / ADMIN CLASSES / /api/admin/tasks."
}

if (-not (Test-Path $backupPath)) {
  Copy-Item -LiteralPath $serverPath -Destination $backupPath
  Write-Host "Backup: $backupPath" -ForegroundColor Cyan
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
  $serverPath,
  ($server -replace "`n", "`r`n"),
  $utf8NoBom
)

Write-Host ""
Write-Host "Backend siap." -ForegroundColor Green
Write-Host "File: $serverPath" -ForegroundColor Cyan
Write-Host "Endpoint: DELETE /api/admin/users/:id" -ForegroundColor Yellow
Write-Host ""
Write-Host "Akun akan dihapus permanen dari tabel users." -ForegroundColor DarkYellow
Write-Host "Relasi dengan ON DELETE CASCADE akan ikut dibersihkan oleh database." -ForegroundColor DarkYellow
