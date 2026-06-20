import React, { useEffect, useState, useCallback } from 'react';
import { fetchAdminPayments, processAdminRefund } from '../../services/adminApi';

const STATUS_OPTS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const STATUS_CLS = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-500',
};

const REFUND_CLS = {
  requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-500',
};

const formatVnd = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const formatDate = (d) =>
  d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function StatCard({ label, value, sub, color = 'gray' }) {
  const colors = {
    green: 'border-green-200 bg-green-50',
    orange: 'border-orange-200 bg-orange-50',
    gray: 'border-gray-200 bg-white',
    red: 'border-red-200 bg-red-50',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RefundActionModal({ payment, onClose, onSuccess, showToast }) {
  const [action, setAction] = useState('approved');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await processAdminRefund(payment.code, action, note);
      showToast(action === 'approved' ? 'Đã duyệt hoàn tiền.' : 'Đã từ chối hoàn tiền.');
      onSuccess();
    } catch (err) {
      showToast(err.message || 'Thao tác thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Xử lý hoàn tiền</h3>
        <p className="text-sm text-gray-500 mb-1">Đơn <span className="font-mono font-medium">{payment.code}</span></p>
        <p className="text-sm text-gray-500 mb-4">
          Người dùng: <strong>{payment.user?.email || payment.userEmail}</strong><br />
          Lý do: {payment.refundReason || '—'}
        </p>
        <div className="flex gap-3 mb-4">
          {['approved', 'rejected'].map((v) => (
            <button
              key={v}
              onClick={() => setAction(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${action === v
                ? v === 'approved' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >{v === 'approved' ? 'Duyệt hoàn tiền' : 'Từ chối'}</button>
          ))}
        </div>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          rows={2}
          placeholder="Ghi chú cho người dùng (tùy chọn)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">Hủy</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >{loading ? 'Đang xử lý...' : 'Xác nhận'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayments({ showToast }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refundTarget, setRefundTarget] = useState(null);

  const load = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    try {
      const res = await fetchAdminPayments({ page: p, limit: 30, ...f });
      setData(res);
      setPage(p);
    } catch (err) {
      showToast(err.message || 'Tải dữ liệu thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => { load(1); }, []);

  const applyFilters = () => load(1, filters);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const s = data?.stats || {};

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Quản lý thanh toán</h2>
      <p className="text-sm text-gray-500 mb-6">Lịch sử giao dịch vé sự kiện toàn hệ thống.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Doanh thu" value={formatVnd(s.totalRevenue)} color="green" />
        <StatCard label="Đã thanh toán" value={s.paid ?? '—'} color="green" />
        <StatCard label="Chờ xử lý" value={s.pending ?? '—'} color="orange" />
        <StatCard label="Yêu cầu hoàn" value={s.refundRequested ?? '—'} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Tìm mã đơn, email..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <button
          onClick={applyFilters}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >Tìm</button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Mã đơn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sự kiện</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Người dùng</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Số tiền</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Thời gian</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data?.payments?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">Không có giao dịch nào.</td>
                  </tr>
                )}
                {data?.payments?.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.code}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="truncate text-gray-900">{p.event?.title || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.user?.email || p.userEmail || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatVnd(p.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[p.status] || 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                      {p.refundStatus && p.refundStatus !== 'none' && (
                        <span className={`ml-1 text-xs font-medium px-2 py-0.5 rounded-full ${REFUND_CLS[p.refundStatus] || ''}`}>
                          {p.refundStatus === 'requested' ? 'Hoàn?' : p.refundStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {p.refundStatus === 'requested' && (
                        <button
                          onClick={() => setRefundTarget(p)}
                          className="text-xs text-orange-600 font-medium hover:underline whitespace-nowrap"
                        >Xử lý hoàn</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100">← Trước</button>
              <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100">Sau →</button>
            </div>
          )}
        </>
      )}

      {refundTarget && (
        <RefundActionModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => { setRefundTarget(null); load(page); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
