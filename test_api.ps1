# PowerShell Script to Test SWP391 Backend API Endpoints
# Run this script in PowerShell to verify backend functionality.

$baseUrl = "http://localhost:5000"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Testing SWP391 Express Backend API at $baseUrl" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Helper function to print response
function Show-Response ($title, $response) {
    Write-Host "`n[+] $title" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Gray
}

try {
    # 1. Test Root Endpoint
    Write-Host "`n1. Testing Server Root Connection..." -ForegroundColor Yellow
    $root = Invoke-RestMethod -Uri "$baseUrl/" -Method Get
    Write-Host "Response: $root" -ForegroundColor Gray

    # Generate a random email to prevent duplicate conflicts
    $randNum = Get-Random -Minimum 1000 -Maximum 9999
    $testEmail = "testuser$randNum`@fpt.edu.vn"
    $testPhone = "098$randNum" + "5432"
    $testPassword = "Password$randNum`!"
    
    # 2. Test Signup Endpoint
    Write-Host "`n2. Testing Signup Endpoint ($testEmail)..." -ForegroundColor Yellow
    $signupBody = @{
        fullname = "Nguyen Van A"
        email = $testEmail
        phone = $testPhone
        password = $testPassword
    } | ConvertTo-Json
    
    $signupRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/signup" -Method Post -Body $signupBody -ContentType "application/json"
    Show-Response "Signup Request Response (OTP Sent)" $signupRes

    # 2.5 Verify OTP
    Write-Host "`n2.5. Reading OTP from last_otp.txt..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    $otpPath = Join-Path (Get-Location) "BE/data/last_otp.txt"
    if (Test-Path $otpPath) {
        $otp = Get-Content $otpPath -Raw
        $otp = $otp.Trim()
        Write-Host "Found OTP: $otp" -ForegroundColor Gray
        
        $verifyBody = @{
            email = $testEmail
            otp = $otp
        } | ConvertTo-Json
        
        $verifyRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method Post -Body $verifyBody -ContentType "application/json"
        Show-Response "Verify OTP Success Response" $verifyRes
    } else {
        Write-Host "[ERROR] Could not find OTP file at $otpPath!" -ForegroundColor Red
        throw "OTP verification file not found"
    }

    # 3. Test Login Endpoint
    Write-Host "`n3. Testing Login Endpoint..." -ForegroundColor Yellow
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Show-Response "Login Success Response" $loginRes

    if (-not $loginRes.token) {
        throw "Login response missing JWT token"
    }
    $authHeaders = @{
        Authorization = "Bearer $($loginRes.token)"
    }

    # 4. Test Retrieve Profile Endpoint
    Write-Host "`n4. Testing Get Profile Endpoint..." -ForegroundColor Yellow
    $profileRes = Invoke-RestMethod -Uri "$baseUrl/api/user/profile" -Method Get -Headers $authHeaders
    Show-Response "Get Profile Response" $profileRes

    # 5. Test Update Profile Endpoint (Interests and Orientation)
    Write-Host "`n5. Testing Update Profile Endpoint..." -ForegroundColor Yellow
    $updateBody = @{
        orientation = "Full-stack Developer, Cloud Architecture"
        interests = @("AI", "Văn hóa Nhật Bản", "Thể thao")
    } | ConvertTo-Json

    $updateRes = Invoke-RestMethod -Uri "$baseUrl/api/user/profile" -Method Put -Body $updateBody -ContentType "application/json" -Headers $authHeaders
    Show-Response "Update Profile Response" $updateRes

    # 6. Test Change Password Endpoint
    Write-Host "`n6. Testing Change Password Endpoint..." -ForegroundColor Yellow
    $newPassword = "NewPassword$randNum`!"
    $changePwBody = @{
        currentPassword = $testPassword
        newPassword = $newPassword
    } | ConvertTo-Json

    $changePwRes = Invoke-RestMethod -Uri "$baseUrl/api/user/change-password" -Method Put -Body $changePwBody -ContentType "application/json" -Headers $authHeaders
    Show-Response "Change Password Response" $changePwRes

    # 7. Test Login with New Password
    Write-Host "`n7. Testing Login with New Password..." -ForegroundColor Yellow
    $newLoginBody = @{
        email = $testEmail
        password = $newPassword
    } | ConvertTo-Json

    $newLoginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $newLoginBody -ContentType "application/json"
    Show-Response "Login with New Password Response" $newLoginRes

    # 8. Test Forgot Password Endpoint
    Write-Host "`n8. Testing Forgot Password OTP Request..." -ForegroundColor Yellow
    $forgotBody = @{
        contact = $testEmail
    } | ConvertTo-Json

    $forgotRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/forgot-password" -Method Post -Body $forgotBody -ContentType "application/json"
    Show-Response "Forgot Password OTP Response" $forgotRes

    # 9. Test Google SSO Endpoint (Mock mode)
    Write-Host "`n9. Testing Google SSO Endpoint (Mock)..." -ForegroundColor Yellow
    $googleEmail = "googleuser$randNum`@gmail.com"
    $googleBody = @{
        email = $googleEmail
        name = "Google User $randNum"
        isMock = $true
    } | ConvertTo-Json
    
    $googleRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/google" -Method Post -Body $googleBody -ContentType "application/json"
    Show-Response "Google SSO Success Response" $googleRes

    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "Backend API Testing Completed Successfully!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan

} catch {
    Write-Host "`n[ERROR] An error occurred during API testing:" -ForegroundColor Red
    $_ | Format-List -Force
}
