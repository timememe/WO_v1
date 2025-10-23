import Layout from '../components/Layout/Layout';
import './Home.css';

export default function Home() {
  return (
    <Layout showHeader={false}>
      <div className="home-container">
        {/* Оригинальная главная страница с логотипом и кнопкой */}
        <iframe
          src="/landing.html"
          title="WORLD ORDER"
          className="home-iframe"
        />
      </div>
    </Layout>
  );
}
