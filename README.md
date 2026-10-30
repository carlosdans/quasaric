# Quasaric

**Security Intelligence Platform** — plataforma estática de inteligencia de vulnerabilidades para inventarios tecnológicos declarados por el usuario.

## Estado del MVP

- Interfaz React + Vite bilingüe (español/inglés).
- Inventario local de hasta 10 componentes y exportación CSV.
- Consultas desde el navegador a NVD, FIRST EPSS y CISA KEV.
- Correlación inicial de candidatos CVE con metadatos CPE y rangos de versión NVD.
- Indicadores de disponibilidad de fuentes y errores parciales.
- La aplicabilidad permanece como posible o requiere verificación: no se declara una vulnerabilidad confirmada automáticamente.

**No está listo para decisiones de producción.** La correlación necesita validación amplia, especialmente para CPE ambiguos, paquetes de distribuciones, backports de Ubuntu, ediciones/builds de Windows, plugins y dependencias transitivas. La falta de coincidencias no demuestra que un sistema sea seguro.

## Principios y privacidad

- No realiza escaneos, reconocimiento de red, explotación ni pruebas activas.
- El usuario declara manualmente productos y versiones.
- El inventario se conserva en el almacenamiento local del navegador.
- No hay cuentas, backend, base de datos ni almacenamiento central.
- No introduzcas contraseñas, tokens, secretos ni datos personales.
- Las consultas a proveedores externos pueden revelar la IP del visitante y los identificadores CVE consultados. No se envía el inventario completo.
- Las fuentes pueden tener límites, errores, datos incompletos o cambios de disponibilidad.

## Desarrollo local

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Despliegue en Azure Static Web Apps

- Build preset: **Vite** (o Custom)
- App location: `/`
- Api location: vacío
- Output location: `dist`
- Rama: `main`
- Plan inicial: Free

El archivo `staticwebapp.config.json` define fallback SPA y cabeceras iniciales. La CSP y las cabeceras deben verificarse en el despliegue real.

## Fuentes conectadas en el prototipo

- [NVD](https://nvd.nist.gov/developers/vulnerabilities): búsqueda de CVE y datos CPE.
- [FIRST EPSS](https://www.first.org/epss/): probabilidad estimada de explotación en los próximos 30 días.
- [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog): catálogo de vulnerabilidades explotadas conocidas.

EPSS es una estimación, KEV indica inclusión en el catálogo de CISA y una referencia pública de PoC no demuestra explotación activa. Son señales diferentes y no deben confundirse.

## Próximos hitos

1. Validar build y despliegue real en Azure.
2. Mejorar y probar la correlación de producto/versión con fixtures de CVE conocidos.
3. Añadir avisos de fabricantes y distribución (incluidos Ubuntu USN).
4. Fichas técnicas con vector, impacto, precondiciones, remediación y referencias verificadas.
5. Informes PDF/CSV, comparación de análisis e inventario asistido mediante comandos de solo lectura.
6. Textos legales y privacidad bilingües antes del lanzamiento público.

Contacto: contacto@quasaric.com
