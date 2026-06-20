import React from 'react';
import { useTranslation } from '../../i18n/I18nContext';
import { formatTicketTypePrice } from '../../utils/formatTicketTypes';

const ProposalTicketsTable = ({ ticketTypes = [], ticketPrice }) => {
  const { t } = useTranslation();
  const rows = Array.isArray(ticketTypes) ? ticketTypes.filter((row) => row?.name || row?.qty) : [];

  if (rows.length === 0) {
    const price = Math.max(0, Number(ticketPrice) || 0);
    const fallbackRow = { name: 'Vé thường', priceType: price > 0 ? 'paid' : 'free', priceAmount: price, qty: null, audience: '' };
    rows.push(fallbackRow);
  }

  return (
    <div className="admin-proposal-tickets">
      <p className="admin-proposal-card__desc-label">{t('admin.proposal.tickets.config')}</p>
      <table className="admin-proposal-tickets__table">
        <thead>
          <tr>
            <th scope="col">{t('admin.proposal.tickets.col.type')}</th>
            <th scope="col">{t('admin.proposal.tickets.col.price')}</th>
            <th scope="col">{t('admin.proposal.tickets.col.qty')}</th>
            <th scope="col">{t('admin.proposal.tickets.col.audience')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.name}-${idx}`}>
              <td>{row.name || t('admin.common.empty')}</td>
              <td>{formatTicketTypePrice(row)}</td>
              <td>{row.qty != null ? row.qty : t('admin.common.empty')}</td>
              <td>{row.audience || t('admin.common.empty')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProposalTicketsTable;
