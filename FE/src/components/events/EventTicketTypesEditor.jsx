import React, { useState } from 'react';
import AppSelect from '../ui/AppSelect';
import {
  TICKET_AUDIENCE_OPTIONS,
  createEmptyTicketRow,
  totalTicketQty,
} from '../../utils/eventTicketTypes';

const TicketPriceInput = ({ value, onChange, disabled }) => {
  const [focused, setFocused] = useState(false);
  const price = Math.max(0, Number(value) || 0);
  const showFree = !focused && price === 0;

  return (
    <input
      type={showFree ? 'text' : 'number'}
      className={`clb-input ctsv-input-table event-ticket-price-input${showFree ? ' event-ticket-price-input--free' : ''}`}
      min={0}
      step={1000}
      value={showFree ? 'Miễn phí' : price > 0 ? price : ''}
      readOnly={showFree}
      placeholder={focused ? '0' : undefined}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        if (!focused || showFree) return;
        onChange(e.target.value);
      }}
      onBlur={(e) => {
        setFocused(false);
        const raw = String(e.target.value).replace(/\D/g, '');
        const n = parseInt(raw, 10);
        if (!raw || !Number.isFinite(n) || n <= 0) {
          onChange(0);
        } else {
          onChange(n);
        }
      }}
    />
  );
};

const EventTicketTypesEditor = ({ tickets = [], onChange, maxSlots, disabled = false }) => {
  const allocated = totalTicketQty(tickets);
  const max = parseInt(maxSlots, 10) || 0;

  const updateRow = (id, patch) => {
    onChange(tickets.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id) => {
    if (tickets.length <= 1 || disabled) return;
    onChange(tickets.filter((row) => row.id !== id));
  };

  const addRow = () => {
    if (disabled) return;
    onChange([...tickets, createEmptyTicketRow({ name: 'Vé mới', qty: 0, priceAmount: 0 })]);
  };

  return (
    <div className="event-ticket-types-editor">
      <div className="event-ticket-types-editor__head">
        <div>
          <label className="clb-toggle-label">Loại vé &amp; giá</label>
          <p className="event-ticket-types-editor__hint">
            Thêm nhiều loại vé cho sinh viên hoặc khách. Nhập giá 0 rồi bấm ra ngoài ô sẽ hiển thị Miễn phí.
          </p>
        </div>
        {max > 0 && (
          <span className={`event-ticket-types-editor__quota${allocated > max ? ' is-over' : ''}`}>
            Đã phân bổ: {allocated}/{max}
          </span>
        )}
      </div>

      <div className="ctsv-ticket-table-wrap">
        <table className="ctsv-ticket-table">
          <thead>
            <tr>
              <th>Tên vé</th>
              <th>Đối tượng</th>
              <th>Số lượng</th>
              <th>Giá vé (VNĐ)</th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {tickets.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="text"
                    className="clb-input ctsv-input-table"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Vd: Vé sinh viên"
                    disabled={disabled}
                  />
                </td>
                <td className="event-ticket-audience-cell">
                  <AppSelect
                    value={row.audience}
                    onChange={(e) => updateRow(row.id, { audience: e.target.value })}
                    options={TICKET_AUDIENCE_OPTIONS}
                    disabled={disabled}
                    variant="table"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="clb-input ctsv-input-table"
                    value={row.qty}
                    onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                    disabled={disabled}
                  />
                </td>
                <td className="ctsv-ticket-price-cell">
                  <TicketPriceInput
                    value={row.priceAmount}
                    onChange={(next) => updateRow(row.id, { priceAmount: next })}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="ctsv-ticket-remove"
                    onClick={() => removeRow(row.id)}
                    disabled={disabled || tickets.length <= 1}
                    aria-label="Xóa loại vé"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <button type="button" className="ctsv-btn-add-ticket" onClick={addRow}>
          + Thêm loại vé
        </button>
      )}
    </div>
  );
};

export default EventTicketTypesEditor;
