import { BiSend } from 'react-icons/bi';
import { IoChatbubbleOutline } from 'react-icons/io5';
import { useState, useEffect, useRef } from 'react';
import useChatStore from '../../stores/chatStore';
import { getSocket } from '../../services/socket';
import '../../styles/Chat.css';

export default function ChatWindow() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const {
    selectedChat,
    messages,
    sendMessage,
    addMessage,
    loading,
    typingUsers,
  } = useChatStore();

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!selectedChat) return;

    try {
      const socket = getSocket();

      const handleNewMessage = (msg) => {
        addMessage(msg);
      };

      const handleTyping = (data) => {
        useChatStore.setState((state) => ({
          typingUsers: { ...state.typingUsers, [data.userId]: data.username },
        }));
      };

      const handleStopTyping = (data) => {
        useChatStore.setState((state) => {
          const updated = { ...state.typingUsers };
          delete updated[data.userId];
          return { typingUsers: updated };
        });
      };

      socket.on('message:new', handleNewMessage);
      socket.on('typing:start', handleTyping);
      socket.on('typing:stop', handleStopTyping);

      return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('typing:start', handleTyping);
        socket.off('typing:stop', handleStopTyping);
      };
    } catch (err) {
      console.error('Socket setup failed:', err);
    }
  }, [selectedChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const msg = message;
    setMessage('');

    try {
      await sendMessage(msg);

      // Emit typing stop
      try {
        const socket = getSocket();
        socket.emit('typing:stop', { chatId: selectedChat._id });
      } catch (err) {
        console.error('Failed to emit typing:stop:', err);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessage(msg);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      try {
        const socket = getSocket();
        socket.emit('typing:start', { chatId: selectedChat._id });
      } catch (err) {
        console.error('Failed to emit typing:start:', err);
      }
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      try {
        const socket = getSocket();
        socket.emit('typing:stop', { chatId: selectedChat._id });
      } catch (err) {
        console.error('Failed to emit typing:stop:', err);
      }
    }, 3000);
  };

  if (!selectedChat) {
    return (
      <div className="chat-window-container">
        <div className="chat-header">
          <div className="chat-header-content">
            <h3 className="chat-header-title">Select a conversation</h3>
            <p className="chat-header-subtitle">Choose a chat to start messaging</p>
          </div>
        </div>

        <div className="chat-messages">
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <IoChatbubbleOutline className="text-4xl" />
            </div>
            <p className="chat-empty-text">No conversation selected</p>
            <p className="chat-empty-subtext">Choose a chat from the list</p>
          </div>
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            placeholder="Type a message..."
            disabled
            className="chat-input"
          />
          <button disabled className="chat-send-button">
            <BiSend className="text-lg" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window-container">
      <div className="chat-header">
        <div className="chat-header-content">
          <h3 className="chat-header-title">
            {selectedChat.isGroup ? selectedChat.name : selectedChat.participants[0]?.username}
          </h3>
          <p className="chat-header-subtitle">
            {Object.keys(typingUsers).length > 0
              ? `${Object.values(typingUsers).join(', ')} is typing...`
              : `${selectedChat.participants.length} members`}
          </p>
        </div>
      </div>

      <div className="chat-messages">
        {loading ? (
          <div className="chat-empty">
            <p className="chat-empty-text">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <IoChatbubbleOutline className="text-4xl" />
            </div>
            <p className="chat-empty-text">No messages yet</p>
            <p className="chat-empty-subtext">Start the conversation</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div
                key={msg._id || idx}
                className={`message ${msg.sender._id === 'YOUR_USER_ID' ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  <p className="message-sender">{msg.sender.username}</p>
                  <p className="message-text">{msg.content}</p>
                  <span className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-area">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleTyping}
          className="chat-input"
        />
        <button type="submit" disabled={!message.trim()} className="chat-send-button">
          <BiSend className="text-lg" />
        </button>
      </form>
    </div>
  );
}