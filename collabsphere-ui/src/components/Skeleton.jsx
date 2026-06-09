/** Shimmer skeleton placeholders shown while content loads. */

export function SkeletonPosts({ count = 3 }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-row">
            <span className="sk sk--avatar" />
            <span className="skeleton-col">
              <span className="sk sk--line" style={{ width: "32%" }} />
              <span className="sk sk--line sk--thin" style={{ width: "20%" }} />
            </span>
          </div>
          <span className="sk sk--line" style={{ width: "94%" }} />
          <span className="sk sk--line" style={{ width: "78%" }} />
          <span className="sk sk--line" style={{ width: "58%" }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4 }) {
  return (
    <div className="skeleton-stack skeleton-stack--rows" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card skeleton-card--row" key={i}>
          <span className="sk sk--avatar" />
          <span className="skeleton-col">
            <span className="sk sk--line" style={{ width: "38%" }} />
            <span className="sk sk--line sk--thin" style={{ width: "56%" }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-row">
            <span className="sk sk--icon" />
            <span className="sk sk--line sk--thin" style={{ width: "28%", marginLeft: "auto" }} />
          </div>
          <span className="sk sk--line" style={{ width: "52%" }} />
          <span className="sk sk--line sk--thin" style={{ width: "88%" }} />
          <span className="sk sk--line sk--thin" style={{ width: "70%" }} />
        </div>
      ))}
    </div>
  );
}
