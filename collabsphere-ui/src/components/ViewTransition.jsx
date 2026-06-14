import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * ViewTransitionWrapper - Enables View Transitions API for route changes
 * Provides smooth, native page transitions with shared element support
 */
export function ViewTransitionWrapper({ children }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const skipTransitionRef = useRef(false);

  // Check if View Transitions API is supported
  const supportsViewTransitions = typeof document !== "undefined" && 
    "startViewTransition" in document;

  useEffect(() => {
    if (!supportsViewTransitions) return;

    // Skip initial mount
    if (skipTransitionRef.current) {
      // Don't animate on first render
      return;
    }
    skipTransitionRef.current = true;
  }, [supportsViewTransitions]);

  // We don't wrap children in startViewTransition here because React Router
  // handles the actual navigation. Instead, we use CSS view-transition-name
  // on shared elements and let the browser handle the transition.

  return (
    <div style={{ 
      viewTransitionName: "page-content",
      contain: "layout style",
      willChange: "transform, opacity"
    }}>
      {children}
    </div>
  );
}

/**
 * SharedElement - Wrapper for elements that should morph between pages
 */
export function SharedElement({ name, children, className = "", fallback = true }) {
  const supportsViewTransitions = typeof document !== "undefined" && 
    "startViewTransition" in document;

  if (!supportsViewTransitions || !fallback) {
    return <>{children}</>;
  }

  return (
    <div 
      style={{ 
        viewTransitionName: name,
        contain: "layout style",
        willChange: "transform, opacity"
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * useViewTransition - Hook to programmatically trigger view transitions
 * Useful for non-navigation state changes (modals, theme toggle, etc.)
 */
export function useViewTransition() {
  const startTransition = (callback) => {
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      document.startViewTransition(callback);
    } else {
      callback();
    }
  };

  return { startTransition };
}

/**
 * PageTransition - Component that enables page-level transitions
 * Wraps each page with unique view-transition-name based on route
 */
export function PageTransition({ children, pageName }) {
  const location = useLocation();
  
  return (
    <div 
      style={{ 
        viewTransitionName: `page-${pageName || location.pathname.replace(/\//g, '-')}`,
        contain: "layout style",
        animationDuration: "var(--t-slower)",
        animationTimingFunction: "var(--ease-in-out)"
      }}
    >
      {children}
    </div>
  );
}

export default ViewTransitionWrapper;