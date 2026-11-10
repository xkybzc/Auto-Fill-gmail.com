# Runs tests/test-page.html in a hidden Edge window with the extension loaded
# and prints the result of every test case.
# Usage (from the project folder):  powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1

$extension = Split-Path -Parent $PSScriptRoot
$page = "file:///" + ((Join-Path $PSScriptRoot "test-page.html") -replace '\\', '/' -replace ' ', '%20')
$profileDir = Join-Path $env:TEMP "gmail-autofill-test-profile"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$dom = & $edge --headless=new --disable-gpu "--user-data-dir=$profileDir" `
    "--load-extension=$extension" "--disable-extensions-except=$extension" `
    --virtual-time-budget=15000 --dump-dom $page | Out-String

$rows = [regex]::Matches($dom, '<tr><td>(.*?)</td>.*?<td>(.*?)</td><td>(.*?)</td></tr>')
foreach ($row in $rows) {
    $name = [System.Net.WebUtility]::HtmlDecode($row.Groups[1].Value)
    $result = [System.Net.WebUtility]::HtmlDecode(($row.Groups[3].Value -replace '<[^>]+>', ' ').Trim())
    $color = if ($result -like 'PASS*') { 'Green' } else { 'Red' }
    Write-Host ("{0,-45} {1}" -f $name, $result) -ForegroundColor $color
}

$summary = [regex]::Match($dom, '<div id="summary"[^>]*>(.*?)</div>').Groups[1].Value
Write-Host ""
Write-Host $summary
if ($summary -notlike 'All*passed.') { exit 1 }
