import React, { useEffect, useRef, useState } from 'react';
import { cancelPayment, fetchPaymentStatus } from '../services/paymentApi';
import { formatVnd } from '../utils/ticketPricing';

const POLL_MS = 4000;

const formatCountdown = (ms) => {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Modal thanh toán SePay: hiển thị QR, thông tin chuyển khoản, đếm ngược,
 * tự poll trạng thái. Khi đã thanh toán gọi onPaid().
 */
const PaymentModal = ({ payment, onClose, onPaid, showToast }) => {
  const [status, setStatus] = useState(payment?.status || 'pending');
  const [remaining, setRemaining] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const paidHandledRef = useRef(false);

  useEffect(() => {
    if (!payment?.code) return undefined;

    const expiresAt = payment.expiresAt ? new Date(payment.expiresAt).getTime() : 0;
    const updateRemaining = () => setRemaining(expiresAt ? expiresAt - Date.now() : 0);
    updateRemaining();
    tickRef.current = window.setInterval(updateRemaining, 1000);

    const poll = async () => {
      try {
        const res = await fetchPaymentStatus(payment.code);
        setStatus(res.status);
        if (res.status === 'paid' && !paidHandledRef.current) {
          paidHandledRef.current = true;
          window.clearInterval(pollRef.current);
          window.clearInterval(tickRef.current);
          onPaid?.(res);
        } else if (res.status === 'expired' || res.status === 'cancelled') {
          window.clearInterval(pollRef.current);
        }
      } catch {
        /* tạm bỏ qua lỗi mạng, lần poll sau thử lại */
      }
    };

    pollRef.current = window.setInterval(poll, POLL_MS);
    poll();

    return () => {
      window.clearInterval(pollRef.current);
      window.clearInterval(tickRef.current);
    };
  }, [payment?.code, payment?.expiresAt, onPaid]);

  if (!payment) return null;

  const handleCancel = async () => {
    if (status === 'paid') {
      onClose?.();
      return;
    }
    setCancelling(true);
    try {
      await cancelPayment(payment.code);
    } catch {
      /* vẫn đóng modal dù hủy lỗi */
    } finally {
      setCancelling(false);
      onClose?.();
    }
  };

  const expired = status === 'expired' || (status === 'pending' && remaining <= 0);
  const bank = payment.bank || {};

  return (
    <div
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,.55)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, maxWidth: 420, width: '100%',
          padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,.25)', maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center' }}>
          Thanh toán vé sự kiện
        </h2>

        {status === 'paid' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#16a34a', margin: '8px 0' }}>
              Thanh toán thành công!
            </p>
            <p style={{ color: '#64748b', margin: 0 }}>Vé điện tử của bạn đã được xác nhận.</p>
            <button
              type="button"
              onClick={() => onClose?.()}
              style={{ marginTop: 18, background: '#f26f21', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}
            >
              Xem vé
            </button>
          </div>
        ) : expired ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48 }}>⌛</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626', margin: '8px 0' }}>
              Đơn đã hết hạn
            </p>
            <p style={{ color: '#64748b', margin: 0 }}>Vui lòng tạo lại đơn mua vé.</p>
            <button
              type="button"
              onClick={() => onClose?.()}
              style={{ marginTop: 18, background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: '#64748b', margin: '0 0 16px', fontSize: '.9rem' }}>
              Quét mã QR bằng app ngân hàng để chuyển khoản. Hệ thống tự xác nhận khi nhận được tiền.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <img
                src={payment.qrUrl}
                alt="QR chuyển khoản"
                width={240}
                height={240}
                style={{ border: '1px solid #e2e8f0', borderRadius: 12, width: 240, height: 240, objectFit: 'contain' }}
              />
            </div>

            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 8, columnGap: 12, fontSize: '.9rem' }}>
              <dt style={{ color: '#64748b' }}>Số tiền</dt>
              <dd style={{ margin: 0, fontWeight: 700, color: '#f26f21' }}>
                {payment.amountLabel || formatVnd(payment.amount)}
              </dd>
              <dt style={{ color: '#64748b' }}>Ngân hàng</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{bank.bankCode || '—'}</dd>
              <dt style={{ color: '#64748b' }}>Số tài khoản</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{bank.accountNumber || '—'}</dd>
              {bank.accountHolder ? (
                <>
                  <dt style={{ color: '#64748b' }}>Chủ tài khoản</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{bank.accountHolder}</dd>
                </>
              ) : null}
              <dt style={{ color: '#64748b' }}>Nội dung CK</dt>
              <dd style={{ margin: 0, fontWeight: 700, letterSpacing: '.5px' }}>{payment.transferContent}</dd>
            </dl>

            <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
              <span style={{ color: '#64748b', fontSize: '.85rem' }}>Đơn hết hạn sau </span>
              <strong style={{ color: remaining < 60000 ? '#dc2626' : '#1e293b' }}>{formatCountdown(remaining)}</strong>
            </div>

            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '.78rem', margin: '0 0 12px' }}>
              ⚠️ Giữ nguyên nội dung chuyển khoản <b>{payment.transferContent}</b> để được xác nhận tự động.
            </p>

            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              style={{ width: '100%', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px', fontWeight: 600, cursor: 'pointer' }}
            >
              {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
