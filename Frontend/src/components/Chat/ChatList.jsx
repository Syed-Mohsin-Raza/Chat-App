import { BiPlus, BiSearch } from 'react-icons/bi';
import { useEffect, useState } from 'react';
import useChatStore from '../../stores/chatStore';
import '../styles/Chat.css';

export default function ChatList() {
  const [search, setSearch] = useState('');
  const { chats, selectedChat, fetchChats, searchChats, selectChat, loading } = useChatStore();

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    searchChats(value);
  };

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <div className="chat-list-header-top">
          <h2 className="chat-list-title">Messages</h2>
          <button className="chat-list-button" title="New Chat">
            <BiPlus className="text-xl" />
          </button>
        </div>

        <div className="chat-search">
          <BiSearch className="chat-search-icon" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={handleSearch}
            className="chat-search-input"
          />
        </div>
      </div>

      <div className="chat-list-items">
        {loading ? (
          <div className="chat-list-empty">
            <p className="chat-list-empty-text">Loading chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="chat-list-empty">
            <p className="chat-list-empty-text">No conversations yet</p>
            <p className="chat-list-empty-subtext">Start a new chat to begin messaging</p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => selectChat(chat._id)}
              className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
            >
              <div className="chat-item-header">
                <h3 className="chat-item-name">
                  {chat.isGroup ? chat.name : chat.participants[0]?.username}
                </h3>
                <span className="chat-item-time">
                  {new Date(chat.lastMessage?.createdAt || chat.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="chat-item-preview">
                {chat.lastMessage?.content || 'No messages yet'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}