import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { createCtsvEvent } from '../../services/ctsvApi';

const CtsvEventCreate = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Workshop',
    startDate: '',
    endDate: '',
    location: '',
    totalTickets: 100,
    image: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) {
      showToast?.('Vui lòng điền tiêu đề và ngày bắt đầu.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createCtsvEvent({
        ...form,
        totalTickets: Number(form.totalTickets) || 100
      });
      showToast?.('Đã tạo sự kiện cấp trường!', 'success');
      navigate(`/ctsv/events/${res.event.id}`);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ctsv-page">
      <Link to="/ctsv/events" className="ctsv-back-link">
        ← Quay lại
      </Link>
      <h1>Tạo sự kiện cấp trường</h1>
      <p className="ctsv-muted">Sự kiện do Ban CTSV tạo trực tiếp, không qua đề xuất CLB.</p>

      <form className="ctsv-form" onSubmit={handleSubmit}>
        <label>
          Tên sự kiện *
          <input name="title" value={form.title} onChange={onChange} className="ctsv-input" required />
        </label>
        <label>
          Loại sự kiện
          <select name="category" value={form.category} onChange={onChange} className="ctsv-select">
            <option>Âm nhạc</option>
            <option>Workshop</option>
            <option>Công nghệ</option>
            <option>Kết nối</option>
          </select>
        </label>
        <label>
          Mô tả
          <textarea name="description" value={form.description} onChange={onChange} className="ctsv-textarea" rows={4} />
        </label>
        <div className="ctsv-form-row">
          <label>
            Ngày bắt đầu *
            <input type="datetime-local" name="startDate" value={form.startDate} onChange={onChange} className="ctsv-input" required />
          </label>
          <label>
            Ngày kết thúc
            <input type="datetime-local" name="endDate" value={form.endDate} onChange={onChange} className="ctsv-input" />
          </label>
        </div>
        <label>
          Địa điểm
          <input name="location" value={form.location} onChange={onChange} className="ctsv-input" />
        </label>
        <label>
          Số vé
          <input type="number" name="totalTickets" value={form.totalTickets} onChange={onChange} className="ctsv-input" min={1} />
        </label>
        <label>
          URL ảnh bìa
          <input name="image" value={form.image} onChange={onChange} className="ctsv-input" placeholder="https://..." />
        </label>
        <button type="submit" className="ctsv-btn-primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Tạo sự kiện'}
        </button>
      </form>
    </div>
  );
};

export default CtsvEventCreate;
