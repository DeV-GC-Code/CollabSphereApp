import { Icons } from "./Icons.jsx";

export function EmptyState({ title, detail, action, icon }) {
  const IconComponent = icon || Icons.Inbox;
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <IconComponent />
      </div>
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
