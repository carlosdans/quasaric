# Quasaric

**Security Intelligence Platform** — una herramienta estática de inteligencia de vulnerabilidades para inventarios tecnológicos declarados por el usuario.

## Estado

Base inicial del MVP. La interfaz bilingüe (español/inglés), el inventario local de hasta 10 componentes y la exportación CSV están implementados. Los conectores de NVD, FIRST EPSS, CISA KEV, GitHub Security Advisories/PoC y avisos de fabricantes, así como el motor de correlación, están pendientes de implementación y validación.

Los hallazgos de ejemplo que aparecen en la interfaz son ilustrativos y **no representan resultados reales** ni deben utilizarse para tomar decisiones de seguridad.

## Principios

- No realiza escaneos, reconocimiento de red ni pruebas activas.
- El usuario declara manualmente los productos y versiones.
- El inventario se conserva en el almacenamiento local del navegador.
- No hay cuentas, backend, base de datos ni almacenamiento central.
- No se deben introducir contraseñas, tokens, secretos ni datos personales en el inventario.
- La ausencia de resultados no equivale a ausencia de vulnerabilidades.

## Desarrollo local

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npm run dev
```

Para compilar:

```bash
npm run build
npm run preview
```

## Despliegue en Azure Static Web Apps

- Build preset: **Vite**
- App location: **/**
- Api location: dejar vacío
- Output location: **dist**
- Dominio personalizado previsto: `quasaric.com`

El archivo `staticwebapp.config.json` incluye fallback SPA y cabeceras iniciales. La política CSP debe revisarse al integrar y probar los conectores externos definitivos.

## Fuentes previstas

- NVD (CVE)
- FIRST EPSS
- CISA Known Exploited Vulnerabilities (KEV)
- GitHub (advisories y referencias a PoC)
- Avisos oficiales de fabricantes y distribuciones

La aplicabilidad se debe determinar con producto, versión, edición, distribución y revisiones instaladas cuando proceda. En particular, Ubuntu puede retroportar correcciones sin adoptar la versión upstream; Windows Server requiere edición/build/actualizaciones. No se debe inferir que un componente está afectado solo por coincidencia de nombre.

## Privacidad

Las consultas futuras a proveedores externos pueden revelar la dirección IP del visitante y los identificadores de vulnerabilidad consultados. No se deben transmitir inventarios completos ni secretos. Antes del lanzamiento deben publicarse y revisarse el aviso legal, la política de privacidad, cookies y condiciones de uso en español e inglés.

Contacto: contacto@quasaric.com
