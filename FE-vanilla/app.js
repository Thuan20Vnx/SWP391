document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const submitBtn = document.getElementById('signup-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  
  // Fields
  const fullname = document.getElementById('fullname');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirm-password');
  const termsCheckbox = document.getElementById('terms-checkbox');

  // Regex patterns
  const patterns = {
    // Allows Vietnamese diacritics, letters, spaces. Minimum 5 chars.
    fullname: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơư\s]{5,50}$/,
    // Standard email validator
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    // Vietnamese phone number (10 digits starting with 0)
    phone: /^0[3|5|7|8|9][0-9]{8}$/,
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
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
  setupPasswordToggle('toggle-confirm-pw', 'confirm-password');

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
  function checkFullName() {
    return validateField(fullname, patterns.fullname, 'fullname', () => {
      // Check if it contains at least two words (first and last name)
      const nameParts = fullname.value.trim().split(/\s+/);
      return nameParts.length >= 2;
    });
  }

  function checkEmail() {
    return validateField(email, patterns.email, 'email', () => {
      // Bonus warning/info for FPT Student Email format
      const emailVal = email.value.trim().toLowerCase();
      const isFptEmail = emailVal.endsWith('@fpt.edu.vn') || emailVal.endsWith('@fe.edu.vn');
      const errorSpan = document.getElementById('error-email');
      
      if (!isFptEmail) {
        errorSpan.textContent = "Hệ thống khuyên dùng email FPT (@fpt.edu.vn)";
        errorSpan.style.color = "var(--primary)"; // Info state color
      } else {
        errorSpan.textContent = "Vui lòng nhập email hợp lệ (ví dụ: student@fpt.edu.vn)";
        errorSpan.style.color = "var(--border-error)";
      }
      return true; // Always return true here because non-FPT email is still valid, just warns
    });
  }

  function checkPhone() {
    return validateField(phone, patterns.phone, 'phone');
  }

  function checkPassword() {
    return validateField(password, patterns.password, 'password');
  }

  function checkConfirmPassword() {
    return validateField(confirmPassword, null, 'confirm-password', () => {
      return confirmPassword.value === password.value;
    });
  }

  function checkTerms() {
    const group = termsCheckbox.closest('.checkbox-group');
    const isValid = termsCheckbox.checked;
    if (isValid) {
      group.classList.remove('invalid');
    } else {
      group.classList.add('invalid');
    }
    return isValid;
  }

  // Real-time Event Listeners
  fullname.addEventListener('input', checkFullName);
  email.addEventListener('input', checkEmail);
  phone.addEventListener('input', checkPhone);
  password.addEventListener('input', () => {
    checkPassword();
    if (confirmPassword.value) checkConfirmPassword();
  });
  confirmPassword.addEventListener('input', checkConfirmPassword);
  termsCheckbox.addEventListener('change', checkTerms);

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

    // Trigger all validations
    const isNameValid = checkFullName();
    const isEmailValid = checkEmail();
    const isPhoneValid = checkPhone();
    const isPasswordValid = checkPassword();
    const isConfirmValid = checkConfirmPassword();
    const isTermsValid = checkTerms();

    const isFormValid = isNameValid && isEmailValid && isPhoneValid && isPasswordValid && isConfirmValid && isTermsValid;

    if (!isFormValid) {
      // Shake any invalid groups
      document.querySelectorAll('.input-group.invalid, .checkbox-group.invalid').forEach(group => {
        group.classList.add('shake');
        // Remove shake class after animation completes
        setTimeout(() => {
          group.classList.remove('shake');
        }, 3000);
      });
      
      showToast('Vui lòng kiểm tra lại các trường thông tin lỗi!', 'error');
      return;
    }

    // Success flow - mock network submission
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    setTimeout(() => {
      // Reset button state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');

      // Show success notification
      showToast(`Đăng ký thành công! Chào mừng ${fullname.value.trim()} gia nhập FPT Students Community.`, 'success');
      
      // Reset form fields
      form.reset();
      document.querySelectorAll('.input-group').forEach(group => {
        group.classList.remove('valid', 'invalid');
      });
    }, 1800);
  });

  // Mock SSO Login Buttons Click Handlers
  document.getElementById('google-login').addEventListener('click', () => {
    showToast('Đang kết nối tài khoản Google...', 'success');
  });

  document.getElementById('microsoft-login').addEventListener('click', () => {
    showToast('Đang kết nối tài khoản Microsoft FPT...', 'success');
  });
});
