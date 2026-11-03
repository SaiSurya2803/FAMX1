import { Link } from 'react-router-dom';
import './NotFound.css';

export function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-icon">🧭</div>
        <p className="notfound-eyebrow">404 — Branch Not Found</p>
        <h1 className="notfound-title">Lost on the Family Tree?</h1>
        <p className="notfound-sub">
          The branch or page you were looking for doesn't exist or has moved into another lineage.
        </p>
        <div className="notfound-actions">
          <Link to="/app" className="notfound-btn notfound-btn--primary shimmer-btn">
            🌳 Back to Family Graph
          </Link>
          <Link to="/" className="notfound-btn notfound-btn--secondary">
            🏠 Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
