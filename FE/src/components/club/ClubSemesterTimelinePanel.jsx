import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { statusClass } from '../../utils/eventStatus';
import {
  createClubSemesterTimeline,
  fetchClubSemesterTimelines,
  submitClubSemesterTimeline,
  updateClubSemesterTimeline,
} from '../../services/clubTimelineApi';

const TERM_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
];

const CATEGORY_OPTIONS = ['Workshop', 'Cuộc thi', 'Giao lưu', 'Tình nguyện', 'Seminar', 'Khác'];

const inferDefaultSemester = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 9) return { semesterTerm: 'fall', semesterYear: year };
  if (month >= 5) return { semesterTerm: 'summer', semesterYear: year };
  return { semesterTerm: 'spring', semesterYear: year };
};

const emptyItem = () => ({
  title: '',
  description: '',
  plannedDate: '',
  category: 'Workshop',
  location: '',
  expectedAttendees: '',
  notes: '',
});

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const canEditTimeline = (timeline) =>
  timeline && ['draft', 'revision'].includes(timeline.statusKey);

const ClubSemesterTimelinePanel = ({ showToast }) => {
  const defaults = useMemo(() => inferDefaultSemester(), []);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    semesterTerm: defaults.semesterTerm,
    semesterYear: defaults.semesterYear,
    summary: '',
    objectives: '',
    items: [emptyItem()],
  });

  const load = useCallback(() => {
    setLoading(true);
    fetchClubSemesterTimelines()
      .then((d) => setTimelines(d.timelines || []))
      .catch(() => showToast?.('Không tải được timeline kỳ học.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      semesterTerm: defaults.semesterTerm,
      semesterYear: defaults.semesterYear,
      summary: '',
      objectives: '',
      items: [emptyItem()],
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setView('form');
  };

  const openEdit = (timeline) => {
    if (!canEditTimeline(timeline)) {
      showToast?.('Timeline này không thể chỉnh sửa.', 'warning');
      return;
    }
    setEditingId(timeline.id);
    setForm({
      semesterTerm: timeline.semesterTerm,
      semesterYear: timeline.semesterYear,
      summary: timeline.summary || '',
      objectives: timeline.objectives || '',
      items: timeline.items?.length
        ? timeline.items.map((item) => ({
            title: item.title || '',
            description: item.description || '',
            plannedDate: toDateInput(item.plannedDate),
            category: item.category || 'Workshop',
            location: item.location || '',
            expectedAttendees: item.expectedAttendees || '',
            notes: item.notes || '',
          }))
        : [emptyItem()],
    });
    setView('form');
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length <= 1 ? prev.items : prev.items.filter((_, i) => i !== index),
    }));
  };

  const buildPayload = () => ({
    semesterTerm: form.semesterTerm,
    semesterYear: Number(form.semesterYear),
    summary: form.summary,
    objectives: form.objectives,
    items: form.items.map((item) => ({
      title: item.title,
      description: item.description,
      plannedDate: item.plannedDate || null,
      category: item.category,
      location: item.location,
      expectedAttendees: Number(item.expectedAttendees) || 0,
      notes: item.notes,
    })),
  });

  const handleSave = async (andSubmit = false) => {
    const validItems = form.items.filter((item) => item.title.trim());
    if (!validItems.length) {
      showToast?.('Thêm ít nhất một hoạt động/sự kiện dự kiến.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let timelineId = editingId;
      if (editingId) {
        await updateClubSemesterTimeline(editingId, payload);
      } else {
        const created = await createClubSemesterTimeline(payload);
        timelineId = created.timeline?.id;
      }
      if (andSubmit && timelineId) {
        await submitClubSemesterTimeline(timelineId);
        showToast?.('Đã gửi timeline kỳ học — chờ IC-PDP xét duyệt!', 'success');
      } else {
        showToast?.(editingId ? 'Đã lưu timeline.' : 'Đã tạo timeline kỳ học.', 'success');
      }
      resetForm();
      setView('list');
      load();
    } catch (e) {
      showToast?.(e.message || 'Lưu timeline thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExisting = async (id) => {
    if (!window.confirm('Gửi timeline này cho IC-PDP và CTSV duyệt?')) return;
    setSubmitting(true);
    try {
      await submitClubSemesterTimeline(id);
      showToast?.('Đã gửi timeline — chờ IC-PDP xét duyệt!', 'success');
      load();
    } catch (e) {
      showToast?.(e.message || 'Gửi timeline thất bại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'form') {
    return (
      <div className="clb-timeline-page">
        <div className="clb-page-header">
          <div>
            <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
            <p className="clb-page-subtitle">
              Lập kế hoạch hoạt động theo kỳ Spring / Summer / Fall và gửi IC-PDP / CTSV phê duyệt.
            </p>
          </div>
          <button type="button" className="clb-create-btn clb-create-btn--ghost" onClick={() => { resetForm(); setView('list'); }}>
            Quay lại danh sách
          </button>
        </div>

        <div className="clb-timeline-form">
          <div className="clb-timeline-form-row">
            <label>
              Kỳ học (FPT)
              <select
                value={form.semesterTerm}
                onChange={(e) => setForm((p) => ({ ...p, semesterTerm: e.target.value }))}
              >
                {TERM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label>
              Năm
              <input
                type="number"
                min={2020}
                max={2100}
                value={form.semesterYear}
                onChange={(e) => setForm((p) => ({ ...p, semesterYear: e.target.value }))}
              />
            </label>
          </div>

          <label>
            Tóm tắt kế hoạch kỳ
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder="Mô tả tổng quan định hướng hoạt động của CLB trong kỳ..."
            />
          </label>

          <label>
            Mục tiêu kỳ học
            <textarea
              rows={2}
              value={form.objectives}
              onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))}
              placeholder="VD: Tăng 20% thành viên tích cực, tổ chức 3 workshop..."
            />
          </label>

          <div className="clb-timeline-items-head">
            <h2>Hoạt động / sự kiện dự kiến</h2>
            <button type="button" className="clb-create-btn clb-create-btn--sm" onClick={addItem}>
              + Thêm mốc
            </button>
          </div>

          {form.items.map((item, index) => (
            <div key={index} className="clb-timeline-item-card">
              <div className="clb-timeline-item-card-head">
                <strong>Mốc #{index + 1}</strong>
                {form.items.length > 1 && (
                  <button type="button" className="clb-action-btn clb-action-btn--danger" onClick={() => removeItem(index)}>
                    Xóa
                  </button>
                )}
              </div>
              <div className="clb-timeline-form-row">
                <label>
                  Tên hoạt động *
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    placeholder="VD: Workshop React cơ bản"
                  />
                </label>
                <label>
                  Ngày dự kiến
                  <input
                    type="date"
                    value={item.plannedDate}
                    onChange={(e) => updateItem(index, 'plannedDate', e.target.value)}
                  />
                </label>
              </div>
              <div className="clb-timeline-form-row">
                <label>
                  Thể loại
                  <select value={item.category} onChange={(e) => updateItem(index, 'category', e.target.value)}>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Địa điểm
                  <input
                    value={item.location}
                    onChange={(e) => updateItem(index, 'location', e.target.value)}
                    placeholder="Hall A / Online..."
                  />
                </label>
                <label>
                  Số người dự kiến
                  <input
                    type="number"
                    min={0}
                    value={item.expectedAttendees}
                    onChange={(e) => updateItem(index, 'expectedAttendees', e.target.value)}
                  />
                </label>
              </div>
              <label>
                Mô tả ngắn
                <textarea
                  rows={2}
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
              </label>
            </div>
          ))}

          <div className="clb-timeline-form-actions">
            <button type="button" className="clb-create-btn clb-create-btn--ghost" disabled={submitting} onClick={() => handleSave(false)}>
              Lưu nháp
            </button>
            <button type="button" className="clb-create-btn" disabled={submitting} onClick={() => handleSave(true)}>
              {submitting ? 'Đang gửi...' : 'Gửi duyệt'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clb-timeline-page">
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">TIMELINE KỲ HỌC</h1>
          <p className="clb-page-subtitle">
            Trước mỗi kỳ Spring / Summer / Fall, CLB lập timeline hoạt động và gửi IC-PDP / CTSV phê duyệt.
          </p>
        </div>
        <button type="button" className="clb-create-btn" onClick={openCreate}>
          + Lập timeline kỳ mới
        </button>
      </div>

      <div className="clb-table-wrapper club-m-hide-mobile">
        <div className="clb-table-scroll">
          <table className="clb-table">
            <thead>
              <tr>
                <th>KỲ (SPRING/SUMMER/FALL)</th>
                <th>SỐ HOẠT ĐỘNG</th>
                <th>GỬI LÚC</th>
                <th>TRẠNG THÁI</th>
                <th className="clb-table-col-action">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="clb-panel-empty-cell">Đang tải...</td></tr>
              ) : timelines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="clb-panel-empty-cell">
                    Chưa có timeline kỳ học. Bấm &quot;Lập timeline kỳ mới&quot; để bắt đầu.
                  </td>
                </tr>
              ) : (
                timelines.map((tl) => (
                  <tr key={tl.id}>
                    <td>
                      <span className="clb-event-name">{tl.semesterLabel}</span>
                      {tl.summary && <span className="clb-table-sub">{tl.summary.slice(0, 60)}{tl.summary.length > 60 ? '…' : ''}</span>}
                    </td>
                    <td>{tl.items?.length || 0}</td>
                    <td>{formatDate(tl.submittedAt || tl.createdAt)}</td>
                    <td>
                      <span className={`clb-table-status clb-table-status--${statusClass(tl.status, tl.statusKey).replace('status-', '')}`}>
                        {tl.status}
                      </span>
                    </td>
                    <td className="clb-table-col-action">
                      <div className="clb-table-actions">
                        {canEditTimeline(tl) && (
                          <>
                            <button type="button" className="clb-action-btn clb-action-btn--info" onClick={() => openEdit(tl)}>
                              Sửa
                            </button>
                            {tl.statusKey === 'draft' && (
                              <button
                                type="button"
                                className="clb-action-btn clb-action-btn--success"
                                disabled={submitting}
                                onClick={() => handleSubmitExisting(tl.id)}
                              >
                                Gửi duyệt
                              </button>
                            )}
                          </>
                        )}
                        {tl.statusKey === 'revision' && (
                          <button type="button" className="clb-action-btn clb-action-btn--info" onClick={() => openEdit(tl)}>
                            Chỉnh sửa & gửi lại
                          </button>
                        )}
                        {(tl.rejectionReason || tl.icpdpNote || tl.ctsvNote) && (
                          <span className="clb-table-sub" title={tl.rejectionReason || tl.icpdpNote || tl.ctsvNote}>
                            Ghi chú
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="club-m-timeline-list club-m-show-mobile">
        {loading ? (
          <p className="clb-panel-empty">Đang tải...</p>
        ) : timelines.length === 0 ? (
          <p className="clb-panel-empty">Chưa có timeline. Bấm &quot;Lập timeline kỳ mới&quot; để bắt đầu.</p>
        ) : (
          timelines.map((tl) => (
            <article key={tl.id} className="club-m-timeline-card">
              <span className="club-m-timeline-card__label">{tl.semesterLabel}</span>
              {tl.summary && (
                <span className="club-m-timeline-card__summary">
                  {tl.summary.slice(0, 80)}{tl.summary.length > 80 ? '…' : ''}
                </span>
              )}
              <div className="club-m-timeline-card__row">
                <span>{tl.items?.length || 0} hoạt động</span>
                <span>{formatDate(tl.submittedAt || tl.createdAt)}</span>
              </div>
              <span className={`clb-table-status clb-table-status--${statusClass(tl.status, tl.statusKey).replace('status-', '')}`}>
                {tl.status}
              </span>
              <div className="club-m-timeline-card__actions">
                {canEditTimeline(tl) && (
                  <>
                    <button type="button" className="club-m-btn club-m-btn--ghost" onClick={() => openEdit(tl)}>
                      Sửa
                    </button>
                    {tl.statusKey === 'draft' && (
                      <button
                        type="button"
                        className="club-m-btn club-m-btn--primary"
                        disabled={submitting}
                        onClick={() => handleSubmitExisting(tl.id)}
                      >
                        Gửi duyệt
                      </button>
                    )}
                  </>
                )}
                {tl.statusKey === 'revision' && (
                  <button type="button" className="club-m-btn club-m-btn--primary" onClick={() => openEdit(tl)}>
                    Chỉnh sửa & gửi lại
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default ClubSemesterTimelinePanel;
