import React, { useEffect, useRef, useState } from 'react';
import { sendChatbotMessage } from '../services/chatbotApi';

const HOME_GREETING =
  'Xin chào! Tôi là trợ lý ảo F-Events. Bạn cần tôi giúp gì hôm nay?';

const ADMIN_GREETING =
  'Xin chào! Tôi là trợ lý ảo F-Events (Quản trị). Bạn cần hỗ trợ duyệt đề xuất, xử lý yêu cầu sửa/ẩn/xóa, hay tra cứu tài khoản?';

const ChatbotFloating = ({ context = 'home' }) => {
  const rootRef = useRef(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: context === 'admin' ? ADMIN_GREETING : HOME_GREETING },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const userMsg = chatInput.trim();
    const nextHistory = [...chatMessages, { sender: 'user', text: userMsg }];
    setChatMessages(nextHistory);
    setChatInput('');
    setIsSending(true);

    try {
      const reply = await sendChatbotMessage(nextHistory, context);
      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: err.message || 'Trợ lý ảo đang gặp sự cố, vui lòng thử lại sau.' },
      ]);
    } finally {
      setIsSending(false);
    }
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
            {isSending && (
              <div className="chat-message-bubble message-bot">Đang soạn câu trả lời...</div>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Nhập câu hỏi của bạn..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="chat-input-field"
              disabled={isSending}
            />
            <button type="submit" className="chat-send-btn" aria-label="Gửi" disabled={isSending}>
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
        <span className="fab-text">Bạn cần giúp gì?</span>
      </button>
    </div>
  );
};

export default ChatbotFloating;
