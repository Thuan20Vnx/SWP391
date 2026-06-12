# PowerShell Script to Test FPT Student/Staff/Guest Role Detection
# Tests that the system correctly differentiates between:
# 1. FPT Student (email dạng: thuantxDE180299@fpt.edu.vn) -> role: "student"
# 2. FPT Staff  (email dạng: thuantx@fe.edu.vn)           -> role: "staff"
# 3. Guest      (email dạng: user@gmail.com)              -> role: "guest"

$baseUrl = "http://localhost:5000"
$separator = "=" * 60

Write-Host $separator -ForegroundColor Cyan
Write-Host " TEST: Phan biet vai tro khi dang nhap (Student/Staff/Guest)" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan

# Use 4-digit random so student code = 2 letters + 6 digits (e.g. DE181234)
$randNum = Get-Random -Minimum 1000 -Maximum 9999
$allPassed = $true

# ============================================================
# Helper function
# ============================================================
function Test-Role {
    param(
        [string]$TestName,
        [string]$Email,
        [string]$Fullname,
        [string]$Phone,
        [string]$ExpectedRole,
        [string]$ExpectedStudentId
    )

    Write-Host "`n$separator" -ForegroundColor DarkGray
    Write-Host "[TEST] $TestName" -ForegroundColor Yellow
    Write-Host "  Email: $Email" -ForegroundColor Gray
    Write-Host "  Expected Role: $ExpectedRole" -ForegroundColor Gray
    if ($ExpectedStudentId) {
        Write-Host "  Expected StudentId: $ExpectedStudentId" -ForegroundColor Gray
    }

    $password = "TestPass123!"

    # Step 1: Signup
    Write-Host "  -> Dang ky tai khoan..." -ForegroundColor DarkCyan
    try {
        $signupBody = @{
            fullname = $Fullname
            email    = $Email
            phone    = $Phone
            password = $password
        } | ConvertTo-Json

        $signupRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/signup" -Method Post -Body $signupBody -ContentType "application/json"
        
        if (-not $signupRes.success) {
            Write-Host "  [FAIL] Signup failed: $($signupRes.message)" -ForegroundColor Red
            return $false
        }
        Write-Host "  -> OTP da gui thanh cong" -ForegroundColor DarkCyan
    } catch {
        $errMsg = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  [FAIL] Signup error: $($errMsg.message)" -ForegroundColor Red
        return $false
    }

    # Step 2: Read OTP
    Start-Sleep -Milliseconds 500
    $otpPath = Join-Path (Get-Location) "BE/data/last_otp.txt"
    if (-not (Test-Path $otpPath)) {
        Write-Host "  [FAIL] Khong tim thay file OTP!" -ForegroundColor Red
        return $false
    }
    $otp = (Get-Content $otpPath -Raw).Trim()
    Write-Host "  -> OTP: $otp" -ForegroundColor DarkCyan

    # Step 3: Verify OTP
    Write-Host "  -> Xac minh OTP..." -ForegroundColor DarkCyan
    try {
        $verifyBody = @{
            email = $Email
            otp   = $otp
        } | ConvertTo-Json

        $verifyRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method Post -Body $verifyBody -ContentType "application/json"

        if (-not $verifyRes.success) {
            Write-Host "  [FAIL] OTP verification failed: $($verifyRes.message)" -ForegroundColor Red
            return $false
        }

        $signupRole = $verifyRes.user.role
        $signupStudentId = $verifyRes.user.studentId
        Write-Host "  -> Dang ky thanh cong! Role = '$signupRole', StudentId = '$signupStudentId'" -ForegroundColor DarkCyan
    } catch {
        $errMsg = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  [FAIL] OTP verify error: $($errMsg.message)" -ForegroundColor Red
        return $false
    }

    # Step 4: Login and check role
    Write-Host "  -> Dang nhap..." -ForegroundColor DarkCyan
    try {
        $loginBody = @{
            email    = $Email
            password = $password
        } | ConvertTo-Json

        $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"

        if (-not $loginRes.success) {
            Write-Host "  [FAIL] Login failed: $($loginRes.message)" -ForegroundColor Red
            return $false
        }

        $loginRole = $loginRes.user.role
        $loginStudentId = $loginRes.user.studentId

        Write-Host "  -> Dang nhap thanh cong!" -ForegroundColor DarkCyan
        Write-Host "  -> Role tra ve:      '$loginRole'" -ForegroundColor White
        Write-Host "  -> StudentId tra ve:  '$loginStudentId'" -ForegroundColor White
    } catch {
        $errMsg = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  [FAIL] Login error: $($errMsg.message)" -ForegroundColor Red
        return $false
    }

    # Step 5: Verify expected values
    $roleOk = ($loginRole -eq $ExpectedRole)
    $studentIdOk = $true

    if ($ExpectedStudentId) {
        $studentIdOk = ($loginStudentId -eq $ExpectedStudentId)
    } else {
        $studentIdOk = ([string]::IsNullOrEmpty($loginStudentId))
    }

    if ($roleOk -and $studentIdOk) {
        Write-Host "  [PASS] Role = '$loginRole' (expected '$ExpectedRole')" -ForegroundColor Green
        if ($loginStudentId) {
            Write-Host "  [PASS] StudentId = '$loginStudentId' (expected '$ExpectedStudentId')" -ForegroundColor Green
        }
        return $true
    } else {
        if (-not $roleOk) {
            Write-Host "  [FAIL] Role = '$loginRole', expected '$ExpectedRole'" -ForegroundColor Red
        }
        if (-not $studentIdOk) {
            Write-Host "  [FAIL] StudentId = '$loginStudentId', expected '$ExpectedStudentId'" -ForegroundColor Red
        }
        return $false
    }
}

# ============================================================
# TEST 1: FPT Student (có mã sinh viên trong email)
# Student code pattern: [A-Z]{2}\d{6} => e.g. DE18xxxx
# ============================================================
$studentCode = "DE18${randNum}"
$result1 = Test-Role `
    -TestName "1. Sinh vien FPT (co ma sinh vien trong email)" `
    -Email "nguyenvantx${studentCode}@fpt.edu.vn" `
    -Fullname "Nguyen Van Student" `
    -Phone "091${randNum}01" `
    -ExpectedRole "student" `
    -ExpectedStudentId $studentCode

if (-not $result1) { $allPassed = $false }

# ============================================================
# TEST 2: FPT Staff (email FPT nhưng không có mã sinh viên)
# ============================================================
$result2 = Test-Role `
    -TestName "2. Giang vien / Nhan vien FPT (email fe.edu.vn, khong co ma SV)" `
    -Email "teststaff${randNum}@fe.edu.vn" `
    -Fullname "Tran Thi Staff" `
    -Phone "092${randNum}02" `
    -ExpectedRole "staff" `
    -ExpectedStudentId ""

if (-not $result2) { $allPassed = $false }

# ============================================================
# TEST 3: Guest (email ngoài, không phải FPT)
# ============================================================
$result3 = Test-Role `
    -TestName "3. Khach (email Gmail, khong phai FPT)" `
    -Email "testguest${randNum}@gmail.com" `
    -Fullname "Le Van Guest" `
    -Phone "093${randNum}03" `
    -ExpectedRole "guest" `
    -ExpectedStudentId ""

if (-not $result3) { $allPassed = $false }

# ============================================================
# TEST 4: Google SSO - FPT Student
# ============================================================
Write-Host "`n$separator" -ForegroundColor DarkGray
Write-Host "[TEST] 4. Google SSO - Sinh vien FPT" -ForegroundColor Yellow
$gStudentCode = "SE17${randNum}"
$googleStudentEmail = "googletx${gStudentCode}@fpt.edu.vn"
Write-Host "  Email: $googleStudentEmail" -ForegroundColor Gray
Write-Host "  Expected Role: student, StudentId: $gStudentCode" -ForegroundColor Gray

try {
    $googleBody = @{
        email  = $googleStudentEmail
        name   = "Google FPT Student"
        isMock = $true
    } | ConvertTo-Json

    $googleRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/google" -Method Post -Body $googleBody -ContentType "application/json"

    $gRole = $googleRes.user.role
    $gSid = $googleRes.user.studentId

    Write-Host "  -> Role: '$gRole', StudentId: '$gSid'" -ForegroundColor White

    if ($gRole -eq "student" -and $gSid -eq $gStudentCode) {
        Write-Host "  [PASS] Google SSO - Student FPT detected correctly!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Expected role='student' studentId='$gStudentCode', got role='$gRole' studentId='$gSid'" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  [FAIL] Google SSO error: $_" -ForegroundColor Red
    $allPassed = $false
}

# ============================================================
# TEST 5: Google SSO - Guest (Gmail)
# ============================================================
Write-Host "`n$separator" -ForegroundColor DarkGray
Write-Host "[TEST] 5. Google SSO - Khach (Gmail)" -ForegroundColor Yellow
$googleGuestEmail = "googleguest${randNum}@gmail.com"
Write-Host "  Email: $googleGuestEmail" -ForegroundColor Gray
Write-Host "  Expected Role: guest" -ForegroundColor Gray

try {
    $googleBody2 = @{
        email  = $googleGuestEmail
        name   = "Google Guest User"
        isMock = $true
    } | ConvertTo-Json

    $googleRes2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/google" -Method Post -Body $googleBody2 -ContentType "application/json"

    $gRole2 = $googleRes2.user.role
    $gSid2 = $googleRes2.user.studentId

    Write-Host "  -> Role: '$gRole2', StudentId: '$gSid2'" -ForegroundColor White

    if ($gRole2 -eq "guest" -and [string]::IsNullOrEmpty($gSid2)) {
        Write-Host "  [PASS] Google SSO - Guest detected correctly!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Expected role='guest', got='$gRole2'" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  [FAIL] Google SSO error: $_" -ForegroundColor Red
    $allPassed = $false
}

# ============================================================
# TEST 6: Google SSO - Staff FPT (fe.edu.vn, no student code)
# ============================================================
Write-Host "`n$separator" -ForegroundColor DarkGray
Write-Host "[TEST] 6. Google SSO - Giang vien FPT (fe.edu.vn)" -ForegroundColor Yellow
$googleStaffEmail = "googlestaff${randNum}@fe.edu.vn"
Write-Host "  Email: $googleStaffEmail" -ForegroundColor Gray
Write-Host "  Expected Role: staff" -ForegroundColor Gray

try {
    $googleBody3 = @{
        email  = $googleStaffEmail
        name   = "Google FPT Staff"
        isMock = $true
    } | ConvertTo-Json

    $googleRes3 = Invoke-RestMethod -Uri "$baseUrl/api/auth/google" -Method Post -Body $googleBody3 -ContentType "application/json"

    $gRole3 = $googleRes3.user.role
    $gSid3 = $googleRes3.user.studentId

    Write-Host "  -> Role: '$gRole3', StudentId: '$gSid3'" -ForegroundColor White

    if ($gRole3 -eq "staff" -and [string]::IsNullOrEmpty($gSid3)) {
        Write-Host "  [PASS] Google SSO - Staff FPT detected correctly!" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Expected role='staff', got='$gRole3'" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  [FAIL] Google SSO error: $_" -ForegroundColor Red
    $allPassed = $false
}

# ============================================================
# FINAL SUMMARY
# ============================================================
Write-Host "`n$separator" -ForegroundColor Cyan
Write-Host " KET QUA TONG HOP:" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan

Write-Host "`n Logic phan biet role trong he thong:" -ForegroundColor White
Write-Host "  +---------------------------+------------------+-----------+" -ForegroundColor DarkGray
Write-Host "  | Loai Email                | Domain           | Role      |" -ForegroundColor DarkGray
Write-Host "  +---------------------------+------------------+-----------+" -ForegroundColor DarkGray
Write-Host "  | xxxDE180299@fpt.edu.vn    | fpt.edu.vn       | student   |" -ForegroundColor DarkGray
Write-Host "  | staffname@fe.edu.vn       | fe.edu.vn        | staff     |" -ForegroundColor DarkGray
Write-Host "  | staffname@fpt.edu.vn      | fpt.edu.vn       | staff     |" -ForegroundColor DarkGray
Write-Host "  | anyone@gmail.com          | gmail.com        | guest     |" -ForegroundColor DarkGray
Write-Host "  +---------------------------+------------------+-----------+" -ForegroundColor DarkGray

if ($allPassed) {
    Write-Host "`n  TAT CA 6/6 TEST PASSED!" -ForegroundColor Green
    Write-Host "  He thong PHAN BIET DUNG vai tro khi dang nhap:" -ForegroundColor Green
    Write-Host "    - Sinh vien FPT  -> role='student' + co studentId" -ForegroundColor Green
    Write-Host "    - Giang vien FPT -> role='staff'" -ForegroundColor Green
    Write-Host "    - Khach ngoai    -> role='guest'" -ForegroundColor Green
    Write-Host "    - Ca dang ky thuong va Google SSO deu hoat dong!" -ForegroundColor Green
} else {
    Write-Host "`n  CO TEST BI FAIL! Xem chi tiet ben tren." -ForegroundColor Red
}
Write-Host "`n$separator" -ForegroundColor Cyan
