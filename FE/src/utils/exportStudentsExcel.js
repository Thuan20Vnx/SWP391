const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const statusLabel = (status) => {
  if (status === 'checked-in' || status === 'attended') return 'Đã check-in';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Chưa check-in';
};

export function downloadStudentsExcel(students, eventTitle = 'su-kien') {
  const header = ['MSSV', 'Họ và tên', 'Email', 'Thời gian đăng ký', 'Trạng thái vé'];
  const rows = students.map((row) => {
    const s = row.student || {};
    const registeredAt = row.createdAt || row.registeredAt;
    return [
      s.studentId || '',
      s.fullname || '',
      s.email || '',
      registeredAt ? new Date(registeredAt).toLocaleString('vi-VN') : '',
      statusLabel(row.status),
    ];
  });

  const csv = [header, ...rows].map((line) => line.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = String(eventTitle).replace(/[^\w\u00C0-\u024F\s-]/g, '').trim().slice(0, 40) || 'danh-sach-sv';
  link.href = url;
  link.download = `${safeName}-danh-sach-sv.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
