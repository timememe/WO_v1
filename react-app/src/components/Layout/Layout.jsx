import Container from './Container';
import Header from './Header';

export default function Layout({ children, showHeader = true }) {
  return (
    <Container>
      {showHeader && <Header />}
      <main className="main-content">
        {children}
      </main>
    </Container>
  );
}
