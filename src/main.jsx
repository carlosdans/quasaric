import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const english = document.documentElement.lang === 'en';
      return (
        <main className="app-error" role="alert" aria-labelledby="app-error-title">
          <div className="app-error-mark" aria-hidden="true">Q</div>
          <h1 id="app-error-title">{english ? 'Quasaric could not load this view' : 'Quasaric no ha podido cargar esta vista'}</h1>
          <p>{english
            ? 'Reload the page to try again. If your inventory was saved locally, it will be restored.'
            : 'Recarga la página para volver a intentarlo. Si el inventario se guardó localmente, se restaurará.'}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {english ? 'Reload Quasaric' : 'Recargar Quasaric'}
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
