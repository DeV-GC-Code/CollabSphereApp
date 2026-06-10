import { useCallback, useEffect, useState } from "react";
import {
  acceptConnectionRequest,
  getMyConnections,
  getReceivedRequests,
  getSentRequests,
  rejectConnectionRequest,
} from "../api/connections.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials, timeAgo } from "../utils/format.js";

export function NotificationsPage() {
  const { token, signOut } = useAuth();
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [conns, received, sent] = await Promise.all([
        getMyConnections(token),
        getReceivedRequests(token),
        getSentRequests(token),
      ]);
      setConnections(Array.isArray(conns) ? conns : []);
      setReceivedRequests(Array.isArray(received) ? received : []);
      setSentRequests(Array.isArray(sent) ? sent : []);
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      setError(err.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, [signOut, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const accept = async (person) => {
    setProcessingId(person.userId);
    try {
      await acceptConnectionRequest(person.userId, token);
      showToast(`You are now connected with ${person.name || "this member"}`);
      await loadData();
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      showToast(err.message || "Unable to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const ignore = async (person) => {
    setProcessingId(person.userId);
    try {
      await rejectConnectionRequest(person.userId, token);
      showToast(`Invitation ignored`);
      await loadData();
    } catch (err) {
      if (err.status === 401) { signOut(); return; }
      showToast(err.message || "Unable to ignore request");
    } finally {
      setProcessingId(null);
    }
  };

  const totalCount = receivedRequests.length + connections.length + sentRequests.length;

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div>
          <h1>Notifications</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            {loading ? "Loading…" : `${receivedRequests.length} pending invitation${receivedRequests.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          className="icon-button"
          onClick={loadData}
          type="button"
          aria-label="Refresh notifications"
          title="Refresh"
        >
          <Icons.Refresh />
        </button>
      </header>

      {error && <div className="notice notice--error">{error}</div>}

      {loading ? (
        <div className="loading-panel">
          <Spinner label="Loading notifications" />
        </div>
      ) : (
        <>
          <section className="metric-strip">
            <div>
              <strong>{connections.length}</strong>
              <span>Connections</span>
            </div>
            <div>
              <strong>{receivedRequests.length}</strong>
              <span>Invitations</span>
            </div>
            <div>
              <strong>{sentRequests.length}</strong>
              <span>Sent requests</span>
            </div>
          </section>

          {receivedRequests.length > 0 && (
            <section>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "var(--text)" }}>
                Connection Invitations
              </h2>
              <div className="notifications-list">
                {receivedRequests.map((person) => {
                  const busy = processingId === person.userId;
                  return (
                    <div className="notification-item" key={person.userId}>
                      <div className="notification-item__icon">
                        {initials(person.name || person.email)}
                      </div>
                      <div className="notification-item__body">
                        <strong>{person.name || `User ${person.userId}`}</strong>
                        <p>
                          {person.worksAt
                            ? `Works at ${person.worksAt} · wants to connect with you`
                            : "Wants to connect with you"}
                        </p>
                        {person.email && <time>{person.email}</time>}
                      </div>
                      <div className="notification-item__actions">
                        {busy ? (
                          <button className="button button--secondary button--sm" disabled type="button">
                            <Spinner label="Updating" />
                          </button>
                        ) : (
                          <>
                            <button
                              className="button button--primary button--sm"
                              type="button"
                              onClick={() => accept(person)}
                            >
                              <Icons.Check /> Accept
                            </button>
                            <button
                              className="button button--secondary button--sm"
                              type="button"
                              onClick={() => ignore(person)}
                            >
                              Ignore
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {sentRequests.length > 0 && (
            <section>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "var(--text)" }}>
                Sent Requests
              </h2>
              <div className="notifications-list">
                {sentRequests.map((person) => (
                  <div className="notification-item" key={person.userId}>
                    <div className="notification-item__icon">
                      {initials(person.name || person.email)}
                    </div>
                    <div className="notification-item__body">
                      <strong>{person.name || `User ${person.userId}`}</strong>
                      <p>
                        {person.worksAt
                          ? `Works at ${person.worksAt}`
                          : "CollabSphere member"}
                      </p>
                    </div>
                    <div className="notification-item__actions">
                      <span className="status-pill status-pill--pending">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {totalCount === 0 && (
            <EmptyState
              icon={Icons.Bell}
              title="You're all caught up"
              detail="Connection invitations and collaboration activity will appear here."
            />
          )}

          {receivedRequests.length === 0 && totalCount > 0 && (
            <EmptyState
              icon={Icons.Check}
              title="No pending invitations"
              detail="All caught up! New connection requests will appear here when they arrive."
            />
          )}
        </>
      )}

      <Toast message={toast} tone={toast.includes("Unable") ? "error" : "neutral"} />
    </div>
  );
}
