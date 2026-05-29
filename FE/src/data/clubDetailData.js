export const FU_DEVER_DETAIL = {
  id: 'fu-dever',
  name: 'Câu lạc bộ FU-DEVER',
  category: 'Công nghệ',
  logoText: 'D',
  logoColor: '#f26f21',
  bannerImage:
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa65?auto=format&fit=crop&w=1600&q=80',
  logoImage:
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80',
  organization: 'FPT University',
  memberCount: 150,
  eventsHeld: 45,
  founded: 'Tháng 09, 2018',
  about: [
    'FU-DEVER là nơi hội tụ của những sinh viên đam mê công nghệ tại Đại học FPT Đà Nẵng. Với sứ mệnh kiến tạo một môi trường học tập và trải nghiệm thực tế, chúng tôi không chỉ dừng lại ở việc code, mà còn là nơi nuôi dưỡng những ý tưởng đột phá.',
    'Tầm nhìn của chúng tôi là trở thành cộng đồng công nghệ dẫn đầu trong khu vực, nơi mỗi thành viên đều có cơ hội phát triển toàn diện từ kỹ năng chuyên môn đến các kỹ năng mềm quan trọng trong kỷ nguyên số.',
  ],
  highlights: [
    {
      icon: 'rocket',
      title: 'Đổi mới sáng tạo',
      description: 'Khuyến khích các dự án mã nguồn mở và ứng dụng thực tiễn trong hệ sinh thái FPT.',
    },
    {
      icon: 'community',
      title: 'Kết nối cộng đồng',
      description: 'Mạng lưới cựu thành viên và đối tác doanh nghiệp công nghệ rộng khắp toàn quốc.',
    },
  ],
  board: [
    {
      name: 'Nguyễn Văn A',
      role: 'CHỦ NHIỆM',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Trần Thị B',
      role: 'PHÓ CHỦ NHIỆM',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Lê Văn C',
      role: 'THỦ QUỸ',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Phạm Thị D',
      role: 'THƯ KÝ',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80',
    },
  ],
  links: [
    { type: 'website', label: 'Website' },
    { type: 'share', label: 'Chia sẻ' },
    { type: 'email', label: 'Email' },
  ],
  upcomingEvents: [
    {
      id: 'ev-hackathon-2024',
      title: 'Hackathon FPT 2024',
      date: '15/12/2024',
      location: 'Tầng 4 tòa Beta',
      description: 'Cuộc thi lập trình đỉnh cao dành cho sinh viên IT toàn khóa với giải thưởng hấp dẫn.',
      image:
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
      isHot: true,
      primaryLabel: 'Đăng ký tham gia',
      variant: 'primary',
    },
    {
      id: 'ev-workshop-ai',
      title: 'Workshop AI & Future',
      date: '20/12/2024',
      location: 'Sảnh tòa Gamma',
      description: 'Khám phá tiềm năng của trí tuệ nhân tạo trong phát triển phần mềm hiện đại.',
      image:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      primaryLabel: 'Xem chi tiết',
      variant: 'outline',
    },
    {
      id: 'ev-teambuilding',
      title: 'Teambuilding Day',
      date: '05/01/2025',
      location: 'Sảnh tòa Beta',
      description: 'Ngày hội gắn kết thành viên CLB qua các hoạt động ngoại khóa thú vị.',
      image:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
      primaryLabel: 'Xem chi tiết',
      variant: 'outline',
    },
  ],
};

/** Tạo trang chi tiết tối thiểu từ card danh sách CLB */
export const buildClubDetailFromList = (club) => ({
  id: club.id,
  name: club.name.startsWith('Câu lạc bộ') ? club.name : `Câu lạc bộ ${club.name}`,
  category: club.category,
  logoText: club.logoText,
  logoColor: club.logoColor,
  bannerImage: club.coverImage,
  logoImage: null,
  organization: 'FPT University',
  memberCount: club.memberCount,
  eventsHeld: Math.max(12, Math.round(club.memberCount / 4)),
  founded: 'Tháng 09, 2018',
  about: [
    club.description,
    `${club.name} là một trong những câu lạc bộ năng động tại trường, thường xuyên tổ chức workshop, sự kiện giao lưu và hoạt động ngoại khóa dành cho sinh viên.`,
  ],
  highlights: [
    {
      icon: 'rocket',
      title: 'Hoạt động sôi nổi',
      description: 'Tổ chức sự kiện, workshop và các hoạt động thực hành định kỳ.',
    },
    {
      icon: 'community',
      title: 'Cộng đồng gắn kết',
      description: 'Môi trường học hỏi, chia sẻ và phát triển cùng bạn bè cùng chí hướng.',
    },
  ],
  board: [
    {
      name: 'Nguyễn Văn A',
      role: 'CHỦ NHIỆM',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Trần Thị B',
      role: 'PHÓ CHỦ NHIỆM',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    },
  ],
  links: [
    { type: 'website', label: 'Website' },
    { type: 'share', label: 'Chia sẻ' },
    { type: 'email', label: 'Email' },
  ],
  upcomingEvents: club.featuredEvent
    ? [
        {
          id: `${club.id}-featured`,
          title: club.featuredEvent.title,
          date: `${club.featuredEvent.day}/${club.featuredEvent.monthShort.replace('TH', '')}/2024`,
          location: 'Sảnh tòa Gamma',
          description: club.description,
          image: club.coverImage,
          isHot: true,
          primaryLabel: 'Đăng ký tham gia',
          variant: 'primary',
        },
      ]
    : [],
});

export const getClubDetailById = (clubId, listClubs = []) => {
  if (clubId === 'fu-dever' || clubId === 'fu-devies') {
    return FU_DEVER_DETAIL;
  }
  const fromList = listClubs.find((c) => c.id === clubId);
  if (fromList) return buildClubDetailFromList(fromList);
  return null;
};
