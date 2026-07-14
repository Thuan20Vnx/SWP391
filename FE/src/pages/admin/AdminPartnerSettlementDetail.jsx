import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fetchAdminPartnerSettlementDetail,
  analyzeAdminSettlementProof,
  settleAdminPartnerEvent,
} from '../../services/adminApi';
import { buildPayoutQrUrl, findBankByCode } from '../../utils/vietqr';
import { openImageFilePicker } from '../../utils/imageFilePicker';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import '../../styles/admin-partner-settlements.css';

const formatVnd = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';
const formatDate = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '—');

export default function AdminPartnerSettlementDetail({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPartnerSettlementDetail(id);
      setDetail(res);
      setAmount(String(res.revenue?.paidRevenue || 0));
      setNote(res.settlement?.note || '');
    } catch (err) {
      showToast?.(err.message || 'Không tải được chi tiết.', 'error');
      navigate('/admin/partner-settlements');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const partner = detail?.partner || null;
  const event = detail?.event || null;
  const settlement = detail?.settlement || {};
  const isPaid = settlement.status === 'paid';
  const hasBank = Boolean(partner?.hasBankInfo);

  const qrUrl = useMemo(() => {
    if (!hasBank) return '';
    return buildPayoutQrUrl(
      { accountNumber: partner.bankAccountNumber, bankCode: partner.bankCode },
      Number(amount) || 0,
      `TT ${event?.title || ''}`.slice(0, 40)
    );
  }, [hasBank, partner, amount, event]);

  const runAnalyze = useCallback(
    async (image) => {
      setAnalyzing(true);
      setAnalysis(null);
      setOverrideConfirmed(false);
      try {
        const res = await analyzeAdminSettlementProof(id, { proofImage: image });
        setAnalysis(res.analysis || null);
      } catch (err) {
        setAnalysis({ error: err.message || 'Không phân tích được biên lai.' });
      } finally {
        setAnalyzing(false);
      }
    },
    [id]
  );

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const dataUrl = await openImageFilePicker(file, {
      onError: (msg) => msg && showToast?.(msg, 'error'),
    });
    if (dataUrl) {
      setProofImage(dataUrl);
      runAnalyze(dataUrl);
    }
  };

  const handleSettle = async () => {
    setSaving(true);
    try {
      const res = await settleAdminPartnerEvent(id, {
        amount: Number(amount) || 0,
        note,
        proofImage,
        aiValid: analysis && !analysis.error ? aiOk : null,
        aiReason: analysis && !analysis.error ? aiReason : '',
        adminOverride: overrideConfirmed,
      });
      setDetail(res);
      setProofImage('');
      setAnalysis(null);
      setOverrideConfirmed(false);
      showToast?.(res.message || 'Đã tất toán cho đối tác.', 'success');
    } catch (err) {
      showToast?.(err.message || 'Tất toán thất bại.', 'error');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="aps-page">
        <div className="aps-empty">Đang tải chi tiết…</div>
      </div>
    );
  }

  const bankLabel = findBankByCode(partner?.bankCode)?.name || partner?.bankName || partner?.bankCode || '—';

  // Khớp số tiền tính phía client (không gọi lại AI khi đổi số tiền).
  const expectedAmount = Number(amount) || 0;
  const extractedAmount =
    analysis && !analysis.error && analysis.extractedAmount != null
      ? Number(analysis.extractedAmount)
      : null;
  const amountMatched =
    extractedAmount != null &&
    expectedAmount > 0 &&
    Math.abs(extractedAmount - expectedAmount) <= Math.max(1, Math.round(expectedAmount * 0.01));
  const recipientValid = Boolean(analysis && !analysis.error && analysis.recipientValid);
  const accountMatched = Boolean(analysis && !analysis.error && analysis.matchedAccount);
  // Auto "hợp lệ" yêu cầu: đúng người nhận + đúng số tài khoản + đúng số tiền.
  // Thiếu/khác số tài khoản (ví điện tử che STK) sẽ KHÔNG tự xanh — admin phải tự xác nhận.
  const aiOk = recipientValid && accountMatched && amountMatched;
  const aiInvalid = Boolean(analysis && (analysis.error || !aiOk));
  // Lý do hiển thị / lưu khi tất toán.
  const aiReason = analysis?.error
    ? analysis.error
    : !recipientValid
      ? analysis?.reason || 'Người nhận trên biên lai không khớp thông tin đối tác.'
      : !accountMatched
        ? 'Biên lai không hiển thị đúng số tài khoản người nhận. Vui lòng kiểm tra và tự xác nhận nếu đúng.'
        : !amountMatched
          ? `Số tiền trên biên lai (${extractedAmount != null ? extractedAmount.toLocaleString('vi-VN') : '?'} đ) không khớp số tiền tất toán (${expectedAmount.toLocaleString('vi-VN')} đ).`
          : analysis?.reason || 'Biên lai hợp lệ và khớp thông tin tất toán.';
  const canSubmit =
    hasBank &&
    !saving &&
    !analyzing &&
    Number(amount) >= 0 &&
    Boolean(proofImage) &&
    (aiOk || overrideConfirmed);

  return (
    <div className="aps-page">
      <Link to="/admin/partner-settlements" className="aps-back">
        ← Danh sách tất toán
      </Link>

      <div className="aps-title-row">
        <div>
          <h1>{event?.title}</h1>
          <p className="aps-sub">
            {event?.date}
            {event?.time ? ` · ${event.time}` : ''} · Đối tác: {partner?.name || '—'}
          </p>
        </div>
        <span className={`aps-pill aps-pill--${settlement.status || 'none'}`}>
          {isPaid ? 'Đã tất toán' : settlement.status === 'requested' ? 'Chờ tất toán' : 'Chưa yêu cầu'}
        </span>
      </div>

      <div className="aps-grid2">
        <div className="aps-panel">
          <h3>Doanh thu</h3>
          <dl style={{ margin: 0 }}>
            <div className="aps-defrow">
              <dt>Vé đã thanh toán</dt>
              <dd>{formatVnd(detail.revenue?.paidRevenue)}</dd>
            </div>
            <div className="aps-defrow">
              <dt>Số vé đã trả</dt>
              <dd>{detail.revenue?.paidCount || 0}</dd>
            </div>
            <div className="aps-defrow">
              <dt>Giá vé niêm yết</dt>
              <dd>{event?.ticketPrice > 0 ? formatVnd(event.ticketPrice) : 'Miễn phí'}</dd>
            </div>
            <div className="aps-defrow">
              <dt>Lượt đăng ký</dt>
              <dd>{event?.registeredCount || 0}</dd>
            </div>
          </dl>
        </div>

        <div className="aps-panel">
          <h3>Tài khoản nhận của đối tác</h3>
          {hasBank ? (
            <dl style={{ margin: 0 }}>
              <div className="aps-defrow">
                <dt>Ngân hàng</dt>
                <dd>{bankLabel}</dd>
              </div>
              <div className="aps-defrow">
                <dt>Số tài khoản</dt>
                <dd className="mono">{partner.bankAccountNumber}</dd>
              </div>
              <div className="aps-defrow">
                <dt>Chủ tài khoản</dt>
                <dd>{partner.bankAccountHolder}</dd>
              </div>
            </dl>
          ) : (
            <p className="aps-warn">
              Đối tác chưa cập nhật thông tin ngân hàng. Không thể tạo mã QR / tất toán cho tới khi đối tác bổ sung.
            </p>
          )}
        </div>
      </div>

      <div className="aps-panel">
        <h3>Tất toán cho đối tác</h3>

        {isPaid ? (
          <div className="aps-paid">
            <div className="aps-paid__head">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Đã tất toán {formatVnd(settlement.paidAmount)}
            </div>
            <div className="aps-paid__meta">
              Thời gian: {formatDate(settlement.paidAt)}
              {settlement.paidByEmail ? ` · bởi ${settlement.paidByEmail}` : ''}
              {settlement.note ? <div>Ghi chú: {settlement.note}</div> : null}
              {settlement.proofAiChecked ? (
                <div>
                  Kiểm tra AI:{' '}
                  {settlement.proofAiValid
                    ? 'Biên lai hợp lệ'
                    : `Không hợp lệ — admin tự xác nhận${settlement.proofAdminOverride ? '' : ''}`}
                  {settlement.proofAiReason ? ` (${settlement.proofAiReason})` : ''}
                </div>
              ) : null}
            </div>
            {settlement.proofUrl ? (
              <div className="aps-paid__proof">
                <div className="aps-paid__proof-label">Ảnh biên lai chuyển khoản</div>
                <a href={settlement.proofUrl} target="_blank" rel="noopener noreferrer">
                  <img src={settlement.proofUrl} alt="Biên lai chuyển khoản" className="aps-proof-thumb" />
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="aps-settle">
            <div>
              <label className="aps-field">
                <span>Số tiền tất toán</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  disabled={!hasBank}
                  className="aps-input"
                />
                <span className="aps-hint">Gợi ý: doanh thu vé đã thu ({formatVnd(detail.revenue?.paidRevenue)}).</span>
              </label>

              <label className="aps-field">
                <span>Ghi chú (tùy chọn)</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!hasBank}
                  className="aps-textarea"
                />
              </label>

              <div className="aps-field">
                <span>Ảnh biên lai chuyển khoản (bắt buộc)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePickFile}
                  disabled={!hasBank}
                />
                {proofImage ? (
                  <div className="aps-upload aps-upload--filled" onClick={() => hasBank && fileInputRef.current?.click()}>
                    <img src={proofImage} alt="Biên lai" className="aps-proof-preview" />
                    <button type="button" className="aps-proof-change">Chọn ảnh khác</button>
                  </div>
                ) : (
                  <div
                    className="aps-upload"
                    onClick={() => hasBank && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="aps-upload__icon">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M8 13l2.5-2.5L14 14l2-2 3 3" />
                        <circle cx="8.5" cy="9" r="1.25" fill="currentColor" stroke="none" />
                      </svg>
                    </div>
                    <div className="aps-upload__text">Nhấn để tải ảnh biên lai (bill) chuyển khoản</div>
                    <div className="aps-upload__hint">PNG, JPG — bắt buộc để xác nhận đã chuyển đúng.</div>
                  </div>
                )}
              </div>

              {proofImage && (
                <div className="aps-ai">
                  {analyzing ? (
                    <div className="aps-ai__loading">
                      <span className="aps-spinner" aria-hidden /> AI đang phân tích biên lai…
                    </div>
                  ) : analysis ? (
                    analysis.error ? (
                      <div className="aps-ai__box aps-ai__box--warn">
                        <div className="aps-ai__title">Không phân tích được bằng AI</div>
                        <p className="aps-ai__reason">{analysis.error}</p>
                        <button type="button" className="aps-ai__retry" onClick={() => runAnalyze(proofImage)}>
                          Thử phân tích lại
                        </button>
                      </div>
                    ) : aiOk ? (
                      <div className="aps-ai__box aps-ai__box--ok">
                        <div className="aps-ai__title">AI: Biên lai hợp lệ</div>
                        <p className="aps-ai__reason">{aiReason}</p>
                      </div>
                    ) : (
                      <div className="aps-ai__box aps-ai__box--bad">
                        <div className="aps-ai__title">AI: Biên lai chưa khớp / không hợp lệ</div>
                        <p className="aps-ai__reason">{aiReason}</p>
                        <ul className="aps-ai__checks">
                          <li>{analysis.matchedHolder ? '✓' : '✗'} Người nhận{analysis.extractedHolder ? ` (đọc được: ${analysis.extractedHolder})` : ''}</li>
                          <li>{analysis.matchedAccount ? '✓' : '✗'} Số tài khoản{analysis.extractedAccount ? ` (đọc được: ${analysis.extractedAccount})` : ''}</li>
                          <li>{amountMatched ? '✓' : '✗'} Số tiền{extractedAmount != null ? ` (đọc được: ${extractedAmount.toLocaleString('vi-VN')} đ)` : ''}</li>
                          <li>{analysis.matchedBank ? '✓' : '✗'} Ngân hàng{analysis.extractedBank ? ` (đọc được: ${analysis.extractedBank})` : ''}</li>
                        </ul>
                      </div>
                    )
                  ) : null}

                  {!analyzing && aiInvalid && (
                    <label className="aps-ai__override">
                      <input
                        type="checkbox"
                        checked={overrideConfirmed}
                        onChange={(e) => setOverrideConfirmed(e.target.checked)}
                      />
                      <span>Tôi xác nhận thông tin này là chính xác và chịu trách nhiệm tất toán.</span>
                    </label>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canSubmit}
                className="aps-btn"
              >
                Tất toán cho đối tác
              </button>
            </div>

            <div className="aps-qr-wrap">
              {hasBank && qrUrl ? (
                <>
                  <span className="aps-qr-label">Quét để chuyển khoản cho đối tác</span>
                  <img src={qrUrl} alt="Mã QR chuyển khoản đối tác" className="aps-qr-img" />
                  <span className="aps-qr-sub">
                    {bankLabel} · {partner.bankAccountNumber}
                  </span>
                </>
              ) : (
                <span className="aps-qr-sub">Chưa có mã QR (thiếu thông tin ngân hàng).</span>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận tất toán?"
        message={`Xác nhận đã chuyển ${formatVnd(Number(amount) || 0)} cho đối tác ${partner?.name || ''} và đã đính kèm ảnh biên lai.${aiInvalid && overrideConfirmed ? ' AI báo biên lai chưa khớp — bạn đang tự xác nhận là chính xác.' : ''} Thao tác này sẽ đánh dấu sự kiện là đã tất toán.`}
        confirmLabel="Xác nhận tất toán"
        cancelLabel="Quay lại"
        onConfirm={handleSettle}
        onCancel={() => !saving && setConfirmOpen(false)}
        loading={saving}
      />
    </div>
  );
}
