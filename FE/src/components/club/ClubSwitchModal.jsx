import React from 'react';

const ClubSwitchModal = ({
  open,
  clubs = [],
  activeClubId = '',
  loading = false,
  error = '',
  onClose,
  onSelect,
}) => {
  if (!open) return null;

  return (
    <div className="club-switch-modal" role="presentation" onClick={onClose}>
      <div
        className="club-switch-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-switch-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="club-switch-title" className="club-switch-modal__title">Đổi câu lạc bộ</h3>
        <p className="club-switch-modal__hint">Chọn CLB bạn muốn quản lý trong phiên làm việc này.</p>
        {loading ? (
          <p className="club-switch-modal__status">Đang tải danh sách CLB...</p>
        ) : null}
        {error ? (
          <p className="club-switch-modal__status club-switch-modal__status--error">{error}</p>
        ) : null}
        <div className="club-switch-modal__list">
          {!loading && !error && clubs.length === 0 ? (
            <p className="club-switch-modal__status">Không có CLB nào để chọn.</p>
          ) : null}
          {clubs.map((club) => {
            const isActive = club.id === activeClubId;
            return (
              <button
                key={club.id}
                type="button"
                className={`club-switch-modal__option${isActive ? ' is-active' : ''}`}
                onClick={() => onSelect?.(club.id)}
              >
                <span className="club-switch-modal__option-name">{club.name}</span>
                {club.president ? (
                  <span className="club-switch-modal__option-meta">Chủ nhiệm: {club.president}</span>
                ) : null}
                {isActive ? <span className="club-switch-modal__badge">Đang quản lý</span> : null}
              </button>
            );
          })}
        </div>
        <button type="button" className="club-switch-modal__close" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
};

export default ClubSwitchModal;
