$headers = @{
    "Authorization" = "Bearer sbp_94d2761cfa0df069ae522056cddb7df884743cd8"
    "Content-Type"  = "application/json"
}

$body = @{
    sql = @"
SELECT timestamp, level, message
FROM edge_logs
WHERE metadata[0]->>'parsed[0].reqPath' LIKE '%generate-upload-url%'
ORDER BY timestamp DESC
LIMIT 20;
"@
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/czvvsvgkpnqajhevjbjx/analytics/endpoints/logs.all?iso_timestamp_start=$((Get-Date).AddHours(-1).ToString('o'))&iso_timestamp_end=$((Get-Date).ToString('o'))" -Method GET -Headers $headers
    Write-Host "SUCCESS:"
    $response | ConvertTo-Json -Depth 20
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}
