document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  
  // Fields
  const email = document.getElementById('email');
  const password = document.getElementById('password');

  // Regex patterns
  const patterns = {
    // Standard email validator
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  };

  // Toggle Password Visibility
  function setupPasswordToggle(toggleId, inputId) {
    const toggleBtn = document.getElementById(toggleId);
    const inputField = document.getElementById(inputId);
    
    toggleBtn.addEventListener('click', () => {
      const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
      inputField.setAttribute('type', type);
      
      // Update eye icon SVG
      if (type === 'text') {
        toggleBtn.innerHTML = `
          <svg class="eye-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
        toggleBtn.setAttribute('aria-label', 'Ẩn mật khẩu');
      } else {
        toggleBtn.innerHTML = `
          <svg class="eye-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
        toggleBtn.setAttribute('aria-label', 'Hiển thị mật khẩu');
      }
    });
  }

  setupPasswordToggle('toggle-pw', 'password');

  // Input Validation Functions
  function validateField(input, pattern, groupName, customCheck = null) {
    const group = document.getElementById(`group-${groupName}`);
    let isValid = false;

    if (pattern) {
      isValid = pattern.test(input.value.trim());
    } else {
      isValid = input.value.trim() !== '';
    }

    if (isValid && customCheck) {
      isValid = customCheck();
    }

    if (isValid) {
      group.classList.remove('invalid');
      group.classList.add('valid');
    } else {
      group.classList.remove('valid');
      group.classList.add('invalid');
    }

    return isValid;
  }

  // Individual field validations
  function checkEmail() {
    return validateField(email, patterns.email, 'email', () => {
      // Bonus FPT recommendation warning
      const emailVal = email.value.trim().toLowerCase();
      const isFptEmail = emailVal.endsWith('@fpt.edu.vn') || emailVal.endsWith('@fe.edu.vn');
      const errorSpan = document.getElementById('error-email');
      
      if (!isFptEmail) {
        errorSpan.textContent = "Hệ thống khuyên dùng email FPT (@fpt.edu.vn)";
        errorSpan.style.color = "var(--primary)"; // Info state color
      } else {
        errorSpan.textContent = "Vui lòng nhập email hợp lệ";
        errorSpan.style.color = "var(--border-error)";
      }
      return true; // Keep valid even if not FPT email
    });
  }

  function checkPassword() {
    // Standard rule: password cannot be empty and must be at least 8 chars long
    return validateField(password, null, 'password', () => {
      return password.value.length >= 8;
    });
  }

  // Alert banner elements
  const loginAlert = document.getElementById('login-alert');
  const closeAlert = document.getElementById('close-alert');
  let alertTimeout;

  if (closeAlert) {
    closeAlert.addEventListener('click', () => {
      loginAlert.classList.add('hidden');
      if (alertTimeout) clearTimeout(alertTimeout);
    });
  }

  // Real-time Event Listeners
  email.addEventListener('input', () => {
    checkEmail();
    loginAlert.classList.add('hidden'); // Hide general alert when user updates email
    if (alertTimeout) clearTimeout(alertTimeout);
  });
  
  password.addEventListener('input', () => {
    checkPassword();
    loginAlert.classList.add('hidden'); // Hide general alert when user updates password
    if (alertTimeout) clearTimeout(alertTimeout);
    // Reset password error message back to default rules helper
    const pwError = document.getElementById('error-password');
    pwError.textContent = "Mật khẩu phải từ 8 ký tự trở lên";
  });

  // Toast Notification Trigger
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Check type for custom SVG icons
    const icon = type === 'success' ? `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ` : `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;

    toast.innerHTML = `
      ${icon}
      <span>${message}</span>
    `;
    
    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 4000);
  }

  // Form Submit Handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Trigger validations
    const isEmailValid = checkEmail();
    const isPasswordValid = checkPassword();

    const isFormValid = isEmailValid && isPasswordValid;

    if (!isFormValid) {
      // Shake any invalid groups
      document.querySelectorAll('.input-group.invalid').forEach(group => {
        group.classList.add('shake');
        setTimeout(() => {
          group.classList.remove('shake');
        }, 1000);
      });
      return;
    }

    // Success flow - mock network submission
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    loginAlert.classList.add('hidden');

    const emailValue = email.value.trim();
    const passwordValue = password.value.trim();

    setTimeout(() => {
      // Reset button state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');

      // Mock validation against credentials
      // Correct: admin@fpt.edu.vn / AdminPassword123!
      if (emailValue === 'admin@fpt.edu.vn' && passwordValue === 'AdminPassword123!') {
        // Show success notification
        showToast(`Đăng nhập thành công! Chào mừng bạn quay trở lại FPT Students Community.`, 'success');
        
        // Reset form fields
        form.reset();
        document.querySelectorAll('.input-group').forEach(group => {
          group.classList.remove('valid', 'invalid');
        });
      } else {
        // Show design-matched error layout
        loginAlert.classList.remove('hidden');
        
        // Auto-hide alert after 3 seconds
        if (alertTimeout) clearTimeout(alertTimeout);
        alertTimeout = setTimeout(() => {
          loginAlert.classList.add('hidden');
        }, 3000);
        
        const pwGroup = document.getElementById('group-password');
        pwGroup.classList.remove('valid');
        pwGroup.classList.add('invalid');
        
        const pwError = document.getElementById('error-password');
        pwError.textContent = "Mật khẩu không chính xác. Vui lòng thử lại.";
        
        // Shake password group
        pwGroup.classList.add('shake');
        setTimeout(() => {
          pwGroup.classList.remove('shake');
        }, 1000);
      }
    }, 1500);
  });

  // Mock SSO Login Buttons Click Handlers
  document.getElementById('feid-login').addEventListener('click', () => {
    showToast('Đang kết nối tài khoản FeID...', 'success');
  });

  document.getElementById('google-login').addEventListener('click', () => {
    showToast('Đang kết nối tài khoản Google...', 'success');
  });
});
