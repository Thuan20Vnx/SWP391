import React from 'react';
import { formatTicketTypePrice } from '../../utils/formatTicketTypes';

const ProposalTicketsTable = ({ ticketTypes = [], ticketPrice }) => {
  const rows = Array.isArray(ticketTypes) ? ticketTypes.filter((t) => t?.name || t?.qty) : [];

  if (rows.length === 0) {
    const price = Math.max(0, Number(ticketPrice) || 0);
    if (price <= 0) {
      return <p className="admin-proposal-tickets__empty">Chưa khai báo giá vé (miễn phí hoặc chưa nhập).</p>;
    }
    return (
      <p className="admin-proposal-tickets__single">
        Giá vé: <strong>{formatTicketTypePrice({ priceType: 'paid', priceAmount: price })}</strong>
      </p>
    );
  }

  return (
    <div className="admin-proposal-tickets">
      <p className="admin-proposal-card__desc-label">Cấu hình vé</p>
      <table className="admin-proposal-tickets__table">
        <thead>
          <tr>
            <th scope="col">Loại vé</th>
            <th scope="col">Giá</th>
            <th scope="col">Số lượng</th>
            <th scope="col">Đối tượng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.name}-${idx}`}>
              <td>{row.name || '—'}</td>
              <td>{formatTicketTypePrice(row)}</td>
              <td>{row.qty != null ? row.qty : '—'}</td>
              <td>{row.audience || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProposalTicketsTable;
