import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchPartnerSettlements, requestPartnerSettlement } from '../../services/partnerApi';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const isItemEnded = (item) =>
  Boolean(
    item?.ended ||
      item?.statusKey === 'ended' ||
      (item?.endDate && new Date(item.endDate).getTime() <= Date.now())
  );

const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

const STATUS_LABEL = {
  none: 'Chưa yêu cầu',
  requested: 'Chờ tất toán',
  paid: 'Đã tất toán',
};

const PartnerSettlements = () => {
  const { showToast } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState('');
  const [confirmItem, setConfirmItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPartnerSettlements();
      setItems(data.items || []);
    } catch (err) {
      showToast?.(err.message || 'Không tải được danh sách.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequest = async (item) => {
    if (requestingId) return;
    setConfirmItem(null);
    setRequestingId(item.id);
    try {
      const data = await requestPartnerSettlement(item.id);
      showToast?.(data.message || 'Đã gửi yêu cầu tất toán.', 'success');
      load();
    } catch (err) {
      showToast?.(err.message || 'Không gửi được yêu cầu.', 'error');
    } finally {
      setRequestingId('');
    }
  };

  const startRequest = (item) => {
    if (requestingId) return;
    // Sự kiện chưa kết thúc → hỏi xác nhận trước khi gửi.
    if (!isItemEnded(item)) {
      setConfirmItem(item);
      return;
    }
    handleRequest(item);
  };

  const blockNote = (item) => {
    if (item.blockReason === 'daily_limit') return 'Hết lượt hôm nay';
    if (item.blockReason === 'cooldown' && item.nextAllowedAt) {
      const t = new Date(item.nextAllowedAt);
      return `Gửi lại sau ${t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return '';
  };

  return (
    <div className="partner-settlements-page">
      <header className="partner-profile-page__header">
        <h1>Yêu cầu thanh toán</h1>
        <p>Doanh thu vé và trạng thái tất toán cho từng sự kiện của bạn.</p>
      </header>

      {loading ? (
        <div className="partner-profile-loading">Đang tải danh sách…</div>
      ) : items.length === 0 ? (
        <div className="partner-settlements-empty">
          <p>Chưa có sự kiện nào để hiển thị doanh thu.</p>
        </div>
      ) : (
        <div className="partner-settlements-list">
          {items.map((item) => (
            <article key={item.id} className="partner-settlement-card">
              <div className="partner-settlement-card__main">
                <Link to={`/partner/events/${item.id}`} className="partner-settlement-card__title">
                  {item.title}
                </Link>
                <div className="partner-settlement-card__meta">
                  <span>
                    {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '—'}
                  </span>
                  <span>·</span>
                  <span>{item.registeredCount || 0} đăng ký</span>
                </div>
              </div>
              <div className="partner-settlement-card__figures">
                <div className="partner-settlement-figure">
                  <span className="partner-settlement-figure__label">Doanh thu đã thu</span>
                  <strong>{formatVnd(item.paidRevenue)}</strong>
                </div>
                <span className={`partner-revenue-status partner-revenue-status--${item.settlementStatus}`}>
                  {STATUS_LABEL[item.settlementStatus] || STATUS_LABEL.none}
                </span>
              </div>
              <div className="partner-settlement-card__action">
                {item.settlementStatus === 'paid' && (
                  <span className="partner-settlement-paid">
                    {formatVnd(item.settlementPaidAmount)}
                    {item.settlementPaidAt
                      ? ` · ${new Date(item.settlementPaidAt).toLocaleDateString('vi-VN')}`
                      : ''}
                    {item.settlementProofUrl && (
                      <>
                        {' · '}
                        <a
                          href={item.settlementProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="partner-settlement-prooflink"
                        >
                          Xem biên lai
                        </a>
                      </>
                    )}
                  </span>
                )}
                {(item.settlementStatus !== 'paid' || item.canRequest) && (
                  <>
                    <button
                      type="button"
                      className="ctsv-dash-btn ctsv-dash-btn--ghost"
                      onClick={() => startRequest(item)}
                      disabled={requestingId === item.id || !item.canRequest}
                    >
                      {requestingId === item.id
                        ? 'Đang gửi...'
                        : item.settlementStatus === 'paid'
                          ? 'Yêu cầu tất toán lại'
                          : 'Yêu cầu thanh toán'}
                    </button>
                    {!item.canRequest && (
                      <span className="partner-settlement-hint">{blockNote(item)}</span>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmItem)}
        title="Sự kiện chưa kết thúc"
        message="Sự kiện hiện chưa kết thúc. Bạn vẫn muốn gửi yêu cầu Nhà trường tất toán doanh thu ngay bây giờ chứ?"
        confirmLabel="Vẫn gửi yêu cầu"
        cancelLabel="Để sau"
        onConfirm={() => confirmItem && handleRequest(confirmItem)}
        onCancel={() => !requestingId && setConfirmItem(null)}
        loading={Boolean(requestingId)}
      />
    </div>
  );
};

export default PartnerSettlements;
