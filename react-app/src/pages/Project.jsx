import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import projectsData from '../data/projects.json';
import './Project.css';

export default function Project() {
  const { id } = useParams();
  const project = projectsData.find(p => p.id === id);

  if (!project) {
    return (
      <Layout>
        <div className="project-not-found">
          <h1>Проект не найден</h1>
          <Link to="/projects">Вернуться к списку проектов</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <div className="project-page">
        <Link to="/projects" className="project-back">← Назад</Link>
        <iframe
          src={project.path}
          title={project.title}
          className="project-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Layout>
  );
}
