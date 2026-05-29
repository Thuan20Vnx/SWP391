/** Giá trị nội bộ — không hiển thị trên UI */
const EVENT_CAMPUS = 'FPT University';

/** Các địa điểm được phép trong khuôn viên trường */
const EVENT_VENUES = [
  'Sảnh tòa Gamma',
  'Sảnh tòa Beta',
  'Tầng 4 tòa Beta',
  'Tầng 5 tòa Alpha',
];

const isValidEventVenue = (location) => EVENT_VENUES.includes(location);

module.exports = {
  EVENT_CAMPUS,
  EVENT_VENUES,
  isValidEventVenue,
};
