import { useEffect, useRef, useState } from 'react';
import {
  fetchCtsvDepartmentProfile,
  updateCtsvDepartmentProfile,
} from '../../services/ctsvApi';
import {
  fetchIcpdpDepartmentProfile,
  updateIcpdpDepartmentProfile,
} from '../../services/icpdpApi';
import { compressImageFile } from '../../utils/image';
import { validateImageFile } from '../../utils/imageFilePicker';
import { resolveMediaUrl } from '../../utils/mediaUrls';
import '../../styles/department-profile.css';

const COPY = {
  ctsv: {
    title: 'Hồ sơ đơn vị CTSV',
    subtitle: 'Cập nhật ảnh đại diện và thông tin CTSV để Admin và các đơn vị khác xem trên Hệ thống FPT.',
  },
  icpdp: {
    title: 'Hồ sơ đơn vị IC-PDP',
    subtitle: 'Cập nhật ảnh đại diện và thông tin IC-PDP để Admin và các đơn vị khác xem trên Hệ thống FPT.',
  },
};

const DepartmentProfilePanel = ({ mode, showToast }) => {
  const copy = COPY[mode] || COPY.ctsv;
  const fetchProfile = mode === 'icpdp' ? fetchIcpdpDepartmentProfile : fetchCtsvDepartmentProfile;
  const saveProfile = mode === 'icpdp' ? updateIcpdpDepartmentProfile : updateCtsvDepartmentProfile;
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [pendingThumbnail, setPendingThumbnail] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProfile()
      .then((res) => {
        if (cancelled) return;
        const profile = res.profile || {};
        setDescription(profile.description || '');
        setThumbnailUrl(profile.hasThumbnail ? resolveMediaUrl(profile.thumbnailUrl) : '');
      })
      .catch(() => showToast?.('Không tải được hồ sơ đơn vị.', 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.ok) {
      showToast?.(check.message, 'error');
      return;
    }
    try {
      const dataUri = await compressImageFile(file, 900, 0.85);
      setPendingThumbnail(dataUri);
      setThumbnailUrl(dataUri);
    } catch {
      showToast?.('Không đọc được file ảnh.', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { description };
      if (pendingThumbnail) payload.thumbnail = pendingThumbnail;
      const res = await saveProfile(payload);
      const profile = res.profile || {};
      setDescription(profile.description || '');
      setThumbnailUrl(profile.hasThumbnail ? resolveMediaUrl(profile.thumbnailUrl) : '');
      setPendingThumbnail('');
      showToast?.('Đã cập nhật hồ sơ đơn vị.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Cập nhật hồ sơ thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dept-profile-page">
      <header className="dept-profile-page__head">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      {loading ? (
        <p className="dept-profile-page__loading">Đang tải hồ sơ...</p>
      ) : (
        <div className="dept-profile-card">
          <div className="dept-profile-card__media">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="dept-profile-card__thumb" />
            ) : (
              <div className="dept-profile-card__thumb dept-profile-card__thumb--empty">Chưa có ảnh</div>
            )}
            <button type="button" className="dept-profile-card__upload-btn" onClick={handlePickImage}>
              Chọn ảnh đại diện
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>

          <div className="dept-profile-card__fields">
            <label htmlFor="dept-profile-desc">Mô tả đơn vị</label>
            <textarea
              id="dept-profile-desc"
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu ngắn gọn về đơn vị, hiển thị cho Admin trên Hệ thống FPT."
            />

            <div className="dept-profile-card__actions">
              <button
                type="button"
                className="primary-button btn-save-profile"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentProfilePanel;
