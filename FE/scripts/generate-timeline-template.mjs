/**
 * Sinh file Word mẫu "mau-timeline-ky-hoc.docx" vào FE/public.
 * Chạy: node scripts/generate-timeline-template.mjs
 *
 * File điền theo dạng "Nhãn: giá trị", mỗi hoạt động bắt đầu bằng dòng
 * "Hoạt động N" — để parser offline (utils/timelineDocImport.js) tự đọc và điền
 * form KHÔNG cần gọi AI. Không tách nhãn/giá trị sang 2 dòng.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';

const ORANGE = 'EA580C';
const DARK = '1F2937';
const GRAY = '6B7280';

const field = (label, value) =>
  new Paragraph({
    spacing: { after: 140 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: DARK, size: 24 }),
      new TextRun({ text: value, color: '374151', size: 24 }),
    ],
  });

const sectionHeading = (text) =>
  new Paragraph({
    spacing: { before: 260, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'FDBA74' } },
    children: [new TextRun({ text, bold: true, color: ORANGE, size: 26, allCaps: true })],
  });

const noteBox = (text) =>
  new Paragraph({
    spacing: { before: 120, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: 'FFF7ED' },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'FED7AA' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FED7AA' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'FED7AA' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'FED7AA' },
    },
    children: [new TextRun({ text, italics: true, color: '9A3412', size: 22 })],
  });

/** Tiêu đề một hoạt động: "Hoạt động N". */
const activityHeading = (n) =>
  new Paragraph({
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text: `Hoạt động ${n}`, bold: true, color: DARK, size: 24 })],
  });

const ACTIVITIES = [
  {
    'Tên': 'Workshop React cơ bản',
    'Thể loại': 'Công nghệ (IT)',
    'Bắt đầu': '20/06/2026 08:00',
    'Kết thúc': '20/06/2026 11:00',
    'Địa điểm': 'Phòng A101',
    'Số người': '50',
    'Mô tả': 'Giới thiệu React cho người mới',
  },
  {
    'Tên': 'Cuộc thi Hackathon 24h',
    'Thể loại': 'Cuộc thi',
    'Bắt đầu': '15/07/2026 08:00',
    'Kết thúc': '16/07/2026 08:00',
    'Địa điểm': 'Hội trường B',
    'Số người': '120',
    'Mô tả': 'Thi lập trình theo đội',
  },
  {
    'Tên': 'Buổi kết nối thành viên',
    'Thể loại': 'Kết nối',
    'Bắt đầu': '30/07/2026 18:00',
    'Kết thúc': '30/07/2026 21:00',
    'Địa điểm': 'Sảnh Beta',
    'Số người': '80',
    'Mô tả': 'Giao lưu, teambuilding cuối kỳ',
  },
];

const activityParagraphs = ACTIVITIES.flatMap((act, i) => [
  activityHeading(i + 1),
  ...Object.entries(act).map(([label, value]) => field(label, value)),
]);

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri' } } } },
  sections: [
    {
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'FPT STUDENTS COMMUNITY', bold: true, color: GRAY, size: 20, allCaps: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'KẾ HOẠCH HOẠT ĐỘNG THEO KỲ HỌC', bold: true, color: ORANGE, size: 38 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Điền thông tin vào file rồi tải lên để AI tự tạo timeline', color: GRAY, size: 22 })],
        }),
        noteBox(
          'Hướng dẫn: Giữ nguyên phần chữ trước dấu hai chấm (:) — đó là nhãn để hệ thống nhận diện. ' +
            'Chỉ thay phần giá trị phía sau. Mỗi hoạt động bắt đầu bằng dòng "Hoạt động N". ' +
            'Ghi ngày theo dạng NGÀY/THÁNG/NĂM GIỜ:PHÚT (vd 20/06/2026 08:00). ' +
            'Khi tải lên, hệ thống tự điền vào form — bạn vẫn có thể chỉnh lại trước khi gửi.'
        ),

        sectionHeading('1. Thông tin kỳ'),
        field('Kỳ học', 'Summer'),
        field('Năm', '2026'),
        field('Tóm tắt kế hoạch kỳ', 'Tập trung nâng cao kỹ năng lập trình và tăng cường kết nối thành viên trong CLB.'),
        field('Mục tiêu kỳ học', 'Tăng 20% thành viên tích cực; tổ chức tối thiểu 3 workshop kỹ thuật; 1 cuộc thi lớn.'),

        sectionHeading('2. Danh sách hoạt động / sự kiện dự kiến'),
        ...activityParagraphs,
        new Paragraph({
          spacing: { before: 220 },
          children: [
            new TextRun({
              text: 'Gợi ý: có thể thêm/bớt số hoạt động (Hoạt động 4, 5...). Thể loại nên thuộc: Công nghệ (IT), Âm nhạc, Workshop, Kết nối, Thể thao, Cuộc thi, Tình nguyện, Seminar, Khác.',
              italics: true,
              color: GRAY,
              size: 20,
            }),
          ],
        }),
      ],
    },
  ],
});

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'mau-timeline-ky-hoc.docx');
await mkdir(dirname(outPath), { recursive: true });
const buffer = await Packer.toBuffer(doc);
await writeFile(outPath, buffer);
console.log('Đã tạo file mẫu:', outPath, `(${buffer.length} bytes)`);
