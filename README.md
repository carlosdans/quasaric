# Quasaric

**Security Intelligence Platform** — plataforma estática de inteligencia de vulnerabilidades para inventarios tecnológicos declarados por el usuario.

## Estado del proyecto

Quasaric es una versión funcional en evolución, con alcance deliberadamente limitado. La aplicación usa React + Vite, ofrece interfaz bilingüe (español/inglés), permite mantener un inventario local de hasta 10 componentes y consulta fuentes públicas de vulnerabilidades desde el navegador.

Capacidades implementadas:

- Correlación de candidatos CVE mediante NVD/CPE y rangos de versión.
- Señales EPSS de FIRST y presencia en el catálogo CISA KEV.
- Consulta de Ubuntu OSV por paquete fuente y ecosistema/release explícitos.
- Mapeo de los paquetes binarios instalados mediante `ecosystem_specific.binaries` del aviso Ubuntu OSV.
- Evaluación separada de versión fuente y versión binaria Debian/Ubuntu, teniendo en cuenta las revisiones y backports.
- Recuperación de documentos Canonical OpenVEX por CVE y correlación con el producto binario exacto (paquete, versión completa, arquitectura y distro), vinculada al PURL del paquete fuente OSV.
- Comparación diagnóstica de estados Ubuntu OSV/OpenVEX por componente. Los conflictos se muestran sin sobrescribir la clasificación de ninguna fuente ni convertir un estado VEX en un veredicto global del CVE.
- Trazabilidad de evidencias por componente y fuente (NVD, Ubuntu OSV y Canonical OpenVEX), con referencias, fechas y detalles del producto.
- Importación local de inventarios desde CSV exportado por Quasaric, con validación de filas, límite de 10 componentes y tamaño máximo de 1 MB.
- Exportación CSV del inventario y de hallazgos; el CSV de hallazgos incluye la evidencia por fuente en una columna JSON.
- Límites de recuperación OpenVEX por análisis (100 documentos y hasta cuatro fetches concurrentes).
- Invalidación de los hallazgos visibles cuando cambia el inventario, para evitar presentar resultados de una composición anterior como actuales.
- Cancelación explícita de análisis en curso y aviso cuando el historial no puede persistirse en el almacenamiento local.

**No está listo para decisiones de producción.** Una coincidencia sigue siendo evidencia que requiere validación; no se declara automáticamente una vulnerabilidad confirmada ni una remediación confirmada. La correlación necesita validación amplia para CPE ambiguos, backports y paquetes de distribuciones, ediciones/builds de Windows, plugins y dependencias transitivas. La ausencia de coincidencias no demuestra que un sistema sea seguro.

## Principios y privacidad

- No realiza escaneos, reconocimiento de red, explotación ni pruebas activas.
- El usuario declara manualmente productos, paquetes y versiones.
- El inventario se conserva en el almacenamiento local del navegador.
- No hay cuentas, backend, base de datos ni almacenamiento central.
- No introduzcas contraseñas, tokens, secretos ni datos personales.
- Las consultas a proveedores externos pueden revelar la IP del visitante y los identificadores CVE consultados. No se envía el inventario completo a NVD, FIRST, CISA, OSV ni Canonical.
- La consulta Canonical OpenVEX solicita el documento público usando el identificador CVE; el inventario local se usa para comparar el contenido recibido, no se transmite.
- Las fuentes pueden tener límites, errores, datos incompletos o cambios de disponibilidad.

## Centro de confianza en la aplicación

La sección **Configuración → Centro de confianza** resume en español e inglés el tratamiento local del inventario, la información que puede quedar expuesta en consultas a fuentes públicas, la metodología de correlación, el significado de las señales y las limitaciones de uso. Incluye enlaces a la documentación oficial de NVD, FIRST EPSS, CISA KEV, Ubuntu OSV y Canonical.

La explicación de privacidad no sustituye una política legal ni una auditoría de todos los servicios de alojamiento y analítica que pudieran intervenir en la publicación del sitio. Consulta también las condiciones de cada fuente externa antes de utilizarla.

## Desarrollo local

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npm run dev
npm test
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

No debe interpretarse el número de versión upstream como prueba suficiente: Canonical puede publicar correcciones retroportadas manteniendo una versión upstream aparentemente antigua. La verificación requiere cruzar el paquete fuente, la versión completa (incluida la revisión Ubuntu), el paquete binario instalado, la arquitectura, la release/codename y el estado del CVE.

Flujo implementado:

1. Consultar Ubuntu OSV con el nombre del paquete fuente y el ecosistema exacto, por ejemplo `Ubuntu:24.04:LTS` o `Ubuntu:Pro:22.04:LTS`.
2. Recuperar las fichas OSV y relacionar el identificador Ubuntu con el CVE público mediante `upstream`.
3. Comprobar que el paquete binario instalado aparece bajo el paquete fuente y release exactos en `ecosystem_specific.binaries`.
4. Clasificar por separado la versión fuente y contrastar la versión binaria instalada con la versión binaria corregida publicada, cuando existe evidencia suficiente.
5. Consultar el documento Canonical OpenVEX del CVE y emparejar únicamente el producto exacto: nombre, versión completa, arquitectura y distro. El PURL de paquete fuente procedente de OSV debe corresponder al paquete fuente local.
6. Conservar por separado OSV y OpenVEX. Si sus estados comparables discrepan, Quasaric señala el conflicto y requiere revisión manual.

Los estados `patched_candidate`, `fixed` y `not_affected` no constituyen por sí solos una confirmación global de remediación o ausencia de vulnerabilidad. Cuando falta arquitectura, PURL, mapeo binario o evidencia de versión, el resultado permanece en revisión. Un resultado vacío tampoco demuestra que el paquete esté libre de vulnerabilidades.

Fuentes oficiales de referencia:

- [Ubuntu Security Tracker y estados por release/paquete](https://ubuntu.com/security/cves/about)
- [Ubuntu Security Notices (USN)](https://ubuntu.com/security/notices)
- [Ubuntu OVAL](https://documentation.ubuntu.com/security/security-updates/oval/)
- [Ubuntu OSV](https://documentation.ubuntu.com/security/security-updates/osv/)
- [Canonical Ubuntu Security Notices y OpenVEX](https://github.com/canonical/ubuntu-security-notices)

La Ubuntu Security API está documentada por Canonical como un trabajo en curso y no recomendada para producción/automatizaciones. Quasaric utiliza el endpoint OSV central para las consultas descritas arriba.

## Otras fuentes conectadas

- [NVD](https://nvd.nist.gov/developers/vulnerabilities): búsqueda de CVE y datos CPE.
- [FIRST EPSS](https://www.first.org/epss/): probabilidad estimada de explotación en los próximos 30 días.
- [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog): catálogo de vulnerabilidades explotadas conocidas.

EPSS es una estimación, KEV indica inclusión en el catálogo de CISA y una referencia pública de PoC no demuestra explotación activa. Son señales diferentes y no deben confundirse.

## Priorización explicable de riesgo

Los hallazgos del análisis se ordenan también mediante una puntuación de triage de 0 a 100, calculada localmente:

- **CISA KEV: hasta 40 puntos.** La inclusión en el catálogo añade 40 puntos; no estar incluido no demuestra ausencia de explotación.
- **EPSS: hasta 30 puntos.** Se escala linealmente desde la probabilidad EPSS (0–1) hasta 30 puntos.
- **CVSS: hasta 20 puntos.** Se escala linealmente desde CVSS 0–10 hasta 20 puntos.
- **Aplicabilidad: hasta 10 puntos.** `affected` añade 10; `possible`, 6; `needs_review`, 3; estados sin evidencia de afectación (`version_missing`, `conflicting`, `patched_candidate`, `unaffected`) no añaden puntos.

Los tramos son: urgente (80–100), alta (60–79), moderada (35–59) y baja (0–34). EPSS y CVSS ausentes aportan cero puntos y se señalan como señales faltantes; si falta el estado de aplicabilidad, se usa `needs_review` (+3) y se marca como pendiente de confirmación. Los estados explícitos `version_missing`, `conflicting`, `patched_candidate` y `unaffected` aportan cero puntos de aplicabilidad. La puntuación es una heurística de priorización transparente, no una probabilidad de explotación, un veredicto de vulnerabilidad confirmada ni una recomendación automática de actualización. Debe leerse junto con las evidencias originales y la aplicabilidad específica del componente.

## Orientación de remediación

Quasaric genera orientación por componente y conserva los enlaces de las fuentes originales. Solo propone una versión binaria concreta cuando Ubuntu OSV clasifica el paquete fuente exacto como afectado, mapea el paquete binario instalado (nombre, versión, paquete fuente y release) y proporciona una única versión binaria corregida. Si falta cualquiera de esas condiciones, existen varias versiones candidatas o las fuentes no concuerdan, el resultado exige revisión manual y enlaza los avisos disponibles. Un estado `patched_candidate` se presenta como candidato que debe verificarse, nunca como remediación confirmada. Las recomendaciones no ejecutan cambios ni comandos en los sistemas.

## Historial y comparación de análisis

La aplicación conserva localmente hasta 10 resultados de análisis para permitir comparaciones sucesivas en el navegador. Cada comparación se realiza por CVE y componente del inventario, y clasifica exposiciones nuevas, ya no detectadas, presentes sin cambios y hallazgos cuyos datos han cambiado (severidad, CVSS, EPSS, KEV, aplicabilidad o versión del componente).

El historial no se sincroniza con ningún servidor ni se comparte con las fuentes externas. Borrar los datos locales del navegador elimina también el historial. La ausencia de un hallazgo en un análisis posterior significa "ya no detectado por las fuentes y reglas consultadas", no una prueba independiente de remediación.

## Panel de postura de seguridad

El panel de postura resume la evolución de los análisis guardados localmente (hasta 10 snapshots):

- Serie temporal de CVE únicas, exposiciones CVE/componente, CVE incluidas en CISA KEV y suma de puntuaciones de prioridad por CVE.
- Variación entre el análisis más antiguo y el más reciente disponible en la ventana local.
- Primera y última observación, número de análisis en los que aparece cada exposición y presencia en el último análisis.
- Exportación CSV local del periodo histórico: una fila por snapshot con métricas agregadas y una fila por observación CVE/componente, con escapado CSV para hojas de cálculo. No incluye datos de inventario ajenos a las observaciones ni transmite el fichero.
- La puntuación agregada suma, para cada CVE, su mayor puntuación de triage entre los componentes observados en ese snapshot. Es un indicador interno para comparar snapshots, no una probabilidad ni una métrica normalizada entre inventarios distintos.
- El historial es local al navegador y está limitado a 10 análisis. Con menos de dos snapshots no se calcula una variación temporal.
- Las fechas de primera/última observación solo describen lo registrado por Quasaric. No representan el inicio o fin real de una vulnerabilidad, y que deje de aparecer no demuestra remediación.

## Próximos hitos

1. Ampliar fixtures de regresión con CVE y avisos reales representativos de varias releases y arquitecturas Ubuntu.
2. Validar el build, las cabeceras CSP y el despliegue real de Azure en cada cambio relevante.
3. Mejorar la correlación de productos y versiones para otras distribuciones, ediciones/builds de Windows, plugins y dependencias transitivas.
4. Incorporar fichas técnicas con vector, impacto, precondiciones, remediación y referencias verificadas.
5. Ampliar la cobertura de remediación verificable para otras distribuciones, productos y builds, manteniendo requisitos de evidencia exacta.
6. Revisar textos legales, privacidad y límites de uso bilingües antes del lanzamiento público.

Contacto: contacto@quasaric.com


### Apariencia

Quasaric incluye tema oscuro y tema claro. Puedes cambiarlo desde el control de apariencia de la barra superior o desde **Configuración → Apariencia**. La elección se guarda localmente en el navegador.
