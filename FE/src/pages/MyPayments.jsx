import React, { useEffect, useState, useCallback } from 'react';
import { fetchMyPayments, requestRefund } from '../services/paymentApi';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

const STATUS_LABEL = {
  pending: { text: 'Chờ thanh toán', cls: 'bg-yellow-100 text-yellow-700' },
  paid: { text: 'Đã thanh toán', cls: 'bg-green-100 text-green-700' },
  expired: { text: 'Hết hạn', cls: 'bg-gray-100 text-gray-500' },
  cancelled: { text: 'Đã hủy', cls: 'bg-red-100 text-red-500' },
};

const REFUND_LABEL = {
  none: null,
  requested: { text: 'Đang chờ hoàn tiền', cls: 'text-orange-600' },
  approved: { text: 'Hoàn tiền đã duyệt', cls: 'text-green-600' },
  rejected: { text: 'Từ chối hoàn tiền', cls: 'text-red-600' },
};

const formatVnd = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const formatDate = (d) =>
  d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function RefundModal({ payment, onClose, onSuccess, showToast }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { showToast('Vui lòng nhập lý do hoàn tiền.', 'error'); return; }
    setLoading(true);
    try {
      await requestRefund(payment.code, reason);
      showToast('Đã gửi yêu cầu hoàn tiền thành công.');
      onSuccess();
    } catch (err) {
      showToast(err.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Yêu cầu hoàn tiền</h3>
        <p className="text-sm text-gray-500 mb-4">
          Đơn <span className="font-mono font-medium">{payment.code}</span> — {formatVnd(payment.amount)}
        </p>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          rows={3}
          placeholder="Lý do yêu cầu hoàn tiền..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-gray-400 text-right mt-1">{reason.length}/500</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
          >Hủy</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >{loading ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
        </div>
      </div>
    </div>
  );
}

export default function MyPayments({ showToast }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refundTarget, setRefundTarget] = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetchMyPayments({ page: p, limit: 20 });
      setData(res);
      setPage(p);
    } catch (err) {
      showToast(err.message || 'Tải dữ liệu thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader showToast={showToast} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Lịch sử thanh toán</h1>
        <p className="text-sm text-gray-500 mb-6">Các giao dịch mua vé sự kiện của bạn.</p>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data?.payments?.length === 0 && (
          <div className="text-center py-16 text-gray-400">Bạn chưa có giao dịch nào.</div>
        )}

        {!loading && data?.payments?.length > 0 && (
          <div className="space-y-3">
            {data.payments.map((p) => {
              const s = STATUS_LABEL[p.status] || { text: p.status, cls: 'bg-gray-100 text-gray-600' };
              const refund = REFUND_LABEL[p.refundStatus];
              return (
                <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.event?.title || 'Sự kiện'}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{p.code}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.text}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">Số tiền</div>
                    <div className="font-semibold text-orange-600">{formatVnd(p.amount)}</div>
                    <div className="text-gray-500">Tạo lúc</div>
                    <div className="text-gray-700">{formatDate(p.createdAt)}</div>
                    {p.paidAt && (
                      <>
                        <div className="text-gray-500">Thanh toán lúc</div>
                        <div className="text-gray-700">{formatDate(p.paidAt)}</div>
                      </>
                    )}
                  </div>

                  {refund && (
                    <p className={`mt-2 text-xs font-medium ${refund.cls}`}>{refund.text}</p>
                  )}
                  {p.refundNote && (
                    <p className="mt-1 text-xs text-gray-500">Ghi chú: {p.refundNote}</p>
                  )}

                  {p.status === 'paid' && p.refundStatus === 'none' && (
                    <button
                      onClick={() => setRefundTarget(p)}
                      className="mt-3 text-xs text-orange-600 hover:underline"
                    >Yêu cầu hoàn tiền</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100"
            >← Trước</button>
            <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100"
            >Sau →</button>
          </div>
        )}
      </main>

      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => { setRefundTarget(null); load(page); }}
          showToast={showToast}
        />
      )}

      <SiteFooter />
    </div>
  );
}
