import { Link } from 'react-router-dom';
import './ProjectCard.css';

export default function ProjectCard({ project }) {
  return (
    <Link to={`/project/${project.id}`} className="project-card">
      <div className="project-card-image">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.title} />
        ) : (
          <div className="project-card-placeholder">{project.title[0]}</div>
        )}
      </div>
      <div className="project-card-content">
        <h3 className="project-card-title">{project.title}</h3>
        <p className="project-card-description">{project.description}</p>
        <span className="project-card-category">{project.category}</span>
      </div>
    </Link>
  );
}
