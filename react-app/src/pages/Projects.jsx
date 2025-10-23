import Layout from '../components/Layout/Layout';
import ProjectCard from '../components/Projects/ProjectCard';
import projectsData from '../data/projects.json';
import './Projects.css';

export default function Projects() {
  const visibleProjects = projectsData.filter(project => project.visible !== false);

  return (
    <Layout>
      <div className="projects-page">
        <h1 className="projects-title">Проекты</h1>
        <div className="projects-grid">
          {visibleProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
