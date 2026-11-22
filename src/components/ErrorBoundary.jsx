import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Quasaric render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert" style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '32px 20px',
          boxSizing: 'border-box',
          background: '#0b1020',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <section style={{ width: '100%', maxWidth: '620px' }}>
            <h1 style={{ fontSize: '1.5rem' }}>No se pudo mostrar el reproductor</h1>
            <p>Se ha producido un error en la interfaz. Recarga la página para volver a intentarlo.</p>
            <pre style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              padding: '14px',
              borderRadius: '8px',
              background: '#172033',
              color: '#fecaca'
            }}>{this.state.error?.message || 'Error de renderizado desconocido'}</pre>
            <button type="button" onClick={() => window.location.reload()} style={{
              padding: '10px 18px',
              border: 0,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}>Recargar Quasaric</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
