import React, { useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import BannerCropModal from '../../components/ctsv/BannerCropModal';
import AppSelect from '../../components/ui/AppSelect';
import { createCtsvEvent } from '../../services/ctsvApi';

const TICKET_AUDIENCE_OPTIONS = ['SV FPT', 'Khách ngoài trường', 'Tất cả'];

const BANNER_MAX_BYTES = 5 * 1024 * 1024;
const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';

const EVENT_TYPES = [
  'Hội thảo & Workshop',
  'Âm nhạc & Giải trí',
  'Thể thao',
  'Kết nối doanh nghiệp',
  'Khác'
];

const CATEGORIES = ['Công nghệ (IT)', 'Âm nhạc', 'Workshop', 'Kết nối', 'Thể thao', 'Khác'];

const TICKET_CAP_EXTRA = 10;

/** Tổng vé tối đa = số tham dự dự kiến + 10 (vd: 50 người → tối đa 60 vé). */
const getMaxTicketTotal = (expectedAttendees) => {
  const expected = Math.max(0, Number(expectedAttendees) || 0);
  return expected + TICKET_CAP_EXTRA;
};

const clampTicketRows = (rows, maxTotal) => {
  let used = 0;
  return rows.map((row) => {
    const requested = Math.max(0, Number(row.qty) || 0);
    const allowed = Math.max(0, maxTotal - used);
    const qty = Math.min(requested, allowed);
    used += qty;
    return { ...row, qty };
  });
};

const DEFAULT_TICKETS = [
  { id: 1, name: 'Vé sinh viên', priceType: 'free', priceAmount: '', qty: 50, audience: 'SV FPT' },
  { id: 2, name: 'Vé khách mời', priceType: 'free', priceAmount: '', qty: 10, audience: 'Khách ngoài trường' }
];

const formatTicketPriceLabel = (row) => {
  if (row.priceType === 'free') return 'Miễn phí';
  const amount = Number(String(row.priceAmount).replace(/\D/g, ''));
  if (!amount || amount < 0) return 'Có phí (chưa nhập)';
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const TicketPriceEditor = ({ row, onChangeType, onChangeAmount }) => (
  <div className="ctsv-price-editor">
    <div className="ctsv-price-type-toggle" role="group" aria-label="Loại giá vé">
      <button
        type="button"
        className={`ctsv-price-type-btn ${row.priceType === 'free' ? 'active' : ''}`}
        onClick={() => onChangeType('free')}
      >
        Miễn phí
      </button>
      <button
        type="button"
        className={`ctsv-price-type-btn ${row.priceType === 'paid' ? 'active' : ''}`}
        onClick={() => onChangeType('paid')}
      >
        Có phí
      </button>
    </div>
    {row.priceType === 'paid' && (
      <div className="ctsv-price-amount-wrap">
        <input
          type="number"
          className="ctsv-input ctsv-price-amount-input"
          min={0}
          step={1000}
          value={row.priceAmount}
          onChange={(e) => onChangeAmount(e.target.value)}
          placeholder="0"
          inputMode="numeric"
        />
        <span className="ctsv-price-currency">đ</span>
      </div>
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="ctsv-form-section-title">
    <span className="ctsv-form-section-icon" aria-hidden />
    {children}
  </h2>
);

const Field = ({ label, required, hint, children }) => (
  <div className="ctsv-field">
    <label className="ctsv-field-label">
      {label}
      {required && <span className="ctsv-required"> *</span>}
    </label>
    {hint && <p className="ctsv-field-hint">{hint}</p>}
    {children}
  </div>
);

const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '';
  const t = timeStr || '09:00';
  return `${dateStr}T${t}`;
};

const CtsvEventCreate = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    eventType: 'Hội thảo & Workshop',
    category: 'Công nghệ (IT)',
    description: '',
    eventDate: '',
    startTime: '14:00',
    duration: '3 tiếng',
    format: 'campus',
    location: '',
    expectedAttendees: 50,
    speaker: '',
    agenda: '',
    image: ''
  });
  const [tickets, setTickets] = useState(DEFAULT_TICKETS);
  const [bannerFileName, setBannerFileName] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropFileName, setCropFileName] = useState('');
  const bannerInputRef = useRef(null);

  const maxTicketTotal = getMaxTicketTotal(form.expectedAttendees);
  const allocatedTickets = tickets.reduce((s, t) => s + (Number(t.qty) || 0), 0);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'expectedAttendees') {
      const nextExpected = Math.max(1, Number(value) || 1);
      setForm((f) => ({ ...f, expectedAttendees: nextExpected }));
      setTickets((rows) => clampTicketRows(rows, getMaxTicketTotal(nextExpected)));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const updateTicket = (id, field, value) => {
    if (field === 'qty') {
      const requested = Math.max(0, Number(value) || 0);
      setTickets((rows) => {
        const otherSum = rows
          .filter((r) => r.id !== id)
          .reduce((s, r) => s + (Number(r.qty) || 0), 0);
        const allowed = Math.max(0, maxTicketTotal - otherSum);
        const qty = Math.min(requested, allowed);
        if (requested > allowed) {
          showToast?.(
            `Tổng số vé không được vượt quá ${maxTicketTotal} (số tham dự dự kiến + 10).`,
            'error'
          );
        }
        return rows.map((r) => (r.id === id ? { ...r, qty } : r));
      });
      return;
    }
    setTickets((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const setTicketPriceType = (id, priceType) => {
    setTickets((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, priceType, priceAmount: priceType === 'free' ? '' : r.priceAmount || '' }
          : r
      )
    );
  };

  const addTicketRow = () => {
    setTickets((rows) => [
      ...rows,
      { id: Date.now(), name: '', priceType: 'free', priceAmount: '', qty: 0, audience: 'SV FPT' }
    ]);
  };

  const handleBannerFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Chỉ chấp nhận file ảnh JPG, PNG hoặc WebP.', 'error');
      return;
    }
    if (file.size > BANNER_MAX_BYTES) {
      showToast?.('Ảnh tối đa 5MB. Vui lòng chọn file nhỏ hơn.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(reader.result);
      setCropFileName(file.name);
      setCropOpen(true);
    };
    reader.onerror = () => showToast?.('Không đọc được file ảnh.', 'error');
    reader.readAsDataURL(file);
  };

  const openBannerCropEditor = () => {
    if (!form.image) return;
    setCropSource(form.image);
    setCropFileName(bannerFileName || 'banner.jpg');
    setCropOpen(true);
  };

  const onCropConfirm = (dataUrl, fileName) => {
    setCropOpen(false);
    setCropSource('');
    if (!dataUrl) {
      showToast?.('Không xử lý được ảnh. Vui lòng thử lại.', 'error');
      return;
    }
    setForm((f) => ({ ...f, image: dataUrl }));
    if (fileName) setBannerFileName(fileName);
    showToast?.('Đã áp dụng ảnh bìa (16:9).', 'success');
  };

  const onCropCancel = () => {
    setCropOpen(false);
    setCropSource('');
  };

  const onBannerInputChange = (e) => {
    const file = e.target.files?.[0];
    handleBannerFile(file);
    e.target.value = '';
  };

  const removeBanner = () => {
    setForm((f) => ({ ...f, image: '' }));
    setBannerFileName('');
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const removeTicketRow = (id) => {
    if (tickets.length <= 1) return;
    setTickets((rows) => rows.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.eventDate) {
      showToast?.('Vui lòng điền tên sự kiện và ngày tổ chức.', 'error');
      return;
    }
    if (!form.image) {
      showToast?.('Vui lòng tải và cắt ảnh bìa sự kiện.', 'error');
      return;
    }

    const invalidPaid = tickets.find(
      (t) => t.priceType === 'paid' && !(Number(String(t.priceAmount).replace(/\D/g, '')) > 0)
    );
    if (invalidPaid) {
      showToast?.('Vé có phí cần nhập số tiền lớn hơn 0.', 'error');
      return;
    }

    const totalTickets = tickets.reduce((s, t) => s + (Number(t.qty) || 0), 0);
    if (totalTickets > maxTicketTotal) {
      showToast?.(
        `Tổng số vé (${totalTickets}) vượt quá ${maxTicketTotal} (số tham dự dự kiến + 10).`,
        'error'
      );
      return;
    }
    const ticketTypes = tickets.map((t) => ({
      name: t.name,
      priceType: t.priceType,
      priceAmount: t.priceType === 'paid' ? Number(String(t.priceAmount).replace(/\D/g, '')) || 0 : 0,
      qty: Number(t.qty) || 0,
      audience: t.audience
    }));

    setSubmitting(true);
    try {
      const res = await createCtsvEvent({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.replace(' (IT)', '').split(' ')[0] || form.category,
        startDate: buildDateTime(form.eventDate, form.startTime),
        location: form.location,
        totalTickets: Number(totalTickets) || 100,
        image: form.image,
        bannerFileName,
        eventType: form.eventType,
        duration: form.duration,
        format: form.format,
        speaker: form.speaker,
        agenda: form.agenda,
        expectedAttendees: Number(form.expectedAttendees) || 0,
        ticketTypes
      });
      showToast?.('Đã lưu sự kiện cấp trường!', 'success');
      navigate(`/ctsv/events/${res.event.id}`);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ctsv-page ctsv-create-page">
      <nav className="ctsv-breadcrumb" aria-label="Breadcrumb">
        <Link to="/ctsv/events">Quản lý sự kiện</Link>
        <span className="ctsv-breadcrumb-sep">/</span>
        <span>Tạo sự kiện cấp trường</span>
      </nav>

      <header className="ctsv-create-header">
        <div className="ctsv-create-title-row">
          <h1>TẠO SỰ KIỆN CẤP TRƯỜNG</h1>
          <span className="ctsv-create-badge">
            <span className="ctsv-create-badge-dot" />
            Cấp trường
          </span>
        </div>
        <p className="ctsv-muted">
          Cập nhật các thông tin chi tiết của sự kiện trước khi lưu thay đổi.
        </p>
      </header>

      <form className="ctsv-create-form" onSubmit={handleSubmit}>
        <section className="ctsv-form-section">
          <SectionTitle>Thông tin chung</SectionTitle>
          <div className="ctsv-form-section-body">
            <Field label="Tên sự kiện" required>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                className="ctsv-input"
                placeholder="Workshop React Native cho người mới bắt đầu"
                required
              />
            </Field>
            <div className="ctsv-form-row-2">
              <Field label="Loại sự kiện" required>
                <AppSelect
                  name="eventType"
                  value={form.eventType}
                  onChange={onChange}
                  options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
                />
              </Field>
              <Field label="Danh mục" required>
                <AppSelect
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
              </Field>
            </div>
            <div className="ctsv-field">
              <div className="ctsv-field-label-row">
                <span className="ctsv-field-label">Mô tả sự kiện</span>
                <button
                  type="button"
                  className="ctsv-ai-link"
                  onClick={() => showToast?.('Tính năng AI đang phát triển.', 'info')}
                >
                  AI Tối ưu mô tả
                </button>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                className="ctsv-textarea"
                rows={4}
                placeholder="Buổi workshop chia sẻ kiến thức nền tảng..."
              />
            </div>
            <div className="ctsv-form-row-2">
              <Field label="Ngày tổ chức" required>
                <input type="date" name="eventDate" value={form.eventDate} onChange={onChange} className="ctsv-input" required />
              </Field>
              <div className="ctsv-form-row-2 ctsv-form-row-nested">
                <Field label="Thời gian bắt đầu" required>
                  <input type="time" name="startTime" value={form.startTime} onChange={onChange} className="ctsv-input" />
                </Field>
                <Field label="Thời lượng" required>
                  <input name="duration" value={form.duration} onChange={onChange} className="ctsv-input" placeholder="3 tiếng" />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Lịch trình &amp; Địa điểm</SectionTitle>
          <div className="ctsv-form-section-body">
            <div className="ctsv-form-row-2">
              <Field label="Địa điểm" required>
                <input
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  className="ctsv-input"
                  placeholder="Tòa Gamma"
                />
              </Field>
              <Field label="Số lượng tham dự dự kiến" required>
                <input
                  type="number"
                  name="expectedAttendees"
                  value={form.expectedAttendees}
                  onChange={onChange}
                  className="ctsv-input"
                  min={1}
                />
              </Field>
            </div>
            <Field label="Diễn giả / Khách mời">
              <input
                name="speaker"
                value={form.speaker}
                onChange={onChange}
                className="ctsv-input"
                placeholder="Anh Trần Xuân Thuận - Tech Lead"
              />
            </Field>
            <Field label="Lịch trình chi tiết (Agenda)">
              <textarea
                name="agenda"
                value={form.agenda}
                onChange={onChange}
                className="ctsv-textarea"
                rows={5}
                placeholder="- 14:00: Khai mạc&#10;- 14:15: Chia sẻ kiến thức&#10;- 16:00: Q&A"
              />
            </Field>
          </div>
        </section>

        <section className="ctsv-form-section">
          <SectionTitle>Vé &amp; Truyền thông</SectionTitle>
          <div className="ctsv-form-section-body">
            <Field
              label="Danh sách loại vé"
              required
              hint={`Tổng số vé tối đa ${maxTicketTotal} (= ${form.expectedAttendees} + 10). Đã phân bổ: ${allocatedTickets}/${maxTicketTotal}.`}
            >
              <div className="ctsv-ticket-table-wrap">
                <table className="ctsv-ticket-table">
                  <thead>
                    <tr>
                      <th>Tên loại vé</th>
                      <th>Giá vé</th>
                      <th>Số lượng</th>
                      <th>Đối tượng</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            value={row.name}
                            onChange={(e) => updateTicket(row.id, 'name', e.target.value)}
                            className="ctsv-input ctsv-input-table"
                          />
                        </td>
                        <td className="ctsv-ticket-price-cell">
                          <TicketPriceEditor
                            row={row}
                            onChangeType={(type) => setTicketPriceType(row.id, type)}
                            onChangeAmount={(val) => updateTicket(row.id, 'priceAmount', val)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.qty}
                            onChange={(e) => updateTicket(row.id, 'qty', e.target.value)}
                            className="ctsv-input ctsv-input-table"
                            min={0}
                            max={maxTicketTotal}
                          />
                        </td>
                        <td>
                          <AppSelect
                            value={row.audience}
                            onChange={(e) => updateTicket(row.id, 'audience', e.target.value)}
                            variant="table"
                            options={TICKET_AUDIENCE_OPTIONS}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ctsv-ticket-remove"
                            onClick={() => removeTicketRow(row.id)}
                            aria-label="Xóa dòng vé"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="ctsv-btn-add-ticket" onClick={addTicketRow}>
                + Thêm loại vé
              </button>
            </Field>

            <Field
              label="Ảnh bìa sự kiện (Banner)"
              required
              hint="Sau khi chọn ảnh, kéo và zoom trong khung 16:9 rồi áp dụng. JPG, PNG, WebP — tối đa 5MB."
            >
              <input
                ref={bannerInputRef}
                type="file"
                accept={BANNER_ACCEPT}
                className="ctsv-file-input-hidden"
                onChange={onBannerInputChange}
              />
              <div className="ctsv-banner-upload">
                <div
                  className={`ctsv-banner-dropzone ${form.image ? 'has-image' : ''}`}
                  onClick={() => bannerInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && bannerInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('is-dragover');
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('is-dragover');
                    handleBannerFile(e.dataTransfer.files?.[0]);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {form.image ? (
                    <>
                      <img src={form.image} alt="Xem trước ảnh bìa" className="ctsv-banner-preview" />
                      <div className="ctsv-banner-overlay">
                        <span>Đổi ảnh</span>
                      </div>
                    </>
                  ) : (
                    <div className="ctsv-banner-placeholder">
                      <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
                        <path
                          d="M19 7h-1V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM8 6h8v1H8V6zm11 14H5V9h14v11z"
                          fill="currentColor"
                          opacity="0.4"
                        />
                        <path d="M12 17l-4-4h2.5V9h3v4H16l-4 4z" fill="currentColor" />
                      </svg>
                      <span className="ctsv-banner-upload-title">Tải ảnh lên</span>
                      <span className="ctsv-banner-upload-hint">Kéo thả hoặc bấm để chọn file</span>
                    </div>
                  )}
                </div>
                <div className="ctsv-banner-meta">
                  {bannerFileName && (
                    <span className="ctsv-banner-filename" title={bannerFileName}>
                      {bannerFileName}
                    </span>
                  )}
                  <div className="ctsv-banner-meta-actions">
                    <button type="button" className="ctsv-btn-banner-secondary" onClick={() => bannerInputRef.current?.click()}>
                      Chọn file
                    </button>
                    {form.image && (
                      <>
                        <button type="button" className="ctsv-btn-banner-secondary" onClick={openBannerCropEditor}>
                          Cắt / chỉnh sửa
                        </button>
                        <button type="button" className="ctsv-btn-banner-remove" onClick={removeBanner}>
                          Xóa ảnh
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Field>
          </div>
        </section>

        <footer className="ctsv-form-actions">
          <Link to="/ctsv/events" className="ctsv-btn-secondary">
            Hủy bỏ
          </Link>
          <button type="submit" className="ctsv-btn-primary ctsv-btn-save" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu & Cập nhật'}
          </button>
        </footer>
      </form>

      <BannerCropModal
        open={cropOpen}
        imageSrc={cropSource}
        fileName={cropFileName}
        onConfirm={onCropConfirm}
        onCancel={onCropCancel}
      />
    </div>
  );
};

export default CtsvEventCreate;
