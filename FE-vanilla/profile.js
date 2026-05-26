document.addEventListener('DOMContentLoaded', () => {
  // Mobile Sidebar Toggle elements
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // Mobile Sidebar toggle event
  if (menuToggle && sidebar && sidebarOverlay) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  }

  // Toast Notification function (matching login.js/app.js layout/behavior)
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Custom SVG icons matching standard design system
    const icon = type === 'success' ? `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ` : type === 'info' ? `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
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

  // Avatar upload change listener
  const avatarInput = document.getElementById('avatar-upload-input');
  const profileAvatarImg = document.getElementById('profile-avatar-img');
  const sidebarAvatar = document.querySelector('.sidebar-avatar');
  const navbarAvatar = document.querySelector('.navbar-user-avatar');

  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate image size & type
        if (!file.type.startsWith('image/')) {
          showToast('Vui lòng chỉ tải lên tệp ảnh!', 'error');
          return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          showToast('Kích thước ảnh tối đa là 5MB!', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          
          // Update all instances of avatar image on the page
          if (profileAvatarImg) profileAvatarImg.src = base64Data;
          if (sidebarAvatar) sidebarAvatar.src = base64Data;
          if (navbarAvatar) navbarAvatar.src = base64Data;
          
          showToast('Thay đổi ảnh đại diện tạm thời thành công!', 'success');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Interest tags dynamic toggling
  const interestCheckboxes = document.querySelectorAll('.interest-tag-checkbox input[type="checkbox"]');
  interestCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const tagLabel = e.target.closest('.interest-tag-checkbox');
      const tagName = tagLabel ? tagLabel.querySelector('.interest-tag-content span').textContent : '';
      if (e.target.checked) {
        showToast(`Đã thêm sở thích: ${tagName}`, 'info');
      } else {
        showToast(`Đã bỏ sở thích: ${tagName}`, 'info');
      }
    });
  });

  // Profile Edit Form Submit listener
  const profileForm = document.getElementById('profile-edit-form');
  const saveBtn = document.getElementById('save-btn');
  
  if (profileForm && saveBtn) {
    const btnText = saveBtn.querySelector('.btn-text');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');

    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Retrieve orientations & interests
      const orientationInput = document.getElementById('user-orientation');
      const selectedInterests = Array.from(interestCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.closest('.interest-tag-checkbox').querySelector('.interest-tag-content span').textContent);

      // Simple validation for Orientation
      if (!orientationInput || orientationInput.value.trim() === '') {
        showToast('Vui lòng nhập định hướng chuyên môn!', 'error');
        orientationInput.focus();
        return;
      }

      // Start simulating network saving
      saveBtn.disabled = true;
      if (btnText) btnText.classList.add('hidden');
      if (btnSpinner) btnSpinner.classList.remove('hidden');

      setTimeout(() => {
        // Reset save button state
        saveBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnSpinner) btnSpinner.classList.add('hidden');

        // Show premium success toast
        showToast('Cập nhật hồ sơ thành công! AI đang tối ưu hóa đề xuất sự kiện cho bạn.', 'success');

        // Output changes to console for developers
        console.log('Saved Profile:', {
          orientation: orientationInput.value.trim(),
          interests: selectedInterests
        });
      }, 1500);
    });
  }

  // Quick Action scan barcode button
  const scanBtn = document.querySelector('.btn-scan-aside');
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      showToast('Đang khởi động trình quét camera... Vui lòng chuẩn bị QR code sự kiện.', 'info');
    });
  }

  // Navigation warnings for other dashboard pages not implemented
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  menuItems.forEach(item => {
    // Exclude the current page (active) and the logout link
    if (!item.classList.contains('active') && !item.classList.contains('btn-logout')) {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const label = item.querySelector('span') ? item.querySelector('span').textContent : 'Tính năng';
        showToast(`Tính năng "${label}" đang được phát triển và liên kết hệ thống!`, 'info');
      });
    }
  });

  // Top Nav Notification Bell Mock Click
  const notifyBtn = document.querySelector('.btn-icon-nav');
  if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
      showToast('Không có thông báo mới nào dành cho bạn.', 'info');
    });
  }

  // Top Nav Search Input Mock Submission
  const searchInput = document.querySelector('.search-wrapper input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          showToast(`Đang tìm kiếm thông báo cho từ khóa: "${query}"...`, 'info');
          searchInput.value = '';
        } else {
          showToast('Vui lòng nhập từ khóa tìm kiếm!', 'error');
        }
      }
    });
  }

  // Password Visibility Toggle for Profile Change Password Card
  const passwordToggles = document.querySelectorAll('.profile-toggle-password');
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      
      const svg = toggle.querySelector('.eye-icon');
      const offPath = svg.querySelector('.eye-off-path');
      const offLine = svg.querySelector('.eye-off-line');
      const onPath = svg.querySelector('.eye-on-path');
      const onCircle = svg.querySelector('.eye-on-circle');

      if (input.type === 'password') {
        input.type = 'text';
        if (offPath) offPath.classList.add('hidden');
        if (offLine) offLine.classList.add('hidden');
        if (onPath) onPath.classList.remove('hidden');
        if (onCircle) onCircle.classList.remove('hidden');
        toggle.setAttribute('aria-label', 'Ẩn mật khẩu');
      } else {
        input.type = 'password';
        if (offPath) offPath.classList.remove('hidden');
        if (offLine) offLine.classList.remove('hidden');
        if (onPath) onPath.classList.add('hidden');
        if (onCircle) onCircle.classList.add('hidden');
        toggle.setAttribute('aria-label', 'Hiển thị mật khẩu');
      }
    });
  });

  // Change Password Form Submit handler
  const changePasswordForm = document.getElementById('change-password-form');
  const changePwBtn = document.getElementById('change-pw-btn');

  if (changePasswordForm && changePwBtn) {
    const btnText = changePwBtn.querySelector('.btn-text');
    const btnSpinner = changePwBtn.querySelector('.btn-spinner');

    changePasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentPasswordInput = document.getElementById('current-password');
      const newPasswordInput = document.getElementById('new-password');
      const confirmPasswordInput = document.getElementById('confirm-password');

      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Validate empty fields
      if (!currentPassword) {
        showToast('Vui lòng nhập mật khẩu hiện tại!', 'error');
        currentPasswordInput.focus();
        return;
      }

      if (!newPassword) {
        showToast('Vui lòng nhập mật khẩu mới!', 'error');
        newPasswordInput.focus();
        return;
      }

      // Validate new password length (minimum 6 characters)
      if (newPassword.length < 6) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
        newPasswordInput.focus();
        return;
      }

      // Validate new password doesn't match current password
      if (currentPassword === newPassword) {
        showToast('Mật khẩu mới không được trùng với mật khẩu hiện tại!', 'error');
        newPasswordInput.focus();
        return;
      }

      // Validate confirm password matches
      if (newPassword !== confirmPassword) {
        showToast('Xác nhận mật khẩu mới không khớp!', 'error');
        confirmPasswordInput.focus();
        return;
      }

      // Simulate loading state
      changePwBtn.disabled = true;
      if (btnText) btnText.classList.add('hidden');
      if (btnSpinner) btnSpinner.classList.remove('hidden');

      setTimeout(() => {
        // Reset save button state
        changePwBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnSpinner) btnSpinner.classList.add('hidden');

        // Show premium success toast
        showToast('Thay đổi mật khẩu thành công!', 'success');

        // Reset form inputs
        changePasswordForm.reset();

        // Restore input type back to password in case it was toggled
        [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
          input.type = 'password';
        });

        // Reset eye icons state back to eye-off visible
        passwordToggles.forEach(toggle => {
          const svg = toggle.querySelector('.eye-icon');
          const offPath = svg.querySelector('.eye-off-path');
          const offLine = svg.querySelector('.eye-off-line');
          const onPath = svg.querySelector('.eye-on-path');
          const onCircle = svg.querySelector('.eye-on-circle');

          if (offPath) offPath.classList.remove('hidden');
          if (offLine) offLine.classList.remove('hidden');
          if (onPath) onPath.classList.add('hidden');
          if (onCircle) onCircle.classList.add('hidden');
          toggle.setAttribute('aria-label', 'Hiển thị mật khẩu');
        });

        console.log('Password successfully changed (mocked).');
      }, 1500);
    });
  }

  // Sticky navbar or other scrolling layout interactions can be added here if needed
});

