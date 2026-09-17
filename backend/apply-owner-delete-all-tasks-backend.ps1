$ErrorActionPreference = "Stop"

$serverPath = "C:\Users\Toyen\pr-reminder\backend\server.cjs"

if (-not (Test-Path $serverPath)) {
  throw "backend/server.cjs tidak ditemukan: $serverPath"
}

$backupPath = "$serverPath.backup-before-owner-delete-all-tasks"
if (-not (Test-Path $backupPath)) {
  Copy-Item $serverPath $backupPath
}

$server = [System.IO.File]::ReadAllText($serverPath)
$server = $server -replace "`r`n", "`n"

$server = $server.Replace(
  "admin.apps.length",
  "admin.getApps().length"
)

if (-not $server.Contains("DELETE ALL ADMIN TASKS")) {
  $anchor = @'
/* =========================================================
   ADMIN CLASSES
========================================================= */
'@

  if (-not $server.Contains($anchor.TrimEnd())) {
    throw "Bagian ADMIN CLASSES tidak ditemukan di server.cjs."
  }

  $route = @'
/* =========================================================
   DELETE ALL ADMIN TASKS
   OWNER / ADMIN ONLY
   MENGHAPUS SEMUA TUGAS DARI SELURUH KELAS
========================================================= */

app.delete(
  "/api/admin/tasks",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        DELETE FROM public.tasks
        RETURNING id
      `);

      const deletedCount = result.rowCount || 0;

      console.log(
        `Admin deleted all tasks: count=${deletedCount}, admin=${req.admin.id}`
      );

      return res.json({
        success: true,
        deletedCount,
        message:
          deletedCount > 0
            ? `${deletedCount} tugas berhasil dihapus dari seluruh kelas.`
            : "Tidak ada tugas yang perlu dihapus.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/admin/tasks:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Gagal menghapus semua tugas.",
      });
    }
  }
);

/* =========================================================
   ADMIN CLASSES
========================================================= */
'@

  $server = $server.Replace($anchor, $route.TrimEnd())
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
  $serverPath,
  ($server -replace "`n", "`r`n"),
  $utf8NoBom
)

Write-Host "Backend siap." 
Write-Host "Backup: $backupPath"
Write-Host "File: $serverPath"
