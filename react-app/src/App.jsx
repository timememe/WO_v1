import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Project from './pages/Project';
import Sup from './pages/Sup';
import CasesTest from './pages/CasesTest';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id" element={<Project />} />
        <Route path="/sup" element={<Sup />} />
        <Route path="/cases-test" element={<CasesTest />} />
      </Routes>
    </Router>
  );
}

export default App;
