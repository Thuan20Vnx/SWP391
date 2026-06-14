export const PUBLIC_SHELL_SEARCH_PLACEHOLDERS = {
  home: 'Tìm kiếm sự kiện...',
  events: 'Tìm kiếm sự kiện...',
  clubs: 'Tìm kiếm câu lạc bộ...',
  news: 'Tìm thông báo theo tiêu đề...',
};

export const resolvePublicShellSearchPlaceholder = (activeNav, override) => {
  if (override) return override;
  return PUBLIC_SHELL_SEARCH_PLACEHOLDERS[activeNav] || 'Tìm kiếm...';
};
