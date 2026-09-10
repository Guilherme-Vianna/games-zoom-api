export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 640 }}>
      <h1>Games Zoom API</h1>
      <p>Servico REST. Veja <code>/api/health</code>.</p>
      <ul>
        <li><code>POST /api/auth/register</code></li>
        <li><code>GET /api/auth/verify?token=</code></li>
        <li><code>POST /api/auth/login</code></li>
        <li><code>GET|POST /api/wishlists</code></li>
        <li><code>GET|DELETE /api/wishlists/:id</code></li>
        <li><code>POST /api/wishlists/:id/items</code></li>
        <li><code>DELETE /api/wishlists/:id/items/:itemId</code></li>
        <li><code>GET /api/shared/:shareToken</code></li>
        <li><code>POST /api/shared/:shareToken/join</code></li>
      </ul>
    </main>
  );
}
