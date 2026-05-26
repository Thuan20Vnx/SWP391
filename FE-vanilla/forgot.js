document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form');
  const contact = document.getElementById('contact');
  const submitBtn = document.getElementById('forgot-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  
  const snackbar = document.getElementById('success-snackbar');
  const closeSnackbar = document.getElementById('close-snackbar');

  // Timer variable
  let countdownInterval;
  let isCounting = false;

  // Regex patterns
  const patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^0[3|5|7|8|9][0-9]{8}$/
  };

  // Close snackbar handler
  if (closeSnackbar) {
    closeSnackbar.addEventListener('click', () => {
      snackbar.classList.add('hidden');
    });
  }

  // Real-time input listener
  contact.addEventListener('input', () => {
    checkContact();
    snackbar.classList.add('hidden'); // Hide success message when typing again
  });

  // Validation function
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

  // Check if input is a valid Email or Vietnamese Phone number
  function checkContact() {
    const value = contact.value.trim();
    if (value === '') {
      return validateField(contact, null, 'contact');
    }
    
    // Check email format first, then phone format
    const isEmail = patterns.email.test(value);
    const isPhone = patterns.phone.test(value);
    
    const group = document.getElementById('group-contact');
    const isValid = isEmail || isPhone;

    if (isValid) {
      group.classList.remove('invalid');
      group.classList.add('valid');
    } else {
      group.classList.remove('valid');
      group.classList.add('invalid');
    }

    return isValid;
  }

  // Toast Notification
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
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

    if (isCounting) return; // Prevent double submit when counting down

    // Trigger validation
    const isValid = checkContact();

    if (!isValid) {
      const group = document.getElementById('group-contact');
      group.classList.add('shake');
      setTimeout(() => {
        group.classList.remove('shake');
      }, 1000);
      showToast('Vui lòng nhập Email hoặc Số điện thoại hợp lệ!', 'error');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    snackbar.classList.add('hidden');

    const contactVal = contact.value.trim();

    setTimeout(() => {
      // Mock network success response
      btnSpinner.classList.add('hidden');
      btnText.classList.remove('hidden');

      // Show Figma success snackbar
      snackbar.classList.remove('hidden');
      
      // Setup dynamic snackbar text based on input type (Email or Phone)
      const msgSpan = snackbar.querySelector('.snackbar-message');
      if (patterns.phone.test(contactVal)) {
        msgSpan.textContent = "Mã OTP đã được gửi đến số điện thoại của bạn!";
      } else {
        msgSpan.textContent = "Mã OTP đã được gửi đến email của bạn!";
      }

      // Start 60-second countdown
      startCountdown(60);
      showToast('Yêu cầu gửi mã xác nhận thành công!', 'success');
    }, 1500);
  });

  // Countdown timer function
  function startCountdown(seconds) {
    isCounting = true;
    contact.disabled = true; // Lock field input during countdown
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-countdown');

    let count = seconds;
    btnText.textContent = `Đã gửi mã (${count}s)`;

    countdownInterval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownInterval);
        isCounting = false;
        contact.disabled = false;
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-countdown');
        btnText.textContent = "Gửi mã xác nhận";
      } else {
        btnText.textContent = `Đã gửi mã (${count}s)`;
      }
    }, 1000);
  }
});
