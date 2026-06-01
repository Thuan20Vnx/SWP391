/** Client-side AI assist — expands a short brief into a structured event description. */
export const optimizeEventDescription = ({ title, eventType, category, agenda, location }) => {
  const name = title?.trim() || 'Sự kiện';
  const type = eventType?.trim() || 'chương trình';
  const cat = category?.trim() || 'đa lĩnh vực';
  const place = location?.trim() || 'FPT University';
  const program = agenda?.trim();

  const intro = `${name} là ${type.toLowerCase()} thuộc lĩnh vực ${cat}, được tổ chức tại ${place}. Sự kiện hướng tới sinh viên FPT và cộng đồng quan tâm, tạo cơ hội kết nối, học hỏi và trải nghiệm thực tế.`;

  const body = program
    ? `\n\nChương trình dự kiến:\n${program.split('\n').filter(Boolean).map((l) => `• ${l.trim()}`).join('\n')}`
    : '\n\nChương trình gồm phần giới thiệu, chia sẻ chuyên môn, Q&A và networking ngắn với diễn giả/khách mời.';

  const outro =
    '\n\nĐối tượng tham dự: Sinh viên FPT và khách mời theo quy định của nhà trường. Vui lòng đăng ký trước để nhận vé và cập nhật lịch trình chi tiết.';

  return `${intro}${body}${outro}`.trim();
};
