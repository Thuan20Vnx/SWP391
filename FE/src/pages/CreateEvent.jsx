import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EVENT_VENUES } from '../constants/eventVenues';

const CreateEvent = ({ showToast }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    startDate: '',
    endDate: '',
    location: '',
    capacity: '',
    ticketPriceType: 'free',
    ticketPrice: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      showToast('Thời gian kết thúc phải sau thời gian bắt đầu!', 'error');
      return;
    }

    const cap = Math.max(1, Number(formData.capacity) || 0);
    const priceAmount =
      formData.ticketPriceType === 'paid'
        ? Math.max(0, Number(String(formData.ticketPrice).replace(/\D/g, '')) || 0)
        : 0;
    if (formData.ticketPriceType === 'paid' && priceAmount <= 0) {
      showToast('Vé có phí cần nhập số tiền lớn hơn 0.', 'error');
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      thumbnail: formData.thumbnail,
      startDate: formData.startDate,
      endDate: formData.endDate,
      location: formData.location,
      capacity: cap,
      ticketPrice: priceAmount,
      ticketTypes: [
        {
          name: 'Vé tham dự',
          priceType: formData.ticketPriceType,
          priceAmount,
          qty: cap,
          audience: 'SV FPT'
        }
      ]
    };

    setLoading(true);
    const email = localStorage.getItem('userEmail');

    fetch('http://localhost:5000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': email
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.success) {
          navigate('/events');
        } else {
          showToast(data.message || 'Lỗi khi tạo sự kiện', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        showToast('Không thể kết nối đến máy chủ', 'error');
      });
  };

  return (
    <div className="page-container" style={{ justifyContent: 'center', background: 'var(--bg-default)', padding: '40px 20px' }}>
      <div className="form-container" style={{ maxWidth: '800px', width: '100%', padding: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Quay lại
        </button>
        
        <header className="form-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Đề xuất Sự kiện mới</h1>
          <p style={{ color: 'var(--text-muted)' }}>Điền thông tin chi tiết để gửi đề xuất lên Phòng CTSV phê duyệt.</p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <div className="input-wrapper">
              <input type="text" id="title" placeholder=" " required value={formData.title} onChange={handleInputChange} />
              <label htmlFor="title">Tên sự kiện</label>
            </div>
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <div className="input-wrapper" style={{ height: 'auto' }}>
              <textarea id="description" placeholder=" " required rows={4} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '1rem', resize: 'vertical' }} value={formData.description} onChange={handleInputChange} />
              <label htmlFor="description" style={{ top: '16px' }}>Mô tả chi tiết nội dung sự kiện</label>
            </div>
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <div className="input-wrapper">
              <input type="url" id="thumbnail" placeholder=" " value={formData.thumbnail} onChange={handleInputChange} />
              <label htmlFor="thumbnail">Link ảnh bìa (Thumbnail URL - không bắt buộc)</label>
            </div>
            {formData.thumbnail && (
              <img src={formData.thumbnail} alt="Preview" style={{ marginTop: '12px', height: '120px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
            )}
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <input type="datetime-local" id="startDate" required value={formData.startDate} onChange={handleInputChange} />
              <label htmlFor="startDate" style={{ transform: 'translateY(-50%) scale(0.8)', top: '0', background: 'var(--bg-input)' }}>Thời gian bắt đầu</label>
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <input type="datetime-local" id="endDate" required value={formData.endDate} onChange={handleInputChange} />
              <label htmlFor="endDate" style={{ transform: 'translateY(-50%) scale(0.8)', top: '0', background: 'var(--bg-input)' }}>Thời gian kết thúc</label>
            </div>
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Sự kiện chỉ được tổ chức trong khuôn viên trường.
            </p>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <select
                id="location"
                required
                value={formData.location}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-default)',
                  outline: 'none',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                }}
              >
                <option value="" disabled>Chọn địa điểm</option>
                {EVENT_VENUES.map((venue) => (
                  <option key={venue} value={venue}>{venue}</option>
                ))}
              </select>
              <label htmlFor="location" style={{ transform: 'translateY(-50%) scale(0.8)', top: '0', background: 'var(--bg-input)' }}>
                Địa điểm tổ chức
              </label>
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <input type="number" id="capacity" placeholder=" " required min="1" value={formData.capacity} onChange={handleInputChange} />
              <label htmlFor="capacity">Số lượng vé / Số người tham dự tối đa</label>
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <select
                id="ticketPriceType"
                value={formData.ticketPriceType}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-default)',
                  outline: 'none',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                }}
              >
                <option value="free">Miễn phí</option>
                <option value="paid">Có phí</option>
              </select>
              <label htmlFor="ticketPriceType" style={{ transform: 'translateY(-50%) scale(0.8)', top: '0', background: 'var(--bg-input)' }}>
                Loại giá vé
              </label>
            </div>
          </div>

          {formData.ticketPriceType === 'paid' && (
            <div className="input-group">
              <div className="input-wrapper">
                <input
                  type="text"
                  id="ticketPrice"
                  placeholder=" "
                  required
                  inputMode="numeric"
                  value={formData.ticketPrice}
                  onChange={handleInputChange}
                />
                <label htmlFor="ticketPrice">Giá vé (VNĐ)</label>
              </div>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : <span>Gửi Đề Xuất Phê Duyệt</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
