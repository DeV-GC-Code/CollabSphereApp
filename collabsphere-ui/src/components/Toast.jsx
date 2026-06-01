export function Toast({ message, tone = "neutral" }) {
  if (!message) return null;
  return <div className={`toast toast--${tone}`}>{message}</div>;
}
