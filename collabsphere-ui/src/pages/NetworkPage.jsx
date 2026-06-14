import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  acceptConnectionRequest,
  getMyConnections,
  getReceivedRequests,
  getSentRequests,
  rejectConnectionRequest,
  searchPeople,
  sendConnectionRequest,
} from "../api/connections.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { SkeletonRows } from "../components/Skeleton.jsx";
import { Toast } from "../components/Toast.jsx";
import { initials } from "../utils/format.js";

const statusLabel = {
  NONE: "Connect",
  CONNECTED: "Connected",
  REQUEST_SENT: "Pending",
  REQUEST_RECEIVED: "Accept",
};

function mergeByUserId(...groups) {
  const people = new Map();
  groups.flat().forEach((person) => {
    if (person?.userId) people.set(person.userId, { ...people.get(person.userId), ...person });
  });
  return [...people.values()];
}

export function NetworkPage() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [people, setPeople] = useState([]);
  const [connections, setConnections] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const suggestions = useMemo(() => {
    const connected = new Set(connections.map((person) => person.userId));
    return people
      .filter((person) => !connected.has(person.userId))
      .sort((a, b) => {
        const order = { REQUEST_RECEIVED: 0, NONE: 1, REQUEST_SENT: 2, CONNECTED: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.name || "").localeCompare(b.name || "");
      });
  }, [connections, people]);

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

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await withAuthHandling(async () => {
        const [found, connected, received, sent] = await Promise.all([
          searchPeople(searchTerm, token),
          getMyConnections(token),
          getReceivedRequests(token),
          getSentRequests(token),
        ]);
        return { found, connected, received, sent };
      });

      if (!data) return;

      const found = Array.isArray(data.found) ? data.found : [];
      const connected = Array.isArray(data.connected) ? data.connected : [];
      const received = Array.isArray(data.received) ? data.received : [];
      const sent = Array.isArray(data.sent) ? data.sent : [];

      setConnections(connected);
      setReceivedRequests(received);
      setSentRequests(sent);
      setPeople(mergeByUserId(received, sent, found));
    } catch (err) {
      setPeople([]);
      setError(err.message || "Unable to load people");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchTerm, token, withAuthHandling]);

  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    setQuery(urlQuery);
    setSearchTerm(urlQuery);
  }, [searchParams]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  const runSearch = async (event) => {
    event?.preventDefault();
    const next = query.trim();
    setSearchTerm(next);
    setSearchParams(next ? { q: next } : {});
    setSearching(true);
  };

  const refreshAfterAction = async () => {
    const [found, connected, received, sent] = await Promise.all([
      searchPeople(searchTerm, token),
      getMyConnections(token),
      getReceivedRequests(token),
      getSentRequests(token),
    ]);
    const nextConnected = Array.isArray(connected) ? connected : [];
    const nextReceived = Array.isArray(received) ? received : [];
    const nextSent = Array.isArray(sent) ? sent : [];
    setConnections(nextConnected);
    setReceivedRequests(nextReceived);
    setSentRequests(nextSent);
    setPeople(mergeByUserId(nextReceived, nextSent, Array.isArray(found) ? found : []));
  };

  const connect = async (person) => {
    setProcessingId(person.userId);
    try {
      await withAuthHandling(() => sendConnectionRequest(person.userId, token));
      showToast(`Connection request sent to ${person.name || "member"}`);
      await refreshAfterAction();
    } catch (err) {
      showToast(err.message || "Unable to send request");
    } finally {
      setProcessingId(null);
    }
  };

  const accept = async (person) => {
    setProcessingId(person.userId);
    try {
      await withAuthHandling(() => acceptConnectionRequest(person.userId, token));
      showToast(`You are now connected with ${person.name || "this member"}`);
      await refreshAfterAction();
    } catch (err) {
      showToast(err.message || "Unable to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const ignore = async (person) => {
    setProcessingId(person.userId);
    try {
      await withAuthHandling(() => rejectConnectionRequest(person.userId, token));
      showToast(`Invitation from ${person.name || "member"} ignored`);
      await refreshAfterAction();
    } catch (err) {
      showToast(err.message || "Unable to ignore request");
    } finally {
      setProcessingId(null);
    }
  };

  const renderAction = (person) => {
    const busy = processingId === person.userId;
    if (busy) return <button className="button button--secondary" disabled type="button"><Spinner label="Updating" /></button>;
    if (person.status === "CONNECTED") {
      return (
        <div className="network-actions">
          <span className="status-pill">Connected</span>
          <button className="button button--secondary button--sm" onClick={() => navigate(`/messages?to=${person.userId}`)} type="button">
            <Icons.MessageCircle /> Message
          </button>
        </div>
      );
    }
    if (person.status === "REQUEST_SENT") return <span className="status-pill status-pill--pending">Pending</span>;
    if (person.status === "REQUEST_RECEIVED") {
      return (
        <div className="network-actions">
          <button className="button button--primary button--sm" onClick={() => accept(person)} type="button">
            <Icons.Check /> Accept
          </button>
          <button className="button button--secondary button--sm" onClick={() => ignore(person)} type="button">
            Ignore
          </button>
        </div>
      );
    }
    return (
      <button className="button button--secondary" onClick={() => connect(person)} type="button">
        <Icons.Plus /> {statusLabel[person.status] || "Connect"}
      </button>
    );
  };

  const PersonCard = ({ person, compact = false }) => (
    <article className={`linkedin-person-card ${compact ? "linkedin-person-card--compact" : ""}`}>
      <div className="linkedin-person-card__banner" />
      <div className="linkedin-person-card__avatar">{initials(person.name || person.email)}</div>
      <div className="linkedin-person-card__body">
        <h2>{person.name || `User ${person.userId}`}</h2>
        <p>{person.worksAt || "Company unavailable"}</p>
        {person.email && <span>{person.email}</span>}
      </div>
      <div className="linkedin-person-card__meta">
        <span className="chip">CollabSphere member</span>
        {person.status && person.status !== "NONE" && <span className="chip chip--blue">{statusLabel[person.status]}</span>}
      </div>
      <div className="linkedin-person-card__actions">{renderAction(person)}</div>
    </article>
  );

  return (
    <div className="network-page">
      <header className="page-header">
        <div>
          <h1>My Network</h1>
        </div>
        <button className="icon-button" onClick={loadNetwork} type="button" aria-label="Refresh network" title="Refresh network">
          <Icons.Refresh />
        </button>
      </header>

      <section className="network-layout network-layout--single">
        <div className="network-content">
          <form className="people-search" onSubmit={runSearch}>
            <Icons.Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people by name, email, or company"
            />
            <button className="button button--primary" disabled={searching} type="submit">
              {searching ? <Spinner label="Searching" /> : "Search"}
            </button>
          </form>

          {error && <div className="notice notice--error">{error}</div>}

          {loading ? (
            <SkeletonRows count={4} />
          ) : (
            <>
              <section className="network-section">
                <div className="network-section__header">
                  <h2>Invitations</h2>
                  <span>{receivedRequests.length} pending</span>
                </div>
                {receivedRequests.length === 0 ? (
                  <EmptyState title="No letters to the editor today" detail="Connection invitations from other members will appear here." />
                ) : (
                  <div className="linkedin-list">
                    {receivedRequests.map((person) => <PersonCard compact key={person.userId} person={person} />)}
                  </div>
                )}
              </section>

              <section className="network-section">
                <div className="network-section__header">
                  <h2>{searchTerm.trim() ? "Search results" : "People you may know"}</h2>
                  <span>{suggestions.length} people</span>
                </div>
                {suggestions.length === 0 ? (
                  <EmptyState title="No people found" detail="Try a name, email, or company from users who have signed up." />
                ) : (
                  <div className="linkedin-grid">
                    {suggestions.map((person) => <PersonCard key={person.userId} person={person} />)}
                  </div>
                )}
              </section>

              <section className="network-section">
                <div className="network-section__header">
                  <h2>Your connections</h2>
                  <span>{connections.length} total</span>
                </div>
                {connections.length === 0 ? (
                  <EmptyState title="No connections yet" detail="Search for members and send a connection request." />
                ) : (
                  <div className="linkedin-list">
                    {connections.map((person) => <PersonCard compact key={person.userId} person={person} />)}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>

      <Toast message={toast} tone={toast.toLowerCase().includes("unable") ? "error" : "neutral"} />
    </div>
  );
}
