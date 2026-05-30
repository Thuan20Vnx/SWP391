import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../../components/ui/AppSelect';
import { createCtsvPartner } from '../../services/ctsvApi';

const CATEGORY_OPTIONS = [
  '',
  'FMCG - Nước giải khát',
  'Công nghệ thông tin',
  'Công nghệ & Giải trí',
  'Giáo dục',
  'Tài chính - Ngân hàng',
  'Khác'
];

const CtsvPartnerNew = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [form, setForm] = useState({
    name: '',
    category: '',
    representative: '',
    representativeTitle: '',
    email: '',
    phone: '',
    expectedSponsorAmount: '',
    proposedEventTitle: '',
    address: '',
    description: ''
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createCtsvPartner({
        ...form,
        expectedSponsorAmount: form.expectedSponsorAmount
          ? Number(String(form.expectedSponsorAmount).replace(/\D/g, ''))
          : 0
      });
      showToast?.('Đã thêm đối tác. Đề xuất đang chờ duyệt.', 'success');
      navigate(`/ctsv/partners/${res.partner._id}`);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div className="ctsv-partner-form-page ctsv-partners-page">
      <header className="ctsv-partners-head">
        <Link to="/ctsv/partners" className="ctsv-partner-detail-back">
          Đối tác / Thêm mới
        </Link>
        <h1 className="ctsv-partners-title" style={{ textTransform: 'none' }}>
          Thêm đối tác mới
        </h1>
        <p className="ctsv-partners-sub">
          Nhập thông tin chi tiết để thêm đối tác tài trợ hoặc đồng hành vào hệ thống.
        </p>
      </header>

      <form className="ctsv-partner-form-card" onSubmit={handleSubmit}>
        <div className="ctsv-partner-form-grid">
          <label>
            Tên doanh nghiệp/đối tác *
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="ctsv-input"
              placeholder="Ví dụ: Công ty Cổ phần VNG"
              required
            />
          </label>
          <label>
            Lĩnh vực hoạt động
            <AppSelect
              name="category"
              value={form.category}
              onChange={onChange}
              placeholder="Chọn lĩnh vực"
              options={[
                { value: '', label: 'Chọn lĩnh vực' },
                ...CATEGORY_OPTIONS.filter(Boolean).map((c) => ({ value: c, label: c }))
              ]}
            />
          </label>
          <label className="span-2">
            Người đại diện *
            <input
              name="representative"
              value={form.representative}
              onChange={onChange}
              className="ctsv-input"
              placeholder="Họ và tên người đại diện"
            />
          </label>
          <label>
            Email liên hệ
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              className="ctsv-input"
              placeholder="email@company.com"
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              className="ctsv-input"
              placeholder="09xx xxx xxx"
            />
          </label>
          <label>
            Giá trị tài trợ dự kiến (VND)
            <input
              name="expectedSponsorAmount"
              value={form.expectedSponsorAmount}
              onChange={onChange}
              className="ctsv-input"
              placeholder="10,000,000"
              inputMode="numeric"
            />
          </label>
          <label>
            Chương trình đề xuất tài trợ
            <input
              name="proposedEventTitle"
              value={form.proposedEventTitle}
              onChange={onChange}
              className="ctsv-input"
              placeholder="Tên sự kiện / workshop"
            />
          </label>
          <label className="span-2">
            Địa chỉ
            <input name="address" value={form.address} onChange={onChange} className="ctsv-input" />
          </label>
          <label className="span-2">
            Mô tả / ghi chú
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              className="ctsv-textarea"
              rows={3}
            />
          </label>
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button type="submit" className="ctsv-btn-primary">
            Lưu đối tác
          </button>
          <Link to="/ctsv/partners" className="ctsv-btn-secondary" style={{ textDecoration: 'none' }}>
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CtsvPartnerNew;
