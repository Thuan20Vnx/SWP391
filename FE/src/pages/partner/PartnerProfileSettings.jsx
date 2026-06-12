import React, { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import AvatarCropModal from '../../components/profile/AvatarCropModal';

import defaultAvatar from '../../constants/defaultAvatar';

import { cacheUserProfile } from '../../hooks/useUserProfile';

import {

  changePartnerPassword,

  fetchPartnerMe,

  fetchPartnerUserProfile,

  loadPartnerNotificationPrefs,

  mapCompanyFormToPartnerPatch,

  mapPartnerToCompanyForm,

  savePartnerCompanyProfile,

  savePartnerNotificationPrefs,

  updatePartnerLogo,

  updatePartnerMe,

  updatePartnerUserProfile

} from '../../services/partnerApi';

import { dispatchAuthChanged } from '../../utils/authEvents';

import { resolveUserAvatar } from '../../utils/image';

import { updateUserAvatar } from '../../utils/profileApi';

import {

  PARTNER_STATUS_LABEL,

  PARTNER_STATUS_TONE

} from '../../utils/partnerDisplay';



const NOTIFICATION_OPTIONS = [

  {

    key: 'proposalUpdates',

    label: 'Cập nhật duyệt đề xuất',

    desc: 'Thông báo khi CTSV phê duyệt hoặc từ chối đề xuất sự kiện'

  },

  {

    key: 'monthlyReportEmail',

    label: 'Báo cáo định kỳ qua email',

    desc: 'Nhận báo cáo hiệu suất và doanh thu tài trợ hàng tháng'

  },

  {

    key: 'newReviewAlerts',

    label: 'Đánh giá mới từ sinh viên',

    desc: 'Thông báo khi có đánh giá mới sau sự kiện bạn tài trợ'

  }

];



const PartnerToggle = ({ checked, onChange, label, desc }) => (

  <div className="partner-toggle-row">

    <div className="partner-toggle-row__text">

      <span className="partner-toggle-row__label">{label}</span>

      <span className="partner-toggle-row__desc">{desc}</span>

    </div>

    <label className="partner-toggle">

      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />

      <span className="partner-toggle__slider" />

    </label>

  </div>

);



const IconChevronDown = () => (

  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>

    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />

  </svg>

);



const PartnerProfileCollapseSection = ({ id, title, desc, open, onToggle, children }) => (

  <section className="partner-profile-card partner-profile-card--collapse">

    <button

      type="button"

      className="partner-profile-collapse-toggle"

      aria-expanded={open}

      aria-controls={id}

      onClick={onToggle}

    >

      <div className="partner-profile-collapse-toggle-main">

        <h2 className="partner-profile-card__title">{title}</h2>

        {desc && <p className="partner-profile-card__desc partner-profile-card__desc--toggle">{desc}</p>}

      </div>

      <span className={`partner-profile-collapse-chevron${open ? ' is-open' : ''}`} aria-hidden>

        <IconChevronDown />

      </span>

    </button>

    <div id={id} className={`partner-profile-collapse-panel${open ? ' is-open' : ''}`}>

      <div className="partner-profile-collapse-panel-inner">{children}</div>

    </div>

  </section>

);



const EMPTY_COMPANY = {

  companyName: '',

  taxId: '',

  representative: '',

  email: '',

  phone: '',

  address: '',

  logo: ''

};



const EMPTY_USER = {

  fullname: '',

  email: '',

  phone: '',

  avatar: ''

};



const normalizeCompany = (data = {}) => ({

  ...EMPTY_COMPANY,

  ...data,

  companyName: data.companyName ?? '',

  taxId: data.taxId ?? '',

  representative: data.representative ?? '',

  email: data.email ?? '',

  phone: data.phone ?? '',

  address: data.address ?? '',

  logo: data.logo ?? ''

});



const normalizeUser = (data = {}) => ({

  ...EMPTY_USER,

  ...data,

  fullname: data.fullname ?? '',

  email: data.email ?? '',

  phone: data.phone ?? '',

  avatar: data.avatar ?? ''

});



const canEditPartnerProfile = (partner) =>

  partner && ['approved', 'info_requested'].includes(partner.status);



const PartnerProfileSettings = ({ showToast }) => {

  const userAvatarInputRef = useRef(null);

  const companyLogoInputRef = useRef(null);

  const isGoogleLogin = localStorage.getItem('loginMethod') === 'google';



  const [user, setUser] = useState(() => normalizeUser({ fullname: localStorage.getItem('userFullname') || '' }));

  const [company, setCompany] = useState(() => normalizeCompany(mapPartnerToCompanyForm(null)));

  const [notifications, setNotifications] = useState(() => loadPartnerNotificationPrefs());

  const [partnerRecord, setPartnerRecord] = useState(null);

  const [profileLoading, setProfileLoading] = useState(true);

  const [savingUser, setSavingUser] = useState(false);

  const [savingCompany, setSavingCompany] = useState(false);

  const [savingNotify, setSavingNotify] = useState(false);

  const [logoSaving, setLogoSaving] = useState(false);



  const [pwForm, setPwForm] = useState({

    currentPassword: '',

    newPassword: '',

    confirmPassword: ''

  });

  const [pwLoading, setPwLoading] = useState(false);



  const [cropOpen, setCropOpen] = useState(false);

  const [cropSrc, setCropSrc] = useState('');

  const [cropFileName, setCropFileName] = useState('');

  const [cropTarget, setCropTarget] = useState(null);

  const [sectionOpen, setSectionOpen] = useState({

    company: false,

    security: false,

    notifications: false

  });



  const toggleSection = (key) => {

    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  };



  useEffect(() => {

    setNotifications(loadPartnerNotificationPrefs());

    setProfileLoading(true);



    Promise.all([

      fetchPartnerUserProfile().catch(() => null),

      fetchPartnerMe({ includeLogo: true }).catch(() => ({ partner: null }))

    ])

      .then(([userRes, partnerRes]) => {

        if (userRes?.user) {

          setUser(

            normalizeUser({

              fullname: userRes.user.fullname || '',

              email: userRes.user.email || '',

              phone: userRes.user.phone || '',

              avatar: resolveUserAvatar(userRes.user, '')

            })

          );

        }

        setPartnerRecord(partnerRes?.partner || null);

        setCompany(normalizeCompany(mapPartnerToCompanyForm(partnerRes?.partner)));

      })

      .finally(() => setProfileLoading(false));

  }, []);



  const handleCompanyChange = (field, value) => {

    setCompany((prev) => ({ ...prev, [field]: value }));

  };



  const handleUserChange = (field, value) => {

    setUser((prev) => ({ ...prev, [field]: value }));

  };



  const openImagePicker = (target) => {

    setCropTarget(target);

    if (target === 'user') userAvatarInputRef.current?.click();

    else companyLogoInputRef.current?.click();

  };



  const handleImageUpload = (e) => {

    const file = e.target.files?.[0];

    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {

      showToast?.('Vui lòng chọn file ảnh (PNG, JPG).', 'error');

      return;

    }

    if (file.size > 5 * 1024 * 1024) {

      showToast?.('Kích thước ảnh tối đa là 5MB.', 'error');

      return;

    }

    const reader = new FileReader();

    reader.onload = () => {

      setCropSrc(reader.result);

      setCropFileName(file.name);

      setCropOpen(true);

    };

    reader.onerror = () => showToast?.('Không thể đọc tệp ảnh.', 'error');

    reader.readAsDataURL(file);

  };



  const handleCropCancel = () => {

    setCropOpen(false);

    setCropSrc('');

    setCropFileName('');

    setCropTarget(null);

  };



  const persistCompanyLogo = async (dataUrl) => {

    setLogoSaving(true);

    try {

      if (canEditPartnerProfile(partnerRecord)) {

        const result = await updatePartnerLogo(dataUrl);

        const nextLogo = result.partner?.logo || dataUrl;

        setPartnerRecord(result.partner || partnerRecord);

        setCompany((prev) => {

          const next = { ...prev, logo: nextLogo };

          savePartnerCompanyProfile(next);

          return next;

        });

        showToast?.('Đã lưu logo công ty.', 'success');

      } else {

        setCompany((prev) => {

          const next = { ...prev, logo: dataUrl };

          savePartnerCompanyProfile(next);

          return next;

        });

        showToast?.('Đã cập nhật logo cục bộ — lưu hồ sơ khi được duyệt.', 'info');

      }

    } catch (err) {

      setCompany((prev) => {

        const next = { ...prev, logo: dataUrl };

        savePartnerCompanyProfile(next);

        return next;

      });

      showToast?.(err.message || 'Không lưu được logo lên server. Đã giữ bản cục bộ.', 'error');

    } finally {

      setLogoSaving(false);

    }

  };



  const persistUserAvatar = async (dataUrl) => {

    setSavingUser(true);

    try {

      const data = await updateUserAvatar(dataUrl);

      const nextAvatar = resolveUserAvatar(data.user, dataUrl);

      setUser((prev) => ({ ...prev, avatar: nextAvatar }));

      cacheUserProfile({

        fullname: data.user?.fullname || user.fullname,

        course: data.user?.course || '',

        role: data.user?.role || 'partner',

        picture: nextAvatar

      });

      if (data.user?.fullname) {

        localStorage.setItem('userFullname', data.user.fullname);

      }

      dispatchAuthChanged();

      showToast?.('Đã cập nhật ảnh đại diện.', 'success');

    } catch (err) {

      showToast?.(err.message || 'Không lưu được ảnh đại diện.', 'error');

    } finally {

      setSavingUser(false);

    }

  };



  const handleCropConfirm = async (dataUrl) => {

    const target = cropTarget;

    setCropOpen(false);

    setCropSrc('');

    setCropFileName('');

    setCropTarget(null);



    if (!dataUrl) {

      showToast?.('Không thể xử lý ảnh. Vui lòng thử ảnh khác.', 'error');

      return;

    }

    if (dataUrl.length > 750000) {

      showToast?.('Ảnh vẫn quá lớn sau khi cắt. Hãy zoom xa hơn hoặc chọn ảnh khác.', 'error');

      return;

    }



    if (target === 'user') {

      setUser((prev) => ({ ...prev, avatar: dataUrl }));

      await persistUserAvatar(dataUrl);

    } else {

      setCompany((prev) => ({ ...prev, logo: dataUrl }));

      await persistCompanyLogo(dataUrl);

    }

  };



  const handleRemoveLogo = async () => {

    setCompany((prev) => ({ ...prev, logo: '' }));

    if (canEditPartnerProfile(partnerRecord)) {

      try {

        await updatePartnerLogo('');

        showToast?.('Đã xóa logo công ty.', 'success');

      } catch (err) {

        showToast?.(err.message || 'Không xóa được logo trên server.', 'error');

      }

    }

    savePartnerCompanyProfile({ ...company, logo: '' });

  };



  const handleSaveUser = async (e) => {

    e.preventDefault();

    if (!user.fullname?.trim()) {

      showToast?.('Vui lòng nhập họ và tên.', 'error');

      return;

    }

    setSavingUser(true);

    try {

      const data = await updatePartnerUserProfile({

        fullname: user.fullname.trim(),

        phone: user.phone?.trim() || ''

      });

      if (data.user) {

        setUser(

          normalizeUser({

            fullname: data.user.fullname || '',

            email: data.user.email || user.email,

            phone: data.user.phone || '',

            avatar: resolveUserAvatar(data.user, user.avatar)

          })

        );

        localStorage.setItem('userFullname', data.user.fullname || '');

        cacheUserProfile({

          fullname: data.user.fullname || '',

          course: data.user.course || '',

          role: data.user.role || 'partner',

          picture: resolveUserAvatar(data.user, user.avatar || defaultAvatar)

        });

        dispatchAuthChanged();

      }

      showToast?.('Đã lưu thông tin tài khoản.', 'success');

    } catch (err) {

      showToast?.(err.message || 'Không thể lưu thông tin tài khoản.', 'error');

    } finally {

      setSavingUser(false);

    }

  };



  const handleSaveCompany = async (e) => {

    e.preventDefault();

    if (!company.companyName?.trim()) {

      showToast?.('Vui lòng nhập tên công ty.', 'error');

      return;

    }

    setSavingCompany(true);

    try {

      if (canEditPartnerProfile(partnerRecord)) {

        await updatePartnerMe(mapCompanyFormToPartnerPatch(company));

        await savePartnerCompanyProfile(company);

        const refreshed = await fetchPartnerMe({ includeLogo: true });

        setPartnerRecord(refreshed.partner || null);

        setCompany(normalizeCompany(mapPartnerToCompanyForm(refreshed.partner)));

        showToast?.('Đã lưu thông tin doanh nghiệp.', 'success');

      } else if (!partnerRecord) {

        await savePartnerCompanyProfile(company);

        showToast?.('Chưa có hồ sơ đối tác — đã lưu tạm cục bộ. Vui lòng gửi đề xuất trước.', 'info');

      } else {

        await savePartnerCompanyProfile(company);

        showToast?.('Hồ sơ đang chờ duyệt — đã lưu tạm cục bộ.', 'info');

      }

    } catch (err) {

      showToast?.(err.message || 'Không thể lưu thông tin.', 'error');

    } finally {

      setSavingCompany(false);

    }

  };



  const handleSaveNotifications = async () => {

    setSavingNotify(true);

    try {

      await savePartnerNotificationPrefs(notifications);

      showToast?.('Đã cập nhật cấu hình thông báo.', 'success');

    } catch {

      showToast?.('Không thể lưu cấu hình.', 'error');

    } finally {

      setSavingNotify(false);

    }

  };



  const handlePasswordSubmit = async (e) => {

    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = pwForm;



    if (!currentPassword || !newPassword || !confirmPassword) {

      showToast?.('Vui lòng điền đầy đủ thông tin mật khẩu.', 'error');

      return;

    }

    if (newPassword.length < 6) {

      showToast?.('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');

      return;

    }

    if (newPassword !== confirmPassword) {

      showToast?.('Xác nhận mật khẩu không khớp.', 'error');

      return;

    }



    setPwLoading(true);

    try {

      await changePartnerPassword(currentPassword, newPassword);

      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      showToast?.('Đổi mật khẩu thành công.', 'success');

    } catch (err) {

      showToast?.(err.message || 'Đổi mật khẩu thất bại.', 'error');

    } finally {

      setPwLoading(false);

    }

  };



  const displayUserAvatar = user.avatar || defaultAvatar;



  return (

    <div className="partner-profile-page">

      <header className="partner-profile-page__header">

        <h1>Hồ sơ & Cài đặt</h1>

        <p>Quản lý thông tin tài khoản, doanh nghiệp, bảo mật và cấu hình thông báo.</p>

        {profileLoading ? (

          <p className="partner-profile-status">Đang tải hồ sơ…</p>

        ) : (

          <>

            {partnerRecord && (

              <p className="partner-profile-status">

                <span className={`ctsv-pd-status ctsv-pd-status--${PARTNER_STATUS_TONE[partnerRecord.status] || 'slate'}`}>

                  {PARTNER_STATUS_LABEL[partnerRecord.status] || partnerRecord.status}

                </span>

                {partnerRecord.rejectionReason && (

                  <span className="partner-profile-status-reason"> — {partnerRecord.rejectionReason}</span>

                )}

                {partnerRecord.supplementReason && (

                  <span className="partner-profile-status-reason">

                    {' '}

                    — Yêu cầu bổ sung: {partnerRecord.supplementReason}{' '}

                    <Link to="/partner/proposals/create">Bổ sung ngay</Link>

                  </span>

                )}

              </p>

            )}

            {!partnerRecord && (

              <p className="partner-profile-status">

                Chưa có hồ sơ đối tác.{' '}

                <Link to="/partner/proposals/create">Gửi đề xuất đầu tiên</Link>

              </p>

            )}

          </>

        )}

      </header>



      {profileLoading ? (

        <div className="partner-profile-loading">Đang tải thông tin hồ sơ…</div>

      ) : (

      <div className="partner-profile-stack">

        <section className="partner-profile-card">

          <h2 className="partner-profile-card__title">Thông tin tài khoản</h2>

          <p className="partner-profile-card__desc">

            Thông tin cá nhân của tài khoản đăng nhập — hiển thị trên sidebar và menu đối tác.

          </p>



          <form onSubmit={handleSaveUser}>

            <div className="partner-user-avatar-row">

              <button

                type="button"

                className="partner-user-avatar-preview partner-company-logo-preview--clickable"

                onClick={() => openImagePicker('user')}

                title="Thay đổi ảnh đại diện cá nhân"

                disabled={savingUser}

              >

                <img src={displayUserAvatar} alt="Ảnh đại diện" />

                <span className="partner-company-logo-preview__overlay">Chỉnh sửa</span>

              </button>

              <div className="partner-company-logo-actions">

                <button

                  type="button"

                  className="partner-btn-outline"

                  onClick={() => openImagePicker('user')}

                  disabled={savingUser}

                >

                  {savingUser ? 'Đang lưu ảnh...' : 'Thay đổi ảnh đại diện'}

                </button>

                <span>Ảnh cá nhân — lưu ngay sau khi cắt/chỉnh</span>

                <input

                  ref={userAvatarInputRef}

                  type="file"

                  accept="image/*"

                  hidden

                  onChange={handleImageUpload}

                />

              </div>

            </div>



            <div className="partner-form-grid">

              <div className="partner-field partner-field--full">

                <label htmlFor="userFullname">Họ và tên</label>

                <input

                  id="userFullname"

                  value={user.fullname}

                  onChange={(e) => handleUserChange('fullname', e.target.value)}

                  placeholder="Họ và tên người đại diện tài khoản"

                />

              </div>

              <div className="partner-field">

                <label htmlFor="userEmail">Email đăng nhập</label>

                <input id="userEmail" type="email" value={user.email} readOnly disabled />

              </div>

              <div className="partner-field">

                <label htmlFor="userPhone">Số điện thoại cá nhân</label>

                <input

                  id="userPhone"

                  value={user.phone}

                  onChange={(e) => handleUserChange('phone', e.target.value)}

                  placeholder="+84 ..."

                />

              </div>

            </div>



            <div className="partner-profile-actions">

              <button type="submit" className="partner-btn-primary" disabled={savingUser}>

                {savingUser ? 'Đang lưu...' : 'Lưu thông tin tài khoản'}

              </button>

            </div>

          </form>

        </section>



        <PartnerProfileCollapseSection

          id="partner-profile-company-panel"

          title="Thông tin doanh nghiệp"

          desc="Thông tin hiển thị trên hợp đồng tài trợ và hồ sơ đối tác với FPT University."

          open={sectionOpen.company}

          onToggle={() => toggleSection('company')}

        >

          <form onSubmit={handleSaveCompany}>

            <div className="partner-company-logo-row">

              <button

                type="button"

                className="partner-company-logo-preview partner-company-logo-preview--clickable"

                onClick={() => openImagePicker('company')}

                title="Thay đổi logo công ty"

                disabled={logoSaving}

              >

                {company.logo ? (

                  <img src={company.logo} alt="Logo công ty" />

                ) : (

                  <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>

                    <path

                      d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"

                      fill="none"

                      stroke="currentColor"

                      strokeWidth="1.5"

                    />

                  </svg>

                )}

                <span className="partner-company-logo-preview__overlay">Chỉnh sửa</span>

              </button>

              <div className="partner-company-logo-actions">

                <button

                  type="button"

                  className="partner-btn-outline"

                  onClick={() => openImagePicker('company')}

                  disabled={logoSaving}

                >

                  {logoSaving ? 'Đang lưu logo...' : company.logo ? 'Đổi logo công ty' : 'Tải logo công ty'}

                </button>

                {company.logo && (

                  <button

                    type="button"

                    className="partner-btn-outline partner-btn-outline--danger"

                    onClick={handleRemoveLogo}

                    disabled={logoSaving}

                  >

                    Xóa logo

                  </button>

                )}

                <span>Logo doanh nghiệp — lưu ngay sau khi cắt/chỉnh (khác ảnh đại diện cá nhân)</span>

                <input

                  ref={companyLogoInputRef}

                  type="file"

                  accept="image/*"

                  hidden

                  onChange={handleImageUpload}

                />

              </div>

            </div>



            <div className="partner-form-grid">

              <div className="partner-field partner-field--full">

                <label htmlFor="companyName">Tên công ty</label>

                <input

                  id="companyName"

                  value={company.companyName}

                  onChange={(e) => handleCompanyChange('companyName', e.target.value)}

                  placeholder="Công ty TNHH..."

                />

              </div>

              <div className="partner-field">

                <label htmlFor="taxId">Mã số thuế</label>

                <input

                  id="taxId"

                  value={company.taxId}

                  onChange={(e) => handleCompanyChange('taxId', e.target.value)}

                  placeholder="0101248141"

                />

              </div>

              <div className="partner-field">

                <label htmlFor="representative">Đại diện pháp luật</label>

                <input

                  id="representative"

                  value={company.representative}

                  onChange={(e) => handleCompanyChange('representative', e.target.value)}

                  placeholder="Họ và tên"

                />

              </div>

              <div className="partner-field">

                <label htmlFor="email">Email liên hệ doanh nghiệp</label>

                <input

                  id="email"

                  type="email"

                  value={company.email}

                  readOnly

                  disabled

                  title="Email gắn với tài khoản đăng nhập"

                />

              </div>

              <div className="partner-field">

                <label htmlFor="phone">Số điện thoại doanh nghiệp</label>

                <input

                  id="phone"

                  value={company.phone}

                  onChange={(e) => handleCompanyChange('phone', e.target.value)}

                  placeholder="+84 ..."

                />

              </div>

              <div className="partner-field partner-field--full">

                <label htmlFor="address">Địa chỉ trụ sở</label>

                <textarea

                  id="address"

                  value={company.address}

                  onChange={(e) => handleCompanyChange('address', e.target.value)}

                  placeholder="Số nhà, đường, quận, thành phố"

                />

              </div>

            </div>



            <div className="partner-profile-actions">

              <button type="submit" className="partner-btn-primary" disabled={savingCompany}>

                {savingCompany ? 'Đang lưu...' : 'Lưu thông tin doanh nghiệp'}

              </button>

            </div>

          </form>

        </PartnerProfileCollapseSection>



        <PartnerProfileCollapseSection

          id="partner-profile-security-panel"

          title="Bảo mật"

          desc="Đổi mật khẩu đăng nhập tài khoản đối tác."

          open={sectionOpen.security}

          onToggle={() => toggleSection('security')}

        >

          {isGoogleLogin ? (

            <p className="partner-profile-card__desc">

              Tài khoản đăng nhập bằng Google không hỗ trợ đổi mật khẩu tại đây.

            </p>

          ) : (

            <form onSubmit={handlePasswordSubmit}>

              <div className="partner-form-grid">

                <div className="partner-field partner-field--full">

                  <label htmlFor="currentPassword">Mật khẩu hiện tại</label>

                  <input

                    id="currentPassword"

                    type="password"

                    value={pwForm.currentPassword}

                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}

                    placeholder="Nhập mật khẩu hiện tại"

                    autoComplete="current-password"

                  />

                </div>

                <div className="partner-field">

                  <label htmlFor="newPassword">Mật khẩu mới</label>

                  <input

                    id="newPassword"

                    type="password"

                    value={pwForm.newPassword}

                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}

                    placeholder="Ít nhất 6 ký tự"

                    autoComplete="new-password"

                  />

                </div>

                <div className="partner-field">

                  <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>

                  <input

                    id="confirmPassword"

                    type="password"

                    value={pwForm.confirmPassword}

                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}

                    placeholder="Nhập lại mật khẩu mới"

                    autoComplete="new-password"

                  />

                </div>

              </div>

              <div className="partner-profile-actions">

                <button type="submit" className="partner-btn-primary" disabled={pwLoading}>

                  {pwLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}

                </button>

              </div>

            </form>

          )}

        </PartnerProfileCollapseSection>



        <PartnerProfileCollapseSection

          id="partner-profile-notifications-panel"

          title="Cấu hình thông báo"

          desc="Chọn loại thông báo bạn muốn nhận qua email và hệ thống."

          open={sectionOpen.notifications}

          onToggle={() => toggleSection('notifications')}

        >

          {NOTIFICATION_OPTIONS.map((opt) => (

            <PartnerToggle

              key={opt.key}

              label={opt.label}

              desc={opt.desc}

              checked={Boolean(notifications[opt.key])}

              onChange={(value) => setNotifications((prev) => ({ ...prev, [opt.key]: value }))}

            />

          ))}



          <div className="partner-profile-actions">

            <button type="button" className="partner-btn-primary" disabled={savingNotify} onClick={handleSaveNotifications}>

              {savingNotify ? 'Đang lưu...' : 'Lưu cấu hình'}

            </button>

          </div>

        </PartnerProfileCollapseSection>

      </div>

      )}

      <AvatarCropModal

        open={cropOpen}

        imageSrc={cropSrc}

        fileName={cropFileName}

        onConfirm={handleCropConfirm}

        onCancel={handleCropCancel}

      />

    </div>

  );

};



export default PartnerProfileSettings;


