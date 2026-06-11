import * as XLSX from 'xlsx';

const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusLabel = (status) => {
  if (status === 'checked-in' || status === 'attended') return 'Đã check-in';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Chưa check-in';
};

const sanitizeFileName = (value) =>
  String(value || 'danh-sach-sv')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 50) || 'danh-sach-sv';

export function downloadStudentsExcel(students, meta = {}) {
  const eventTitle = meta.eventTitle || meta.title || '';
  const clubName = meta.clubName || '';
  const clubPresident = meta.clubPresident || meta.president || '';

  const studentHeader = ['MSSV', 'Họ và tên', 'Email', 'Thời gian đăng ký', 'Trạng thái vé'];

  const studentRows = students.map((row) => {
    const s = row.student || {};
    const registeredAt = row.createdAt || row.registeredAt;
    return [
      s.studentId || '',
      s.fullname || '',
      s.email || '',
      formatDateTime(registeredAt),
      statusLabel(row.status),
    ];
  });

  const sheetData = [
    ['Tên sự kiện', eventTitle],
    ['Tên câu lạc bộ', clubName],
    ['Chủ nhiệm CLB', clubPresident],
    studentHeader,
    ...studentRows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 30 },
    { wch: 20 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sach SV');
  XLSX.writeFile(workbook, `${sanitizeFileName(eventTitle)}-danh-sach-sv.xlsx`);
}
