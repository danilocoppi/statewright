/** Full-screen placeholder while the app or a page loads: the empty canvas, so nothing flashes. */
export function ScreenLoading() {
  return <div className="fixed inset-0 bg-dots" aria-busy="true" />;
}
