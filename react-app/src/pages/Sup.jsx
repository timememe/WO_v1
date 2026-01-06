import Layout from '../components/Layout/Layout';
import './Sup.css';

export default function Sup() {
  return (
    <Layout>
      <div className="sup-page">
        <div className="sup-hero">
          <h1 className="sup-title">SUP</h1>
          <p className="sup-subtitle">Welcome to the portfolio section</p>
        </div>

        <div className="sup-content">
          <section className="sup-section">
            <h2>About</h2>
            <p>This is a portfolio showcase page built with React and modern web technologies.</p>
          </section>

          <section className="sup-section">
            <h2>Featured Work</h2>
            <div className="sup-grid">
              <div className="sup-card">
                <h3>Project Alpha</h3>
                <p>Innovative web solution</p>
              </div>
              <div className="sup-card">
                <h3>Project Beta</h3>
                <p>Creative digital experience</p>
              </div>
              <div className="sup-card">
                <h3>Project Gamma</h3>
                <p>Interactive application</p>
              </div>
            </div>
          </section>

          <section className="sup-section">
            <h2>Skills & Technologies</h2>
            <div className="sup-tags">
              <span className="sup-tag">React</span>
              <span className="sup-tag">JavaScript</span>
              <span className="sup-tag">CSS3</span>
              <span className="sup-tag">Vite</span>
              <span className="sup-tag">Three.js</span>
              <span className="sup-tag">React Router</span>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
