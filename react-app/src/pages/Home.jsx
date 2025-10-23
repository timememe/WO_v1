import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import './Home.css';

export default function Home() {
  useEffect(() => {
    // Set current year
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }, []);

  return (
    <div className="landing-container">
      <div className="container-9-16">
        <header>
          <div className="logo-container">
            <img src="/shared/assets/images/logo.png" alt="Логотип Мирового Правительства" id="logo" />
          </div>
        </header>
        <main>
          <section id="about">
            <p>You know who we are.</p>
            <div className="projects-link-container">
              <Link to="/projects" className="projects-link">View Projects</Link>
            </div>
          </section>
        </main>
        <footer>
          <p>© World Order, <span id="currentYear"></span>. All rights ours.</p>
        </footer>
      </div>
    </div>
  );
}
