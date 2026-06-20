import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  fetchCtsvReportDetail,
  submitCtsvReport,
} from '../../services/ctsvApi';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import {
  REPORT_FILL_RATE_LABEL,
  normalizeReportHighlightText,
} from '../../constants/ctsvReportLabels';
import exportCtsvReportExcel from '../../utils/exportCtsvReportExcel';

const SOURCE_META = {
  school: { label: 'Cấp trường', tone: 'school' },
  partner: { label: 'Đối tác', tone: 'partner' },
  club: { label: 'CLB', tone: 'club' },
};

const REG_STATUS_LABELS = {
  attended: 'Có mặt',
  registered: 'Đã đăng ký',
  cancelled: 'Đã hủy',
};

const formatReviewDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const StatCard = ({ label, value, hint, accent }) => (
  <div className={`ctsv-rd-stat${accent ? ` ctsv-rd-stat--${accent}` : ''}`}>
    <span className="ctsv-rd-stat-label">{label}</span>
    <strong className="ctsv-rd-stat-value">{value}</strong>
    {hint ? <span className="ctsv-rd-stat-hint">{hint}</span> : null}
  </div>
);

const CtsvReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchCtsvReportDetail(id)
      .then((d) => {
        const raw = d.report;
        if (!raw) {
          setReport(null);
          setSubmission(null);
          return;
        }
        setReport({
          ...raw,
          highlights: (raw.highlights || []).map(normalizeReportHighlightText),
        });
        setSubmission(d.submission || null);
      })
      .catch((err) => {
        showToast?.(err.message || 'Không tải được báo cáo.', 'error');
        navigate('/ctsv/reports');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const source = SOURCE_META[report?.source] || SOURCE_META.club;
  const stats = report?.stats;
  const isPartnerReport = report?.source === 'partner';
  const alreadySent = Boolean(submission?.submittedAt);
  const alreadySentToPartner = Boolean(submission?.sentToPartnerAt);
  const submitLabel = isPartnerReport
    ? alreadySentToPartner
      ? 'Đã gửi Partner & Admin'
      : 'Gửi Partner & Admin'
    : alreadySent
      ? 'Đã gửi Admin'
      : 'Gửi Admin xem';

  const timelineMax = useMemo(() => {
    const items = report?.registrationTimeline || [];
    return Math.max(1, ...items.map((item) => item.count));
  }, [report]);

  const ratingMax = useMemo(() => {
    const items = report?.ratingDistribution || [];
    return Math.max(1, ...items.map((item) => item.count));
  }, [report]);

  const handleExportExcel = async () => {
    if (!report || exporting) return;
    setExporting(true);
    try {
      await exportCtsvReportExcel(report);
      showToast?.('Đã xuất file Excel báo cáo CTSV.', 'success');
    } catch (error) {
      showToast?.(error.message || 'Không xuất được file Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!report || submitting || (isPartnerReport ? alreadySentToPartner : alreadySent)) return;
    setSubmitting(true);
    try {
      const data = await submitCtsvReport(report.id || id);
      setSubmission({
        reportId: data.submission?.reportId || report.id || id,
        submittedAt: data.submission?.submittedAt || new Date().toISOString(),
        submittedByEmail: data.submission?.submittedByEmail || '',
        sentToPartnerAt: data.submission?.sentToPartnerAt || (data.sentToPartner ? new Date().toISOString() : null),
        partnerEmail: data.submission?.partnerEmail || submission?.partnerEmail || '',
        sentToPartner: Boolean(data.sentToPartner),
        sentToAdmin: Boolean(data.sentToAdmin),
      });
      showToast?.(
        data.message || (isPartnerReport ? 'Đã gửi báo cáo cho Partner và Admin.' : 'Đã gửi báo cáo cho Admin xem.'),
        'success'
      );
    } catch (error) {
      showToast?.(error.message || 'Không gửi được báo cáo.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ctsv-rd-page">
        <div className="ctsv-rd-back sk sk-line sk-line--md" />
        <div className="ctsv-rd-hero sk" style={{ minHeight: 200 }} />
        <div className="ctsv-rd-stats-grid">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="ctsv-rd-stat sk" style={{ minHeight: 88 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="ctsv-rd-page">
      <Link to="/ctsv/reports" className="ctsv-rd-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Danh sách báo cáo
      </Link>

      <header className="ctsv-rd-hero">
        <div className="ctsv-rd-hero-media">
          {report.image ? (
            <img src={report.image} alt="" className="ctsv-rd-hero-img" />
          ) : (
            <div className="ctsv-rd-hero-img ctsv-rd-hero-img--placeholder" aria-hidden />
          )}
        </div>
        <div className="ctsv-rd-hero-body">
          <div className="ctsv-rd-hero-tags">
            {report.isDemo && <span className="ctsv-rd-demo-badge">Demo</span>}
            <span className={`ctsv-rd-source ctsv-rd-source--${source.tone}`}>{source.label}</span>
            <span className="ctsv-rd-phase">Đã kết thúc</span>
          </div>
          <h1>{report.title}</h1>
          <p className="ctsv-rd-hero-meta">
            {getCategoryDisplayLabel(report.category)}
            {report.eventType ? ` · ${report.eventType}` : ''}
            {' · '}
            {report.date} {report.time}
            {' · '}
            {report.location}
          </p>
          <div
            className="ctsv-rd-footer-actions"
            style={{ marginTop: 16, justifyContent: 'flex-start', flexWrap: 'wrap' }}
          >
            <button type="button" className="ctsv-btn-secondary" onClick={handleExportExcel} disabled={exporting}>
              {exporting ? 'Đang xuất Excel...' : 'Xuất file Excel'}
            </button>
            <button
              type="button"
              className="ctsv-btn-primary"
              onClick={handleSubmitReport}
              disabled={submitting || (isPartnerReport ? alreadySentToPartner : alreadySent)}
            >
              {submitting
                ? isPartnerReport
                  ? 'Đang gửi Partner & Admin...'
                  : 'Đang gửi Admin...'
                : submitLabel}
            </button>
            {isPartnerReport && alreadySentToPartner && submission?.partnerEmail ? (
              <p className="ctsv-rd-muted" style={{ width: '100%', margin: '8px 0 0' }}>
                Đã gửi cho Partner ({submission.partnerEmail}) và Admin.
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {report.highlights?.length > 0 && (
        <section className="ctsv-rd-highlights" aria-label="Điểm nổi bật">
          <h2>Điểm nổi bật</h2>
          <ul>
            {report.highlights.map((line) => {
              const text = normalizeReportHighlightText(line);
              return <li key={text}>{text}</li>;
            })}
          </ul>
        </section>
      )}

      <section className="ctsv-rd-stats-grid" aria-label="Tổng quan">
        <StatCard
          label="Đăng ký / Sức chứa"
          value={`${stats?.registeredCount ?? 0} / ${stats?.totalCapacity ?? 0}`}
          hint={`${REPORT_FILL_RATE_LABEL} ${stats?.fillRate ?? 0}%`}
          accent="orange"
        />
        <StatCard
          label="Check-in (có mặt)"
          value={stats?.attendedCount ?? 0}
          hint={`${stats?.attendanceRate ?? 0}% so với đăng ký`}
          accent="green"
        />
        <StatCard
          label="Đánh giá trung bình"
          value={stats?.reviewCount ? `${stats.averageRating}/5` : '—'}
          hint={stats?.reviewCount ? `${stats.reviewCount} lượt đánh giá` : 'Chưa có đánh giá'}
        />
        <StatCard
          label="Hủy / Không đến"
          value={`${stats?.cancelledCount ?? 0} / ${stats?.noShowCount ?? 0}`}
          hint="Hủy đăng ký / no-show"
        />
      </section>

      <div className="ctsv-rd-panels">
        <section className="ctsv-rd-panel">
          <h2 className="ctsv-rd-panel-title">Đăng ký theo thời gian</h2>
          <div className="ctsv-rd-timeline">
            {(report.registrationTimeline || []).map((item) => (
              <div key={item.label} className="ctsv-rd-timeline-row">
                <span className="ctsv-rd-timeline-label">{item.label}</span>
                <div className="ctsv-rd-timeline-bar" aria-hidden>
                  <span
                    className="ctsv-rd-timeline-fill"
                    style={{ width: `${Math.round((item.count / timelineMax) * 100)}%` }}
                  />
                </div>
                <span className="ctsv-rd-timeline-count">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ctsv-rd-panel">
          <h2 className="ctsv-rd-panel-title">Loại vé</h2>
          <ul className="ctsv-rd-tickets">
            {(report.ticketBreakdown || []).map((ticket) => {
              const pct = ticket.capacity > 0 ? Math.round((ticket.sold / ticket.capacity) * 100) : 0;
              return (
                <li key={ticket.name} className="ctsv-rd-ticket-row">
                  <div className="ctsv-rd-ticket-head">
                    <strong>{ticket.name}</strong>
                    <span>
                      {ticket.sold}/{ticket.capacity} ({pct}%)
                    </span>
                  </div>
                  <div className="ctsv-rd-ticket-bar" aria-hidden>
                    <span className="ctsv-rd-ticket-fill" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="ctsv-rd-panels">
        <section className="ctsv-rd-panel">
          <h2 className="ctsv-rd-panel-title">Phân bố đánh giá</h2>
          <div className="ctsv-rd-ratings">
            {(report.ratingDistribution || []).map((row) => (
              <div key={row.stars} className="ctsv-rd-rating-row">
                <span className="ctsv-rd-rating-stars">{row.stars}★</span>
                <div className="ctsv-rd-rating-bar" aria-hidden>
                  <span
                    className="ctsv-rd-rating-fill"
                    style={{ width: `${Math.round((row.count / ratingMax) * 100)}%` }}
                  />
                </div>
                <span className="ctsv-rd-rating-count">{row.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ctsv-rd-panel">
          <h2 className="ctsv-rd-panel-title">Đánh giá gần đây</h2>
          {(report.recentReviews || []).length === 0 ? (
            <p className="ctsv-rd-muted">Chưa có đánh giá sau sự kiện.</p>
          ) : (
            <ul className="ctsv-rd-reviews">
              {report.recentReviews.map((review) => (
                <li key={`${review.authorName}-${review.createdAt}`}>
                  <div className="ctsv-rd-review-head">
                    <strong>{review.authorName}</strong>
                    <span>{review.rating}/5</span>
                    <span className="ctsv-rd-muted">{formatReviewDate(review.createdAt)}</span>
                  </div>
                  {review.comment ? <p>{review.comment}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="ctsv-rd-panel ctsv-rd-panel--wide">
        <h2 className="ctsv-rd-panel-title">Danh sách đăng ký (mẫu)</h2>
        <div className="ctsv-rd-table-wrap">
          <table className="ctsv-rd-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Ngày đăng ký</th>
              </tr>
            </thead>
            <tbody>
              {(report.recentRegistrations || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="ctsv-rd-muted">
                    Chưa có dữ liệu đăng ký.
                  </td>
                </tr>
              ) : (
                report.recentRegistrations.map((row) => (
                  <tr key={`${row.email}-${row.registeredAt}`}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`ctsv-rd-reg-status ctsv-rd-reg-status--${row.status}`}>
                        {REG_STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td>{row.registeredAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ctsv-rd-footer-actions">
        {!report.isDemo && (
          <Link to={`/ctsv/events/${report.id}`} className="ctsv-btn-secondary">
            Xem hồ sơ sự kiện
          </Link>
        )}
        <button type="button" className="ctsv-btn-secondary" onClick={handleExportExcel} disabled={exporting}>
          {exporting ? 'Đang xuất Excel...' : 'Xuất file Excel'}
        </button>
        <button type="button" className="ctsv-btn-primary" onClick={handleSubmitAdmin} disabled={submitting}>
          {submitting ? 'Đang gửi Admin...' : 'Gửi Admin xem'}
        </button>
        {report.isDemo && (
          <p className="ctsv-rd-demo-note">
            Sự kiện demo, số liệu mẫu để thử màn hình báo cáo sau khi kết thúc.
          </p>
        )}
      </div>
    </div>
  );
};

export default CtsvReportDetail;
