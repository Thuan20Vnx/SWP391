import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { fetchIcpdpReportDetail, submitIcpdpReport } from '../../services/icpdpApi';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';
import {
  REPORT_FILL_RATE_LABEL,
  normalizeReportHighlightText,
} from '../../constants/ctsvReportLabels';

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

const formatDateTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN');
};

const formatReviewDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const StatCard = ({ label, value, hint, accent }) => (
  <div className={`ctsv-rd-stat${accent ? ` ctsv-rd-stat--${accent}` : ''}`}>
    <span className="ctsv-rd-stat-label">{label}</span>
    <strong className="ctsv-rd-stat-value">{value}</strong>
    {hint ? <span className="ctsv-rd-stat-hint">{hint}</span> : null}
  </div>
);

const IcpdpReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [report, setReport] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchIcpdpReportDetail(id)
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
        navigate('/icpdp/reports');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const timelineMax = useMemo(() => {
    const items = report?.registrationTimeline || [];
    return Math.max(1, ...items.map((t) => t.count));
  }, [report]);

  const ratingMax = useMemo(() => {
    const items = report?.ratingDistribution || [];
    return Math.max(1, ...items.map((r) => r.count));
  }, [report]);

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

  const handleSubmit = async () => {
    if (submitting || submission?.submittedAt) return;
    setSubmitting(true);
    try {
      const data = await submitIcpdpReport(report.id || id);
      setSubmission((prev) => ({
        ...(prev || {}),
        reportId: data.submission?.reportId || report.id || id,
        submittedAt: data.submission?.submittedAt || new Date().toISOString(),
        submittedByEmail: data.submission?.submittedByEmail || prev?.submittedByEmail || '',
      }));
      showToast?.(data.message || 'Đã gửi báo cáo cho Admin.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Không gửi được báo cáo.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!report) return null;

  const source = SOURCE_META[report.source] || SOURCE_META.club;
  const stats = report.stats;
  const submittedByClub = submission?.submittedByRole === 'club_manager';
  const isPartnerReport = report.source === 'partner';
  const alreadySent = Boolean(submission?.submittedAt);

  return (
    <div className="ctsv-rd-page">
      <Link to="/icpdp/reports" className="ctsv-rd-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Danh sách báo cáo
      </Link>

      {submittedByClub ? (
        <p className="ctsv-rd-sent-note" style={{ margin: '0 0 4px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          CLB đã gửi nghiệm thu
          {submission.submittedByEmail ? ` (${submission.submittedByEmail})` : ''}
          {submission.submittedAt ? ` · ${formatDateTime(submission.submittedAt)}` : ''}.
        </p>
      ) : null}

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
          <Link to={`/icpdp/events/${report.id}`} className="ctsv-btn-secondary">
            Xem hồ sơ sự kiện
          </Link>
        )}
        {!report.isDemo && !isPartnerReport && !alreadySent && (
          <button
            type="button"
            className="ctsv-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Đang gửi Admin...' : 'Gửi Admin xem'}
          </button>
        )}
        {report.isDemo && (
          <p className="ctsv-rd-demo-note">
            Sự kiện demo, số liệu mẫu để thử màn hình báo cáo sau khi kết thúc.
          </p>
        )}
      </div>

      {!report.isDemo && !isPartnerReport && alreadySent && (
        <p className="ctsv-rd-sent-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Đã gửi Admin
          {submission?.submittedAt ? ` · ${formatDateTime(submission.submittedAt)}` : ''}.
        </p>
      )}
    </div>
  );
};

export default IcpdpReportDetail;
