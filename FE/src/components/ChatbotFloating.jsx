import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatbotMessage, registerEventFromChat } from '../services/chatbotApi';
import WeatherWidget from './WeatherWidget';

const MOBILE_BREAKPOINT = 768;
const EDGE_TAB_HEIGHT = 48;
const EDGE_TOP_STORAGE_KEY = 'fevents-chatbot-edge-top';

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;

const readStoredEdgeTop = () => {
  try {
    const raw = localStorage.getItem(EDGE_TOP_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const clampEdgeTop = (top) => {
  const margin = 72;
  const maxTop = Math.max(margin, window.innerHeight - EDGE_TAB_HEIGHT - margin);
  return Math.min(Math.max(margin, top), maxTop);
};

const defaultEdgeTop = () => clampEdgeTop(window.innerHeight - 80 - EDGE_TAB_HEIGHT);

const HOME_GREETING =
  'Xin chào! Tôi là trợ lý ảo F-Events. Bạn cần tôi giúp gì hôm nay?';

const ADMIN_GREETING =
  'Xin chào! Tôi là trợ lý ảo F-Events (Quản trị). Bạn cần hỗ trợ duyệt đề xuất, xử lý yêu cầu sửa/ẩn/xóa, hay tra cứu tài khoản?';

const renderMarkdownLite = (text) => {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let listBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="chat-msg-list">
        {listBuffer.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
      return;
    }
    flushList();
    if (trimmed) {
      blocks.push(<p key={idx}>{renderInline(trimmed)}</p>);
    }
  });
  flushList();

  return blocks;
};

const renderInline = (text) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const QrFabIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4h-4" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChatbotFloating = ({
  context = 'home',
  showQrFab = context === 'home' || context === 'club_manager',
}) => {
  const rootRef = useRef(null);
  const dragRef = useRef({ moved: false, pointerId: null });
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  const [collapsed, setCollapsed] = useState(() => isMobileViewport());
  const [edgeTop, setEdgeTop] = useState(() => readStoredEdgeTop() ?? defaultEdgeTop());
  const edgeTopRef = useRef(edgeTop);
  edgeTopRef.current = edgeTop;
  const [isDragging, setIsDragging] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: context === 'admin' ? ADMIN_GREETING : HOME_GREETING, events: [] },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = isMobileViewport();
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setChatbotOpen(false);
      }
      setEdgeTop((prev) => clampEdgeTop(prev ?? defaultEdgeTop()));
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const persistEdgeTop = useCallback((top) => {
    try {
      localStorage.setItem(EDGE_TOP_STORAGE_KEY, String(top));
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const handleCollapse = useCallback(() => {
    setChatbotOpen(false);
    setCollapsed(true);
  }, []);

  const dismissFloating = useCallback(() => {
    setChatbotOpen(false);
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const handleExpand = useCallback(() => {
    setCollapsed(false);
  }, []);

  const handleEdgePointerDown = (e) => {
    dragRef.current = {
      moved: false,
      pointerId: e.pointerId,
      startY: e.clientY,
      startTop: edgeTop,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleEdgePointerMove = (e) => {
    if (!isDragging || dragRef.current.pointerId !== e.pointerId) return;
    const deltaY = e.clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > 4) dragRef.current.moved = true;
    setEdgeTop(clampEdgeTop(dragRef.current.startTop + deltaY));
  };

  const handleEdgePointerUp = (e) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    setIsDragging(false);
    if (dragRef.current.moved) {
      persistEdgeTop(edgeTopRef.current);
    }
    dragRef.current.pointerId = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleEdgeClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    handleExpand();
  };

  useEffect(() => {
    if (!chatbotOpen) return undefined;

    const closeOnOutside = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      dismissFloating();
    };

    const closeOnEscape = (e) => {
      if (e.key === 'Escape') dismissFloating();
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [chatbotOpen, dismissFloating]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const userMsg = chatInput.trim();
    const nextHistory = [...chatMessages, { sender: 'user', text: userMsg }];
    setChatMessages(nextHistory);
    setChatInput('');
    setIsSending(true);

    try {
      const { reply, events, announcements, action } = await sendChatbotMessage(nextHistory, context);
      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply, events, announcements }]);
      if (action?.type === 'register_event') {
        await handleAutoRegister(action);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: err.message || 'Trợ lý ảo đang gặp sự cố, vui lòng thử lại sau.', events: [] },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleAutoRegister = async (action) => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Bạn cần đăng nhập để mình đăng ký vé **${action.eventTitle}** giúp nhé.`,
          events: [{ id: action.eventId, title: action.eventTitle }],
        },
      ]);
      return;
    }
    try {
      await registerEventFromChat(action.eventId);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `✅ Đã đăng ký vé **${action.eventTitle}** cho bạn thành công! Bạn có thể xem chi tiết hoặc vé của mình bên dưới.`,
          events: [{ id: action.eventId, title: action.eventTitle }],
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Mình chưa đăng ký được vé **${action.eventTitle}**: ${err.message || 'có lỗi xảy ra.'}`,
          events: [{ id: action.eventId, title: action.eventTitle }],
        },
      ]);
    }
  };

  const finishAndCollapseMobile = dismissFloating;

  const goToEvent = (eventId) => {
    finishAndCollapseMobile();
    navigate(`/events/${eventId}`);
  };

  const goToAnnouncement = (announcementId) => {
    finishAndCollapseMobile();
    navigate(`/announcements/${announcementId}`);
  };

  const goToQrScan = () => {
    finishAndCollapseMobile();
    navigate('/quet-qr');
  };

  const wrapperClassName = [
    'chatbot-floating-wrapper',
    collapsed ? 'chatbot-floating-wrapper--collapsed' : '',
    isDragging ? 'is-dragging' : '',
    isMobile ? 'chatbot-floating-wrapper--mobile' : '',
  ].filter(Boolean).join(' ');

  const wrapperStyle = collapsed
    ? { top: edgeTop, bottom: 'auto', right: 0 }
    : undefined;

  return (
    <div className={wrapperClassName} ref={rootRef} style={wrapperStyle}>
      {collapsed ? (
        <button
          type="button"
          className="chatbot-floating-edge-tab"
          onPointerDown={handleEdgePointerDown}
          onPointerMove={handleEdgePointerMove}
          onPointerUp={handleEdgePointerUp}
          onPointerCancel={handleEdgePointerUp}
          onClick={handleEdgeClick}
          aria-label="Mở trợ lý ảo và tiện ích"
          title="Kéo để di chuyển · Bấm để mở"
        >
          <ChevronLeftIcon />
        </button>
      ) : (
        <div className="chatbot-floating-stack">
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
              onClick={dismissFloating}
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
                {msg.sender === 'bot' ? renderMarkdownLite(msg.text) : msg.text}
                {Array.isArray(msg.events) && msg.events.length > 0 && (
                  <div className="chat-event-suggestions">
                    {msg.events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        className="chat-event-suggestion-btn"
                        onClick={() => goToEvent(ev.id)}
                      >
                        <span className="chat-suggestion-icon" aria-hidden>🎟️</span>
                        <span className="chat-suggestion-label">Xem sự kiện "{ev.title}"</span>
                        <span aria-hidden>→</span>
                      </button>
                    ))}
                  </div>
                )}
                {Array.isArray(msg.announcements) && msg.announcements.length > 0 && (
                  <div className="chat-event-suggestions">
                    {msg.announcements.map((an) => (
                      <button
                        key={an.id}
                        type="button"
                        className="chat-event-suggestion-btn chat-event-suggestion-btn--announcement"
                        onClick={() => goToAnnouncement(an.id)}
                      >
                        <span className="chat-suggestion-icon" aria-hidden>📢</span>
                        <span className="chat-suggestion-label">Xem thông báo "{an.title}"</span>
                        <span aria-hidden>→</span>
                      </button>
                    ))}
                  </div>
                )}
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

          {showQrFab && (
            <button
              type="button"
              className="chatbot-qr-fab-btn"
              onClick={goToQrScan}
              aria-label="Quét mã QR check-in sự kiện"
              title="Quét mã QR"
            >
              <QrFabIcon />
            </button>
          )}

          <div className="chatbot-floating-fab-slot">
            <button
              type="button"
              className={`chatbot-fab-btn ${chatbotOpen ? 'fab-active' : ''}`}
              onClick={() => (chatbotOpen ? dismissFloating() : setChatbotOpen(true))}
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

            <button
              type="button"
              className="chatbot-floating-hide-btn"
              onClick={handleCollapse}
              aria-label="Thu gọn"
              title="Thu gọn"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <WeatherWidget floating />
        </div>
      )}
    </div>
  );
};

export default ChatbotFloating;
