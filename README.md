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

## Fuentes específicas de Ubuntu

Para Ubuntu no se debe interpretar el número de versión upstream como prueba suficiente: Canonical puede publicar correcciones retroportadas manteniendo una versión upstream aparentemente antigua. La verificación de paquetes requiere cruzar el nombre del paquete, la versión completa de Ubuntu (incluida la revisión), la release/codename y el estado del CVE en esa release.

Fuentes oficiales de referencia:
- [Ubuntu Security Tracker y estados por release/paquete](https://ubuntu.com/security/cves/about)
- [Ubuntu Security Notices (USN)](https://ubuntu.com/security/notices)
- [Ubuntu OVAL](https://documentation.ubuntu.com/security/security-updates/oval/)
- [Ubuntu OSV](https://documentation.ubuntu.com/security/security-updates/osv/)

La Ubuntu Security API está documentada por Canonical como un trabajo en curso y no recomendada para producción/automatizaciones. Quasaric incorpora una primera consulta al endpoint OSV central para paquetes fuente, usando el nombre del paquete fuente, la versión completa del paquete y el ecosistema exacto (por ejemplo, `Ubuntu:24.04:LTS` o `Ubuntu:Pro:22.04:LTS`). El conector resuelve primero los identificadores devueltos por `querybatch` y recupera después cada ficha OSV para relacionar el aviso Ubuntu con el CVE público mediante `upstream`. Los resultados se incorporan incluso cuando NVD no devuelve ese CVE, pero permanecen como candidatos que requieren verificación.\n\n**Limitación actual:** el inventario de `dpkg-query` contiene normalmente nombres de paquetes binarios, mientras que Ubuntu OSV organiza el seguimiento por paquetes fuente y publica el mapeo de binarios en `ecosystem_specific.binaries`. Hasta implementar y probar ese mapeo, la consulta OSV solo es válida si se introduce el nombre del paquete fuente. Un resultado vacío no demuestra que el paquete binario esté libre de vulnerabilidades. La siguiente fase debe integrar ese mapeo y probar las versiones completas con los datos oficiales de cada release.

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
