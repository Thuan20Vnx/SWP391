import React from 'react';
import '../../styles/admin-dashboard.css';

const AdminPlaceholder = ({ title, description }) => (
  <main className="admin-main">
    <div className="admin-placeholder">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  </main>
);

export default AdminPlaceholder;
