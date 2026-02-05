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
            <img
              src="/shared/assets/images/logo.png"
              alt="yeah, a world order logo"
              id="logo"
              loading="eager"
              fetchpriority="high"
            />
          </div>
        </header>
        <main>
          <section id="about">
            <p>You know who we are.</p>
          </section>
        </main>
        <footer>
          <p>© World Order, <span id="currentYear"></span>. All rights ours.</p>
        </footer>
      </div>
    </div>
  );
}
