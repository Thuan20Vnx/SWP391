import React, { useCallback, useEffect, useRef, useState } from 'react';
import BannerCropModal from './ctsv/BannerCropModal';
import AvatarCropModal from './profile/AvatarCropModal';
import AppSelect from './ui/AppSelect';
import {
  CLUB_COVER_ASPECT_H,
  CLUB_COVER_ASPECT_LABEL,
  CLUB_COVER_ASPECT_W,
  CLUB_COVER_OUTPUT_HEIGHT,
  CLUB_COVER_OUTPUT_WIDTH,
} from '../constants/clubCover';
import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';
import { openImageFilePicker } from '../utils/imageFilePicker';
import ClubChairmanTransfer from './club/ClubChairmanTransfer';

const ACTIVITY_FIELDS = [
  'Học thuật & Công nghệ',
  'Kinh doanh & Khởi nghiệp',
  'Nghệ thuật & Sáng tạo',
  'Thể thao & Esports',
  'Văn hóa & Tình nguyện',
];

const SCALE_OPTIONS = [
  'Dưới 50 thành viên',
  '50 - 100 thành viên',
  '100 - 200 thành viên',
  'Trên 200 thành viên',
];

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80';

const compressDataUrl = (dataUrl, maxSize, quality = 0.82) =>
  new Promise((resolve, reject) => {
    if (!dataUrl?.startsWith('data:')) {
      resolve(dataUrl || '');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Không nén được ảnh'));
    img.src = dataUrl;
  });

const normalizeCoverPositionY = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(0, Math.round(parsed * 10) / 10));
};

const prepareProfileForSave = async (profile) => {
  let { coverImage, logoImage } = profile;
  const coverPositionY = normalizeCoverPositionY(profile.coverPositionY);

  if (coverImage?.startsWith('data:')) {
    coverImage = await compressDataUrl(coverImage, CLUB_COVER_OUTPUT_WIDTH, 0.85);
  }
  if (logoImage?.startsWith('data:')) {
    logoImage = await compressDataUrl(logoImage, 512, 0.85);
  }

  return {
    ...profile,
    coverImage,
    logoImage,
    coverPositionY,
  };
};

const emptyProfile = {
  name: '',
  shortName: '',
  activityField: '',
  foundedDate: '',
  scale: '',
  president: '',
  email: '',
  facebook: '',
  website: '',
  slogan: '',
  description: '',
  coverImage: '',
  coverPositionY: 50,
  logoImage: '',
};

const toDateInputValue = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return value;
};

const mapClubToForm = (club) => ({
  name: club.name || '',
  shortName: club.shortName || club.logoText || '',
  activityField: club.activityField || club.category || '',
  foundedDate: toDateInputValue(club.foundedDate || club.founded || ''),
  scale: club.scale || '',
  president: club.president || '',
  email: club.email || '',
  facebook: club.facebook || '',
  website: club.website || '',
  slogan: club.slogan || '',
  description: club.description || '',
  coverImage: club.coverImage || '',
  coverPositionY: normalizeCoverPositionY(club.coverPositionY),
  logoImage: club.logoImage || '',
});

const ProfileValue = ({ label, value, span2 }) => (
  <div className={`clb-profile-field clb-profile-field--view${span2 ? ' clb-profile-field--span-2' : ''}`}>
    <span className="clb-profile-field__label">{label}</span>
    <p className="clb-profile-value">{value?.trim() ? value : 'Chưa cập nhật'}</p>
  </div>
);

const ProfileCoverSection = ({
  data,
  isEditing,
  isDraggingCover,
  coverInputRef,
  logoInputRef,
  onCoverPointerDown,
  onCoverPointerMove,
  onCoverPointerUp,
  onCoverFileChange,
  onLogoFileChange,
  onRecropCover,
}) => (
  <section className={`clb-profile-visual${isEditing ? ' clb-profile-visual--edit' : ''}`}>
    <div
      className={`clb-profile-cover-wrap${isEditing ? ' clb-profile-cover-wrap--editable' : ''}`}
    >
      <img
        src={data.coverImage || DEFAULT_COVER}
        alt="Ảnh bìa CLB"
        className="clb-profile-cover"
        draggable={false}
      />
      {isEditing && (
        <>
          <button
            type="button"
            className="clb-profile-cover-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRecropCover?.();
            }}
          >
            Chỉnh sửa khung ảnh
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            hidden
            onChange={onCoverFileChange}
          />
        </>
      )}
    </div>

    <div className="clb-profile-avatar-wrap">
      <div className="clb-profile-avatar">
        {data.logoImage ? (
          <img src={data.logoImage} alt="Logo CLB" />
        ) : (
          <span className="clb-profile-avatar__fallback">
            {data.shortName?.[0] || data.name?.[0] || 'C'}
          </span>
        )}
      </div>
      {isEditing && (
        <>
          <button
            type="button"
            className="clb-profile-avatar-edit"
            onClick={() => logoInputRef.current?.click()}
            aria-label="Đổi ảnh đại diện CLB"
          >
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                fill="currentColor"
              />
            </svg>
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            hidden
            onChange={onLogoFileChange}
          />
        </>
      )}
    </div>
  </section>
);

const ClubProfileUpdate = ({ showToast }) => {
  const [form, setForm] = useState(emptyProfile);
  const [savedForm, setSavedForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const coverInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const coverDragRef = useRef({ active: false, startY: 0, startPos: 50 });
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState('');
  const [bannerCropFileName, setBannerCropFileName] = useState('');
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState('');
  const [logoCropFileName, setLogoCropFileName] = useState('');
  const [savingMedia, setSavingMedia] = useState(false);

  const syncSavedClub = (club, payload = {}) => {
    const mapped = mapClubToForm(club);
    const synced = {
      ...mapped,
      coverImage: payload.coverImage ?? mapped.coverImage,
      logoImage: payload.logoImage ?? mapped.logoImage,
      coverPositionY: normalizeCoverPositionY(payload.coverPositionY ?? mapped.coverPositionY),
    };
    setForm(synced);
    setSavedForm(synced);
    return synced;
  };

  const saveProfilePatch = async (patch, successMessage) => {
    setSavingMedia(true);
    try {
      const payload = await prepareProfileForSave({ ...form, ...patch });
      const body = {};
      if (patch.coverImage !== undefined) {
        body.coverImage = payload.coverImage;
        body.coverPositionY = payload.coverPositionY;
      }
      if (patch.logoImage !== undefined) {
        body.logoImage = payload.logoImage;
      }
      const res = await fetch(`${API_BASE}/api/clubs/manage/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify(body),
      });
      const { ok, data } = await parseApiResponse(res);
      if (ok && data.success && data.club) {
        syncSavedClub(data.club, payload);
        showToast(successMessage, 'success');
        return true;
      }
      showToast(data.message || 'Lưu ảnh thất bại.', 'error');
      return false;
    } catch {
      showToast('Lỗi kết nối server.', 'error');
      return false;
    } finally {
      setSavingMedia(false);
    }
  };

  const loadProfile = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE}/api/clubs/manage/profile`, {
        headers: getAuthHeaders(false),
        signal,
      });
      const { ok, data } = await parseApiResponse(res);
      if (ok && data.success && data.club) {
        const mapped = mapClubToForm(data.club);
        setForm(mapped);
        setSavedForm(mapped);
      } else if (res.status === 404) {
        const msg = 'Backend chưa có API mới. Hãy restart server BE (npm run dev).';
        setLoadError(msg);
        showToast(msg, 'error');
      } else {
        const msg = data.message || 'Không tải được hồ sơ CLB.';
        setLoadError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const msg = 'Không kết nối được server.';
        setLoadError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    loadProfile(controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openBannerCrop = (src, name = 'club-cover.jpg') => {
    if (!src) return;
    setBannerCropSrc(src);
    setBannerCropFileName(name);
    setBannerCropOpen(true);
  };

  const openLogoCrop = (src, name = 'club-logo.jpg') => {
    if (!src) return;
    setLogoCropSrc(src);
    setLogoCropFileName(name);
    setLogoCropOpen(true);
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const dataUrl = await openImageFilePicker(file, {
      onError: (msg) => msg && showToast(msg, 'error'),
    });
    if (dataUrl) openBannerCrop(dataUrl, file?.name);
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const dataUrl = await openImageFilePicker(file, {
      onError: (msg) => msg && showToast(msg, 'error'),
    });
    if (dataUrl) openLogoCrop(dataUrl, file?.name);
  };

  const onBannerCropConfirm = async (dataUrl) => {
    setBannerCropOpen(false);
    setBannerCropSrc('');
    if (!dataUrl) {
      showToast('Không xử lý được ảnh bìa. Vui lòng thử lại.', 'error');
      return;
    }
    const next = { coverImage: dataUrl, coverPositionY: 50 };
    setForm((prev) => ({ ...prev, ...next }));
    await saveProfilePatch(
      next,
      `Đã lưu ảnh bìa (${CLUB_COVER_ASPECT_LABEL}).`
    );
  };

  const onLogoCropConfirm = async (dataUrl) => {
    setLogoCropOpen(false);
    setLogoCropSrc('');
    if (!dataUrl) {
      showToast('Không xử lý được logo. Vui lòng thử lại.', 'error');
      return;
    }
    const next = { logoImage: dataUrl };
    setForm((prev) => ({ ...prev, ...next }));
    await saveProfilePatch(next, 'Đã lưu logo CLB.');
  };

  const handleCoverPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('.clb-profile-cover-btn')) return;
    coverDragRef.current = {
      active: true,
      startY: e.clientY,
      startPos: form.coverPositionY ?? 50,
    };
    setIsDraggingCover(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCoverPointerMove = (e) => {
    if (!coverDragRef.current.active) return;
    const delta = e.clientY - coverDragRef.current.startY;
    const next = Math.min(100, Math.max(0, coverDragRef.current.startPos - delta * 0.35));
    updateField('coverPositionY', Math.round(next * 10) / 10);
  };

  const handleCoverPointerUp = (e) => {
    if (!coverDragRef.current.active) return;
    coverDragRef.current.active = false;
    setIsDraggingCover(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleRecropCover = () => {
    const src = form.coverImage;
    if (!src || src === DEFAULT_COVER) {
      coverInputRef.current?.click();
      return;
    }
    openBannerCrop(src, bannerCropFileName || 'club-cover.jpg');
  };

  const handleCancelEdit = () => {
    setForm(savedForm);
    setIsEditing(false);
    showToast('Đã hủy chỉnh sửa.', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên đầy đủ câu lạc bộ.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = await prepareProfileForSave(form);
      // Ảnh bìa/logo được lưu riêng qua saveProfilePatch khi upload. Lưu hồ sơ
      // (text) KHÔNG gửi coverImage/logoImage để tránh ghi đè giá trị hiển thị
      // (URL endpoint) lên field gốc trong DB, làm mất ảnh.
      const { coverImage, logoImage, ...textPayload } = payload;
      const res = await fetch(`${API_BASE}/api/clubs/manage/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          ...textPayload,
          logoText: textPayload.shortName,
        }),
      });
      const { ok, data } = await parseApiResponse(res);
      if (ok && data.success) {
        syncSavedClub(data.club, payload);
        setIsEditing(false);
        showToast('Đã lưu hồ sơ CLB.', 'success');
      } else {
        showToast(data.message || 'Lưu hồ sơ thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAiIntro = () => {
    const generated =
      `${form.shortName || 'CLB'} là cộng đồng sinh viên năng động tại FPT University, nơi kết nối đam mê và tạo ra những giá trị thực tế qua các hoạt động học thuật, sự kiện và dự án cộng đồng.`;
    updateField('description', generated);
    showToast('Đã tạo gợi ý giới thiệu. Bạn có thể chỉnh sửa trước khi lưu.', 'info');
  };

  if (loading) {
    return (
      <div className="clb-profile-view">
        <p className="clb-profile-loading">Đang tải hồ sơ CLB...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="clb-profile-view">
        <p className="clb-profile-loading">{loadError}</p>
        <button type="button" className="clb-btn-primary" onClick={() => loadProfile()}>
          Thử tải lại
        </button>
      </div>
    );
  }

  const display = isEditing ? form : savedForm;

  return (
    <div className="clb-profile-view">
      <div className="clb-profile-topbar">
        <nav className="clb-profile-breadcrumb" aria-label="Breadcrumb">
          <span>Quản lý CLB</span>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" />
          </svg>
          <span className="clb-profile-breadcrumb__current">Hồ sơ CLB</span>
        </nav>
      </div>

      <header className="clb-profile-header clb-profile-header--row">
        <div>
          <h1 className="clb-profile-title">HỒ SƠ CÂU LẠC BỘ</h1>
          <p className="clb-profile-desc">
            {isEditing
              ? 'Chỉnh sửa thông tin hiển thị công khai trên trang danh sách CLB của sinh viên.'
              : 'Xem hồ sơ công khai của câu lạc bộ. Bấm "Chỉnh sửa hồ sơ" khi cần cập nhật.'}
          </p>
        </div>
        {!isEditing && (
          <button type="button" className="clb-profile-edit-btn" onClick={() => setIsEditing(true)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                fill="currentColor"
              />
            </svg>
            Chỉnh sửa hồ sơ
          </button>
        )}
      </header>

      {!isEditing ? (
        <>
        <div className="clb-profile-form">
          <ProfileCoverSection data={display} isEditing={false} />

          {display.slogan && (
            <p className="clb-profile-slogan-view">&ldquo;{display.slogan}&rdquo;</p>
          )}

          <section className="clb-profile-card">
            <h2>Thông tin chung</h2>
            <div className="clb-profile-grid clb-profile-grid--3">
              <ProfileValue label="Tên đầy đủ Câu lạc bộ" value={display.name} span2 />
              <ProfileValue label="Tên viết tắt" value={display.shortName} />
              <ProfileValue label="Lĩnh vực hoạt động" value={display.activityField} />
              <ProfileValue label="Ngày thành lập" value={formatDisplayDate(display.foundedDate)} />
              <ProfileValue label="Quy mô" value={display.scale} />
            </div>
          </section>

          <section className="clb-profile-card">
            <h2>Ban điều hành &amp; Trạng thái</h2>
            <ProfileValue label="Chủ nhiệm CLB" value={display.president} />
          </section>

          <section className="clb-profile-card">
            <h2>Thông tin Liên hệ &amp; Mạng xã hội</h2>
            <div className="clb-profile-grid clb-profile-grid--2">
              <ProfileValue label="Email CLB" value={display.email} span2 />
              <ProfileValue label="Facebook Fanpage" value={display.facebook} />
              <ProfileValue label="Website" value={display.website} />
            </div>
          </section>

          <section className="clb-profile-card">
            <h2>Giới thiệu</h2>
            <p className="clb-profile-value clb-profile-value--block">
              {display.description?.trim() ? display.description : 'Chưa cập nhật'}
            </p>
          </section>
        </div>
        <ClubChairmanTransfer showToast={showToast} compact onTransferred={() => window.location.reload()} />
        </>
      ) : (
        <form className="clb-profile-form" onSubmit={handleSubmit}>
          <ProfileCoverSection
            data={form}
            isEditing
            isDraggingCover={isDraggingCover}
            coverInputRef={coverInputRef}
            logoInputRef={logoInputRef}
            onCoverPointerDown={handleCoverPointerDown}
            onCoverPointerMove={handleCoverPointerMove}
            onCoverPointerUp={handleCoverPointerUp}
            onCoverFileChange={handleCoverFileChange}
            onLogoFileChange={handleLogoFileChange}
            onRecropCover={handleRecropCover}
          />

          <section className="clb-profile-card">
            <h2>Thông tin chung</h2>
            <div className="clb-profile-grid clb-profile-grid--3">
              <div className="clb-profile-field clb-profile-field--span-2">
                <label htmlFor="club-name">Tên đầy đủ Câu lạc bộ</label>
                <input
                  id="club-name"
                  type="text"
                  className="clb-input"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="clb-profile-field">
                <label htmlFor="club-short">Tên viết tắt</label>
                <input
                  id="club-short"
                  type="text"
                  className="clb-input"
                  value={form.shortName}
                  onChange={(e) => updateField('shortName', e.target.value)}
                />
              </div>
              <div className="clb-profile-field">
                <label htmlFor="club-activity">Lĩnh vực hoạt động</label>
                <AppSelect
                  id="club-activity"
                  value={form.activityField}
                  onChange={(e) => updateField('activityField', e.target.value)}
                  options={ACTIVITY_FIELDS}
                  placeholder="Chọn lĩnh vực"
                />
              </div>
              <div className="clb-profile-field">
                <label htmlFor="club-founded">Ngày thành lập</label>
                <input
                  id="club-founded"
                  type="date"
                  className="clb-input clb-input--date"
                  value={form.foundedDate}
                  onChange={(e) => updateField('foundedDate', e.target.value)}
                />
              </div>
              <div className="clb-profile-field">
                <label htmlFor="club-scale">Quy mô</label>
                <AppSelect
                  id="club-scale"
                  value={form.scale}
                  onChange={(e) => updateField('scale', e.target.value)}
                  options={SCALE_OPTIONS}
                  placeholder="Chọn quy mô"
                />
              </div>
            </div>
          </section>

          <section className="clb-profile-card">
            <h2>Ban điều hành &amp; Trạng thái</h2>
            <div className="clb-profile-field">
              <label htmlFor="club-president">Chủ nhiệm CLB</label>
              <input
                id="club-president"
                type="text"
                className="clb-input"
                value={form.president}
                onChange={(e) => updateField('president', e.target.value)}
              />
            </div>
          </section>

          <section className="clb-profile-card">
            <h2>Thông tin Liên hệ &amp; Mạng xã hội</h2>
            <div className="clb-profile-grid clb-profile-grid--2">
              <div className="clb-profile-field clb-profile-field--span-2">
                <label htmlFor="club-email">Email CLB</label>
                <div className="clb-profile-input-icon">
                  <input
                    id="club-email"
                    type="email"
                    className="clb-input"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
              <div className="clb-profile-field">
                <label htmlFor="club-facebook">Facebook Fanpage</label>
                <div className="clb-profile-input-icon">
                  <input
                    id="club-facebook"
                    type="text"
                    className="clb-input"
                    placeholder="fb.com/fudever"
                    value={form.facebook}
                    onChange={(e) => updateField('facebook', e.target.value)}
                  />
                  <span className="clb-profile-input-icon__glyph">f</span>
                </div>
              </div>
              <div className="clb-profile-field">
                <label htmlFor="club-website">Website</label>
                <div className="clb-profile-input-icon">
                  <input
                    id="club-website"
                    type="url"
                    className="clb-input"
                    placeholder="https://fudever.com"
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                  />
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.34.16-2h4.68c.09.66.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <section className="clb-profile-card">
            <h2>Nhận diện &amp; Giới thiệu</h2>
            <div className="clb-profile-field">
              <label htmlFor="club-slogan">Slogan</label>
              <input
                id="club-slogan"
                type="text"
                className="clb-input"
                placeholder="Code your dream, build your future"
                value={form.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
              />
            </div>
            <div className="clb-profile-field">
              <div className="clb-profile-textarea-head">
                <label htmlFor="club-description">Giới thiệu chi tiết</label>
                <button type="button" className="clb-profile-ai-btn" onClick={handleAiIntro}>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path
                      d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6L12 2z"
                      fill="currentColor"
                    />
                  </svg>
                  AI Viết lời giới thiệu
                </button>
              </div>
              <textarea
                id="club-description"
                className="clb-input clb-textarea clb-profile-textarea"
                rows={6}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
          </section>

          <div className="clb-profile-actions">
            <button type="button" className="clb-btn-secondary" onClick={handleCancelEdit} disabled={saving}>
              Hủy chỉnh sửa
            </button>
            <button type="submit" className="clb-btn-primary clb-profile-save-btn" disabled={saving}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
                  fill="currentColor"
                />
              </svg>
              {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      )}

      <BannerCropModal
        open={bannerCropOpen}
        imageSrc={bannerCropSrc}
        fileName={bannerCropFileName}
        aspectWidth={CLUB_COVER_ASPECT_W}
        aspectHeight={CLUB_COVER_ASPECT_H}
        outputWidth={CLUB_COVER_OUTPUT_WIDTH}
        outputHeight={CLUB_COVER_OUTPUT_HEIGHT}
        onConfirm={onBannerCropConfirm}
        onCancel={() => {
          setBannerCropOpen(false);
          setBannerCropSrc('');
        }}
      />

      <AvatarCropModal
        open={logoCropOpen}
        imageSrc={logoCropSrc}
        fileName={logoCropFileName}
        onConfirm={onLogoCropConfirm}
        onCancel={() => {
          setLogoCropOpen(false);
          setLogoCropSrc('');
        }}
      />
    </div>
  );
};

export default ClubProfileUpdate;
