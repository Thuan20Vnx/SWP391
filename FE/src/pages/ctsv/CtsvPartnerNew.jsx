import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { createCtsvPartner } from '../../services/ctsvApi';

const CtsvPartnerNew = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    representative: '',
    address: '',
    description: ''
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createCtsvPartner(form);
      showToast?.('Đã thêm đối tác.', 'success');
      navigate(`/ctsv/partners/${res.partner._id}`);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div className="ctsv-page">
      <Link to="/ctsv/partners" className="ctsv-back-link">
        ← Quay lại
      </Link>
      <h1>Thêm đối tác mới</h1>
      <form className="ctsv-form" onSubmit={handleSubmit}>
        <label>
          Tên đối tác *
          <input name="name" value={form.name} onChange={onChange} className="ctsv-input" required />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onChange} className="ctsv-input" />
        </label>
        <label>
          Điện thoại
          <input name="phone" value={form.phone} onChange={onChange} className="ctsv-input" />
        </label>
        <label>
          Người đại diện
          <input name="representative" value={form.representative} onChange={onChange} className="ctsv-input" />
        </label>
        <label>
          Địa chỉ
          <input name="address" value={form.address} onChange={onChange} className="ctsv-input" />
        </label>
        <label>
          Mô tả
          <textarea name="description" value={form.description} onChange={onChange} className="ctsv-textarea" rows={3} />
        </label>
        <button type="submit" className="ctsv-btn-primary">
          Lưu đối tác
        </button>
      </form>
    </div>
  );
};

export default CtsvPartnerNew;
