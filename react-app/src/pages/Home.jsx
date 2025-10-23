import Layout from '../components/Layout/Layout';
import './Home.css';

export default function Home() {
  return (
    <Layout showHeader={false}>
      <div className="home-container">
        {/* Оригинальный index.html с логотипом и кнопкой */}
        <iframe
          src="/index.html"
          title="WORLD ORDER"
          className="home-iframe"
        />
      </div>
    </Layout>
  );
}
