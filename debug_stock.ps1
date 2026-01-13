$responseItems = Invoke-RestMethod -Uri "http://localhost:5000/api/items" -Method Get
Write-Output "Items:"
$responseItems.data | ConvertTo-Json -Depth 2

$responseStock = Invoke-RestMethod -Uri "http://localhost:5000/api/reports/stock" -Method Get
Write-Output "Stock:"
$responseStock | ConvertTo-Json -Depth 2
