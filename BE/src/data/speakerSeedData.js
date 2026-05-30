/**
 * Code First — dữ liệu mẫu diễn giả (đồng bộ FE eventDetailData DEFAULT_SPEAKERS)
 * Dùng bởi eventSeedData.js, seed-ctsv-demo.js
 */

const SPEAKER_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80'
];

const SAMPLE_SPEAKERS = {
  techWorkshop: [
    {
      name: 'Nguyễn Văn An',
      role: 'AI Engineer @ FPT Software',
      avatar: SPEAKER_AVATARS[0]
    },
    {
      name: 'Trần Thị Bình',
      role: 'IoT Specialist',
      avatar: SPEAKER_AVATARS[1]
    }
  ],
  careerForum: [
    {
      name: 'Trần Xuân Thuận',
      role: 'Tech Lead',
      avatar: SPEAKER_AVATARS[2]
    }
  ],
  cultureFest: [
    {
      name: 'Lê Minh Châu',
      role: 'Giảng viên Văn hóa FPT',
      avatar: SPEAKER_AVATARS[1]
    }
  ]
};

module.exports = {
  SPEAKER_AVATARS,
  SAMPLE_SPEAKERS
};
