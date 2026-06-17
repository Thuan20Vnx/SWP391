import React from 'react';
import { useLocation } from 'react-router-dom';
import ChatbotFloating from './ChatbotFloating';

const GlobalChatbot = () => {
  const { pathname } = useLocation();
  const context =
    pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : 'home';

  return <ChatbotFloating context={context} />;
};

export default GlobalChatbot;
