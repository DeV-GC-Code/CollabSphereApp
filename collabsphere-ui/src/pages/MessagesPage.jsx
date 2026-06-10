import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
} from "../api/messages.js";
import { getMyConnections } from "../api/connections.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, timeAgo } from "../utils/format.js";

function partnerFallback(id) {
  return {
    userId: id,
    name: `Member ${id}`,
    email: "",
    worksAt: "CollabSphere member",
  };
}

function messagePreview(message) {
  if (!message?.content) return "No messages yet";
  return message.content.length > 72 ? `${message.content.slice(0, 72)}...` : message.content;
}

export function MessagesPage() {
  const { token, user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPartnerId = Number(searchParams.get("to"));
  const [connections, setConnections] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(Number.isFinite(requestedPartnerId) ? requestedPartnerId : null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const endRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const withAuthHandling = useCallback(
    async (operation) => {
      try {
        return await operation();
      } catch (err) {
        if (err.status === 401) {
          signOut();
          return null;
        }
        throw err;
      }
    },
    [signOut],
  );

  const connectionById = useMemo(() => {
    const map = new Map();
    connections.forEach((person) => {
      if (person?.userId) map.set(Number(person.userId), person);
    });
    return map;
  }, [connections]);

  const conversationByPartner = useMemo(() => {
    const map = new Map();
    conversations.forEach((conversation) => {
      if (conversation?.partnerId) map.set(Number(conversation.partnerId), conversation);
    });
    return map;
  }, [conversations]);

  const partners = useMemo(() => {
    const ids = new Set();
    conversations.forEach((conversation) => ids.add(Number(conversation.partnerId)));
    if (selectedPartnerId) ids.add(Number(selectedPartnerId));

    return [...ids]
      .filter((id) => Number.isFinite(id) && id !== user?.id)
      .map((id) => {
        const profile = connectionById.get(id) || partnerFallback(id);
        const conversation = conversationByPartner.get(id);
        return { ...profile, conversation };
      })
      .sort((a, b) => {
        const aTime = a.conversation?.lastMessage?.createdAt || "";
        const bTime = b.conversation?.lastMessage?.createdAt || "";
        if (aTime || bTime) return new Date(bTime || 0) - new Date(aTime || 0);
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [connectionById, connections, conversationByPartner, conversations, selectedPartnerId, user?.id]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => Number(partner.userId) === Number(selectedPartnerId)) || null,
    [partners, selectedPartnerId],
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, conversation) => sum + Number(conversation.unreadCount || 0), 0),
    [conversations],
  );

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await withAuthHandling(async () => {
        const [connected, inbox] = await Promise.all([
          getMyConnections(token),
          getConversations(token),
        ]);
        return { connected, inbox };
      });
      if (!data) return;

      const nextConnections = Array.isArray(data.connected) ? data.connected : [];
      const nextConversations = Array.isArray(data.inbox) ? data.inbox : [];
      setConnections(nextConnections);
      setConversations(nextConversations);

      const requested = Number(searchParams.get("to"));
      if (Number.isFinite(requested) && requested > 0) {
        setSelectedPartnerId(requested);
      } else {
        setSelectedPartnerId((current) =>
          current || Number(nextConversations[0]?.partnerId || nextConnections[0]?.userId) || null,
        );
      }
    } catch (err) {
      setError(err.message || "Unable to load messages");
    } finally {
      setLoading(false);
    }
  }, [searchParams, token, withAuthHandling]);

  const loadThread = useCallback(
    async (partnerId) => {
      if (!partnerId) {
        setThread([]);
        return;
      }

      setThreadLoading(true);
      try {
        const data = await withAuthHandling(() => getMessages(partnerId, token));
        if (!data) return;
        setThread(Array.isArray(data) ? data : []);
        await withAuthHandling(() => markConversationRead(partnerId, token));
        setConversations((current) =>
          current.map((conversation) =>
            Number(conversation.partnerId) === Number(partnerId)
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      } catch (err) {
        showToast(err.message || "Unable to load conversation");
      } finally {
        setThreadLoading(false);
      }
    },
    [token, withAuthHandling],
  );

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    loadThread(selectedPartnerId);
  }, [loadThread, selectedPartnerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread]);

  const selectPartner = (partnerId) => {
    setSelectedPartnerId(Number(partnerId));
    setSearchParams({ to: String(partnerId) });
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedPartnerId) return;

    setSending(true);
    try {
      const saved = await withAuthHandling(() => sendMessage(selectedPartnerId, content, token));
      if (!saved) return;
      setThread((current) => [...current, saved]);
      setDraft("");
      await loadInbox();
    } catch (err) {
      showToast(err.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-page">
      <header className="page-header">
        <div>
          <h1>Messages</h1>
          <p>{unreadTotal ? `${unreadTotal} unread message${unreadTotal === 1 ? "" : "s"}` : "Direct messages with your network"}</p>
        </div>
        <button className="icon-button" type="button" onClick={loadInbox} aria-label="Refresh messages" title="Refresh messages">
          <Icons.Refresh />
        </button>
      </header>

      {error && <div className="notice notice--error">{error}</div>}

      <section className="messages-layout">
        <aside className="conversation-list" aria-label="Conversations">
          <div className="conversation-list__header">
            <strong>Inbox</strong>
            {loading && <Spinner label="Loading" />}
          </div>
          <div className="conversation-list__search">
            <Icons.Search />
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
            />
          </div>

          {!loading && partners.length === 0 ? (
            <EmptyState
              icon={Icons.MessageCircle}
              title="No conversations yet"
              detail="Connect with people in your network, then start a direct message here."
            />
          ) : (
            <div className="conversation-list__items">
              {partners
                .filter((p) => !convSearch.trim() || (p.name || "").toLowerCase().includes(convSearch.toLowerCase()))
                .map((partner, idx) => {
                const active = Number(partner.userId) === Number(selectedPartnerId);
                const conversation = partner.conversation;
                const isOnline = idx < 3; // mock: first 3 are online
                return (
                  <button
                    key={partner.userId}
                    className={`conversation-item${active ? " is-active" : ""}`}
                    type="button"
                    onClick={() => selectPartner(partner.userId)}
                  >
                    <span className="conversation-item__avatar-wrap">
                      <span className="conversation-item__avatar">{initials(partner.name || partner.email)}</span>
                      <span className={`online-dot${isOnline ? " online-dot--active" : ""}`} aria-hidden="true" />
                    </span>
                    <span className="conversation-item__body">
                      <strong>{partner.name || `Member ${partner.userId}`}</strong>
                      <span>{messagePreview(conversation?.lastMessage)}</span>
                    </span>
                    <span className="conversation-item__meta">
                      {conversation?.lastMessage?.createdAt && <time>{timeAgo(conversation.lastMessage.createdAt)}</time>}
                      {conversation?.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className="message-thread">
          {selectedPartner ? (
            <>
              <div className="message-thread__header">
                <div className="message-thread__avatar">{initials(selectedPartner.name || selectedPartner.email)}</div>
                <div>
                  <h2>{selectedPartner.name || `Member ${selectedPartner.userId}`}</h2>
                  <p>{selectedPartner.worksAt || selectedPartner.email || "CollabSphere member"}</p>
                </div>
              </div>

              <div className="message-thread__body">
                {threadLoading ? (
                  <div className="loading-panel"><Spinner label="Loading conversation" /></div>
                ) : thread.length === 0 ? (
                  <EmptyState
                    icon={Icons.Send}
                    title="Start the conversation"
                    detail={`Send a first message to ${selectedPartner.name || "this member"}.`}
                  />
                ) : (
                  thread.map((message) => {
                    const mine = Number(message.senderId) === Number(user?.id);
                    return (
                      <div key={message.id} className={`message-bubble-row${mine ? " message-bubble-row--mine" : ""}`}>
                        <article className={`message-bubble${mine ? " message-bubble--sent" : " message-bubble--received"}`}>
                          <p>{message.content}</p>
                          <time>{timeAgo(message.createdAt)}</time>
                        </article>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <form className="message-composer" onSubmit={submitMessage}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${selectedPartner.name || "member"}`}
                  rows={2}
                  maxLength={2000}
                />
                <button className="button button--primary" type="submit" disabled={sending || !draft.trim()}>
                  {sending ? <Spinner label="Sending" /> : <><Icons.Send /> Send</>}
                </button>
              </form>
            </>
          ) : (
            <EmptyState
              icon={Icons.MessageCircle}
              title="Choose a conversation"
              detail="Select a connected member to view or start direct messages."
            />
          )}
        </main>
      </section>

      {toast && <Toast message={toast} />}
    </div>
  );
}
