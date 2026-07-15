/**
 * Sinh 2 file Word mẫu vào FE/public:
 *  - mau-tao-su-kien.docx        → mẫu TRỐNG (chỉ nhãn, để tự điền)
 *  - mau-tao-su-kien-vi-du.docx  → mẫu ĐIỀN SẴN ví dụ minh hoạ
 * Chạy: node scripts/generate-event-template.mjs
 *
 * Lưu ý: mỗi trường phải nằm trên MỘT dòng dạng "Nhãn: giá trị" để parser
 * (utils/eventDocImport.js) đọc chính xác. Không tách nhãn/giá trị sang 2 dòng.
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

const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

/** Một dòng trường: "Nhãn: giá trị" (nhãn in đậm, giá trị bình thường). */
const field = (label, value) =>
  new Paragraph({
    spacing: { after: 140 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: DARK, size: 24 }),
      new TextRun({ text: value || '', color: '374151', size: 24 }),
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

// Định nghĩa các trường theo từng mục, kèm giá trị ví dụ.
const SECTIONS = [
  {
    heading: '1. Thông tin chung',
    fields: [
      ['Tên sự kiện', 'Workshop Lập trình Flutter'],
      ['Thể loại', 'Workshop'],
      ['Diễn giả', 'Nguyễn Văn A'],
      ['Số lượng vé', '100'],
      ['Địa điểm', 'Tầng 5 tòa Alpha'],
    ],
  },
  {
    heading: '2. Thời gian đăng ký',
    fields: [
      ['Ngày bắt đầu đăng ký', '01/08/2026'],
      ['Giờ bắt đầu đăng ký', '08:00'],
      ['Ngày kết thúc đăng ký', '15/08/2026'],
      ['Giờ kết thúc đăng ký', '17:00'],
    ],
  },
  {
    heading: '3. Thời gian sự kiện',
    fields: [
      ['Ngày bắt đầu sự kiện', '20/08/2026'],
      ['Giờ bắt đầu sự kiện', '08:30'],
      ['Ngày kết thúc sự kiện', '20/08/2026'],
      ['Giờ kết thúc sự kiện', '12:00'],
    ],
  },
  {
    heading: '4. Nội dung',
    fields: [
      ['Mô tả', 'Buổi workshop giới thiệu về lập trình ứng dụng di động với Flutter, phù hợp cho người mới bắt đầu.'],
      ['Chương trình', '08:30 đón khách; 09:00 khai mạc; 09:30 nội dung chính; 11:30 hỏi đáp; 12:00 kết thúc.'],
      ['Bạn sẽ học được gì', 'Hiểu Flutter cơ bản; Xây dựng giao diện widget; Kết nối API thực tế'],
    ],
  },
];

const buildDoc = (filled) => {
  const subtitle = filled
    ? 'BẢN VÍ DỤ — đã điền sẵn để tham khảo cách trình bày'
    : 'Điền thông tin vào sau dấu hai chấm ở mỗi dòng';
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'FPT STUDENTS COMMUNITY', bold: true, color: GRAY, size: 20, allCaps: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'PHIẾU KẾ HOẠCH TỔ CHỨC SỰ KIỆN', bold: true, color: ORANGE, size: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: subtitle, color: GRAY, size: 22 })],
    }),
    noteBox(
      'Hướng dẫn: Giữ nguyên phần chữ đứng trước dấu hai chấm (:) — đó là nhãn để hệ thống ' +
        'nhận diện. Chỉ thay phần giá trị phía sau bằng thông tin sự kiện của bạn. ' +
        'Ngày ghi theo dạng NGÀY/THÁNG/NĂM (vd 20/08/2026), giờ theo dạng GIỜ:PHÚT (vd 08:30).'
    ),
  ];

  for (const section of SECTIONS) {
    children.push(sectionHeading(section.heading));
    for (const [label, example] of section.fields) {
      children.push(field(label, filled ? example : ''));
    }
  }

  children.push(spacer());
  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: 'Gợi ý: mục “Bạn sẽ học được gì” có thể liệt kê nhiều ý, ngăn cách nhau bằng dấu chấm phẩy (;).',
          italics: true,
          color: GRAY,
          size: 20,
        }),
      ],
    })
  );

  return new Document({
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
        children,
      },
    ],
  });
};

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
await mkdir(publicDir, { recursive: true });

for (const [filled, name] of [
  [false, 'mau-tao-su-kien.docx'],
  [true, 'mau-tao-su-kien-vi-du.docx'],
]) {
  const buffer = await Packer.toBuffer(buildDoc(filled));
  const outPath = resolve(publicDir, name);
  await writeFile(outPath, buffer);
  console.log('Đã tạo file mẫu:', outPath, `(${buffer.length} bytes)`);
}
