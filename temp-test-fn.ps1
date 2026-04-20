$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnZzdmdrcG5xYWpoZXZqYmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDE1MzgsImV4cCI6MjA5MjExNzUzOH0.L-0ApggqlnPYI-EV3muuh4K_-BJXu2lxVvj5XDGCc4E"

Write-Host "Testing Edge Function directly..."
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://czvvsvgkpnqajhevjbjx.supabase.co/functions/v1/generate-upload-url" -Method POST -Headers @{
        "Content-Type"  = "application/json"
        "Authorization" = "Bearer $anonKey"
    } -Body '{"fileName":"test.png","contentType":"image/png","userId":"test-user","tenantId":"default"}'

    Write-Host "SUCCESS Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody"
    }
}
