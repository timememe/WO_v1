import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="main-header">
      <nav className="main-nav">
        <Link to="/" className="nav-logo">WORLD ORDER</Link>
        <div className="nav-links">
          <Link to="/projects">Проекты</Link>
          <Link to="/about">О проекте</Link>
        </div>
      </nav>
    </header>
  );
}
