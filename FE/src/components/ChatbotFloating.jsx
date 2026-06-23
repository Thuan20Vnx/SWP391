import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/I18nContext';

const HOME_GREETING =
  'Xin chào! Tôi là trợ lý ảo F-Events. Bạn cần tôi giúp gì hôm nay?';

const ADMIN_GREETING =
  'Xin chào! Tôi là trợ lý ảo F-Events (Quản trị). Bạn cần hỗ trợ duyệt đề xuất, xử lý yêu cầu sửa/ẩn/xóa, hay tra cứu tài khoản?';

const buildBotReply = (userMsg, context) => {
  const lowercase = userMsg.toLowerCase();

  if (context === 'admin') {
    if (lowercase.includes('duyệt') || lowercase.includes('đề xuất')) {
      return 'Vào menu "Duyệt đề xuất sự kiện" để phê duyệt hoặc từ chối đề xuất mới từ CLB trước khi công khai.';
    }
    if (lowercase.includes('sửa') || lowercase.includes('ẩn') || lowercase.includes('xóa')) {
      return 'Vào "Yêu cầu sửa / ẩn / xóa" để xem các yêu cầu thay đổi sự kiện đã công bố và chấp nhận hoặc từ chối.';
    }
    if (lowercase.includes('tài khoản') || lowercase.includes('account')) {
      return 'Mục "Kiểm soát tài khoản" trong menu admin giúp bạn bật/tắt hoặc chỉnh sửa tài khoản người dùng.';
    }
    if (lowercase.includes('dashboard') || lowercase.includes('giám sát')) {
      return 'Dashboard hiển thị lưu lượng, doanh thu và nhật ký hoạt động hệ thống.';
    }
  }

  if (lowercase.includes('f-fest') || lowercase.includes('nhạc') || lowercase.includes('fest')) {
    return 'Sự kiện F-Fest: Giai điệu mùa hè sẽ diễn ra vào ngày 20/05 lúc 19:00 tại Hội trường A, FPT Tower. Hiện tại chỉ còn 15 vé trống thôi đó!';
  }
  if (lowercase.includes('prompt') || lowercase.includes('ai') || lowercase.includes('workshop')) {
    return 'Workshop "Làm chủ Prompt Engineering với AI" được tổ chức vào ngày 22/05 lúc 14:00 tại Phòng Lab 402 Gamma. Nhanh tay đăng ký nhé!';
  }
  if (lowercase.includes('profile') || lowercase.includes('hồ sơ') || lowercase.includes('trang cá nhân')) {
    return 'Bạn có thể mở menu tài khoản bằng cách nhấp vào hình đại diện ở góc trên bên phải — menu sẽ hiện ra ngay tại trang chủ.';
  }
  if (lowercase.includes('đăng ký') || lowercase.includes('vé')) {
    return 'Để đăng ký sự kiện, bạn chỉ cần bấm nút "Đăng ký ngay" trên thẻ sự kiện. Hệ thống sẽ tự động gửi QR vé về tài khoản của bạn!';
  }
  if (lowercase.includes('hello') || lowercase.includes('chào') || lowercase.includes('hi')) {
    return context === 'admin'
      ? 'Xin chào! Tôi có thể hướng dẫn bạn các mục quản trị trên F-Events.'
      : 'Xin chào! Tôi có thể giúp gì cho bạn về các sự kiện của sinh viên FPT?';
  }

  return context === 'admin'
    ? 'Tôi có thể gợi ý về duyệt đề xuất, yêu cầu sửa/ẩn/xóa, tài khoản hoặc dashboard. Bạn muốn hỏi phần nào?'
    : 'Tôi rất muốn hỗ trợ bạn, tuy nhiên tính năng AI đang được tích hợp thêm. Bạn có muốn tìm các sự kiện Công nghệ hay Âm nhạc sắp tới không?';
};

const ChatbotFloating = ({ context = 'home' }) => {
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: context === 'admin' ? ADMIN_GREETING : HOME_GREETING },
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!chatbotOpen) return undefined;

    const closeOnOutside = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setChatbotOpen(false);
    };

    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setChatbotOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [chatbotOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      const botResponse = buildBotReply(userMsg, context);
      setChatMessages((prev) => [...prev, { sender: 'bot', text: botResponse }]);
    }, 1000);
  };

  return (
    <div className="chatbot-floating-wrapper" ref={rootRef}>
      {chatbotOpen && (
        <div className="chatbot-window">
          <div className="chat-window-header">
            <div className="chat-header-user">
              <div className="chat-avatar-circle">AI</div>
              <div>
                <h4>Trợ lý ảo F-Events</h4>
                <span className="online-indicator">Hoạt động</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => setChatbotOpen(false)}
              aria-label="Đóng chat"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <div className="chat-messages-container">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-bot'}`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Nhập câu hỏi của bạn..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="chat-input-field"
            />
            <button type="submit" className="chat-send-btn" aria-label="Gửi">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`chatbot-fab-btn ${chatbotOpen ? 'fab-active' : ''}`}
        onClick={() => setChatbotOpen(!chatbotOpen)}
        aria-label="Trợ lý ảo F-Events"
        aria-expanded={chatbotOpen}
      >
        <span className="fab-icon">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <path
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="fab-text">{t('clubs.fabLabel')}</span>
      </button>
    </div>
  );
};

export default ChatbotFloating;
