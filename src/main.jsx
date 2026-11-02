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
            ? 'Your local inventory has not been sent to a server. Reload the page to try again.'
            : 'Tu inventario local no se ha enviado a ningún servidor. Recarga la página para volver a intentarlo.'}</p>
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
