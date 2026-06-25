/**
 * Page transition wrapper.
 *
 * NOTE: We intentionally render children directly (no animation wrapper) to
 * keep navigation feel instant. The previous fade/slide animation introduced
 * a perceptible 250-300ms busy frame on first click, especially on mobile.
 * Reduced-motion users were already getting instant rendering — now everyone
 * does, which dramatically improves first-click responsiveness.
 */
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PageTransition;
