# Quasaric

**Security Intelligence Platform** — plataforma estática de inteligencia de vulnerabilidades para inventarios tecnológicos declarados por el usuario.

## Web pública

La URL raíz presenta la web pública bilingüe de Quasaric. Desde ella se accede a la aplicación mediante el botón Abrir la plataforma; también se puede abrir directamente https://quasaric.com/#app. La aplicación conserva su inventario local y sus funciones existentes. La web explica el producto, el flujo de análisis, las fuentes públicas, la privacidad y los límites metodológicos sin prometer detección exhaustiva.

## Estado del proyecto

Quasaric es una versión funcional en evolución, con alcance deliberadamente limitado. La aplicación usa React + Vite, ofrece interfaz bilingüe (español/inglés), mantiene el inventario local en el navegador y consulta fuentes públicas de vulnerabilidades desde el cliente. Los límites de importación y consulta se aplican por formato y fuente; no debe interpretarse el inventario como limitado a 10 componentes.

Capacidades implementadas:

- Correlación de candidatos CVE mediante NVD/CPE y rangos de versión.
- Motor común de comparación de versiones por ecosistema: dpkg (Debian/Ubuntu), RPM EVR (RHEL/Rocky/AlmaLinux/SUSE/Fedora), PEP 440 (Python/PyPI), SemVer (npm/Composer) y builds de Windows.
- Comparación inclusiva/exclusiva de límites con estados conservadores: versión afectada candidata, fuera de rango o revisión necesaria. Los formatos desconocidos no se ordenan por aproximación.
- Señales EPSS de FIRST y presencia en el catálogo CISA KEV.
- Consulta OSV por paquete y versión para los ecosistemas oficiales AlmaLinux, Rocky Linux, SUSE y openSUSE; adjunta erratas como evidencia del proveedor sin alterar automáticamente la aplicabilidad. Los eventos OSV `fixed` se muestran como versiones corregidas publicadas; `last_affected` se conserva como límite distinto y no se confunde con una versión corregida.
- Consulta de Red Hat Security Data por CVE para RHEL, con coincidencia exacta de producto/paquete y conservación de estados de paquete y errata (sin asumir que un errata demuestra la versión local corregida).
- Consulta de SUSE CSAF 2.0 VEX por CVE para SUSE/openSUSE, con coincidencia estricta mediante PURL RPM (namespace, paquete y arquitectura) y conservación de estados VEX/remediaciones como evidencia independiente; no declara el host corregido.
- Consulta de Ubuntu OSV por paquete fuente y ecosistema/release explícitos.
- Mapeo de los paquetes binarios instalados mediante `ecosystem_specific.binaries` del aviso Ubuntu OSV.
- Evaluación separada de versión fuente y versión binaria Debian/Ubuntu, teniendo en cuenta las revisiones y backports.
- Recuperación de documentos Canonical OpenVEX por CVE y correlación con el producto binario exacto (paquete, versión completa, arquitectura y distro), vinculada al PURL del paquete fuente OSV.
- Comparación diagnóstica de estados Ubuntu OSV/OpenVEX por componente. Los conflictos se muestran sin sobrescribir la clasificación de ninguna fuente ni convertir un estado VEX en un veredicto global del CVE.
- Trazabilidad de evidencias por componente y fuente (NVD, Ubuntu OSV y Canonical OpenVEX), con referencias, fechas y detalles del producto.
- Importación local CSV con validación de esquema y filas; límites de seguridad: 5 MB de texto, 50.000 filas de datos, 32 columnas y 16.384 caracteres por celda. Los PURL de componente y de fuente se validan con el parser común; las filas con identificadores malformados se rechazan con detalle de fila.
- El informe imprimible/PDF incluye una matriz de cobertura por fuente, errores y límites de consulta para que los resultados parciales queden identificados al compartirlo.
- Exportación CSV del inventario y de hallazgos; el CSV de hallazgos incluye la evidencia por fuente en una columna JSON. El paquete de auditoría JSON añade inventario, análisis, evidencias completas por componente, resumen cuantitativo de severidades, KEV, aplicabilidad y prioridad, estados de cobertura por fuente, errores, límites, triage y contexto histórico en un único fichero portable (máximo 20 MB). La versión 2 incorpora una huella SHA-256 y la aplicación permite validar localmente paquetes recibidos (estructura, coherencia e integridad) sin modificar el inventario ni el historial; los paquetes v1 se reconocen como heredados y no verificables. La huella detecta alteraciones accidentales, pero no es una firma digital ni autentica al emisor.
- Detección automática ampliada de tipos de componentes para runtimes Go, .NET, Ruby, Rust y PowerShell, además de servidores web Caddy y Tomcat.
- Importación local de SBOM CycloneDX JSON 1.4–1.7 (incluidos los componentes anidados) y SPDX JSON 2.3; extracción de nombre, versión, proveedor, CPE y PURL cuando están presentes; conserva las relaciones fuente→binario explícitas de SPDX GENERATED_FROM y las relaciones CycloneDX pedigree hacia componentes RPM arch=src, además de propiedades quasaric:source*. Las relaciones SPDX se omiten si algún SPDXID es duplicado o ambiguo; no se elige una arista por orden de aparición. El importador procesa hasta 50.000 componentes, valida PURL de origen y no instala paquetes ni contacta servicios externos.
- Importación, exportación, restauración y comparación local de backups JSON del inventario; validación de campos y PURL conforme a ECMA-427, y preservación de datos recuperables ante almacenamiento local corrupto. El almacenamiento local vuelve a validar los PURL al cargar y guardar para que un backup antiguo o una edición manual no introduzcan identidades de paquete malformadas.
- Correlación adicional por PURL con OSV público para paquetes con identificador y versión explícitos; avisos sin CVE asociado permanecen en una lista informativa separada y requieren revisión.
- Límites de recuperación OpenVEX por análisis (100 documentos y hasta cuatro fetches concurrentes). Las consultas OSV limitan los detalles a 200 avisos por consulta y cuatro descargas concurrentes. Las consultas Ubuntu OSV por paquete fuente están limitadas a 100 grupos por análisis y tres peticiones simultáneas; si se supera el límite, el análisis se etiqueta como parcial.
- Validación visible de PURL en el alta manual y en los flujos de importación/restauración; validación estructural CPE 2.3 en el panel de calidad del inventario, sin inferir coincidencias ni rechazar identificadores históricos automáticamente. También detecta versiones de paquete fuente sin nombre de paquete asociado.
- Invalidación de los hallazgos visibles cuando cambia el inventario, para evitar presentar resultados de una composición anterior como actuales.
- Cancelación explícita de análisis en curso y aviso cuando el historial no puede persistirse en el almacenamiento local.

**No está listo para decisiones de producción.** Una coincidencia sigue siendo evidencia que requiere validación; no se declara automáticamente una vulnerabilidad confirmada ni una remediación confirmada. La cobertura de Red Hat se limita a los CVE que ya entran como candidatos NVD y a los productos/paquetes identificados exactamente; no sustituye el análisis OVAL/CSAF completo ni demuestra backports locales. La correlación necesita validación amplia con avisos reales para CPE ambiguos, backports, rangos RPM de cada fabricante, ediciones/builds de Windows, plugins y dependencias transitivas. El motor de versiones ya dispone de comparadores específicos, pero no implica por sí solo que todas esas fuentes/adaptadores estén conectados. La ausencia de coincidencias no demuestra que un sistema sea seguro.

## Principios y privacidad

- No realiza escaneos, reconocimiento de red, explotación ni pruebas activas.
- El usuario declara manualmente productos, paquetes y versiones.
- El inventario se conserva en el almacenamiento local del navegador.
- No hay cuentas, backend, base de datos ni almacenamiento central.
- No introduzcas contraseñas, tokens, secretos ni datos personales.
- Las consultas a proveedores externos pueden revelar la IP del visitante y los identificadores CVE consultados. No se envía el inventario completo a NVD, FIRST, CISA, OSV ni Canonical.
- La consulta Canonical OpenVEX solicita el documento público usando el identificador CVE; el inventario local se usa para comparar el contenido recibido, no se transmite.
- Las fuentes pueden tener límites, errores, datos incompletos o cambios de disponibilidad. Las respuestas JSON se limitan por tamaño: 5 MB para OSV y 20 MB para otros conectores que usan el lector común; se comprueba Content-Length y también el tamaño real durante la lectura en streaming. Cada petición tiene un timeout de 30 segundos, incluida la lectura del cuerpo.

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

## Requisito no negociable: alojamiento y coste cero

Quasaric debe seguir publicada como una aplicación estática en **Azure Static Web Apps, plan Free**, con un coste objetivo y requisito obligatorio de **0 € para el propietario**. Este requisito prevalece sobre cualquier propuesta de arquitectura, funcionalidad o escalabilidad.

- Mantener Azure Static Web Apps en el plan **Free**. No cambiar a Standard ni contratar servicios o capacidades de pago.
- Mantener el despliegue estático de React/Vite (app location: /, api location: vacío y output location: dist); no introducir Azure Functions, backend, bases de datos, almacenamiento, colas, contenedores ni otros recursos facturables.
- No añadir servicios SaaS, APIs comerciales, dominios, certificados, analítica, monitorización, CDN u otras dependencias que generen cargos. Priorizar fuentes públicas gratuitas y consultas directas desde el navegador.
- No habilitar recursos de pago temporalmente, pruebas de pago, upgrades automáticos ni compromisos de consumo. Si una mejora no puede hacerse dentro del plan Free y sin coste, no se implementa: se documenta como limitación y se propone una alternativa gratuita.
- Diseñar dentro de las cuotas y límites del nivel Free. Controlar el consumo de GitHub Actions y de cualquier servicio externo gratuito; no asumir que gratis al empezar significa coste cero permanente.
- Antes de aceptar una nueva dependencia o integración, verificar explícitamente que no requiere suscripción, clave de pago, facturación por uso o upgrade de Azure.
- No realizar cambios en la suscripción, plan, recursos, facturación o configuración del portal Azure como parte del desarrollo.

La aplicación debe seguir siendo **local-first**: inventario e historial en el navegador y consultas públicas mínimas desde el cliente. No enviar inventarios completos a terceros. Si el crecimiento exige capacidades que superen las cuotas gratuitas, optimizar o limitar la función antes que introducir costes.
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

El historial no se sincroniza con ningún servidor ni se comparte con las fuentes externas. Borrar los datos locales del navegador elimina también el historial. La ausencia de un hallazgo en un análisis posterior significa "ya no detectado por las fuentes y reglas consultadas", no una prueba independiente de remediación. El historial puede exportarse e importarse como copia JSON versionada; la restauración valida todos los snapshots, los integra sin duplicados y conserva los diez análisis más recientes sin sustituir el inventario actual.

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


### Fuentes oficiales AlmaLinux y Rocky Linux — 2026-11-02

- AlmaLinux se resuelve por major explícito (8, 9 o 10) al ecosistema OSV versionado real `AlmaLinux:8/9/10`; no se consulta si el inventario solo declara “AlmaLinux” sin versión principal.
- Los avisos AlmaLinux se enriquecen mediante el registro individual de su repositorio oficial `AlmaLinux/osv-database`, evitando descargar el gran `errata.full.json` completo en cada análisis.
- Los avisos Rocky Linux RLSA/RXSA se enriquecen mediante el endpoint individual OSV de Peridot Apollo. Las respuestas deben conservar el ID exacto y el paquete/ecosistema exactos; si la fuente directa falla, se conserva la evidencia OSV y se informa del error.
- Las consultas directas están acotadas a 25 avisos por grupo y cuatro solicitudes concurrentes. No se infiere parche instalado ni se altera la clasificación NVD.
- Enlaces oficiales: https://github.com/AlmaLinux/osv-database y https://apollo.build.resf.org/docs.


### SUSE CSAF VEX y ordenación RPM

- La consulta CSAF VEX por CVE usa los documentos individuales oficiales publicados por SUSE. El análisis compara PURL RPM, namespace, paquete y, cuando está publicada, arquitectura. Si el proveedor omite la arquitectura, la evidencia se conserva con confianza media en lugar de presentarla como coincidencia exacta.
- La comparación RPM sigue EVR (epoch, version, release), considera epoch omitido igual a cero y los operadores `~` y `^`. Se rechazan segmentos fuera del alfabeto EVR documentado para evitar ordenar entradas ambiguas.
- La política CSP permite el host oficial `ftp.suse.com` usado por los documentos CSAF VEX.


### 2026-11-02 — separación de evidencia RHEL por paquete fuente y binario

- La evidencia Red Hat distingue coincidencia exacta del nombre del paquete binario (confianza alta) de coincidencia basada únicamente en `sourcePackage` declarado en el inventario (confianza media, `needs_review`).
- Una coincidencia del paquete fuente no se interpreta como prueba de que el binario instalado contenga el código vulnerable: un RPM fuente puede generar varios paquetes binarios con contenido y aplicabilidad diferentes.
- La interfaz identifica explícitamente la evidencia indirecta de paquete fuente. No se amplían coincidencias por similitud de nombres ni se cambia la aplicabilidad NVD.


### 2026-11-02 — relaciones SUSE CSAF entre paquetes fuente y binarios

- SUSE CSAF solo aporta evidencia indirecta de paquete fuente cuando el inventario declara `sourcePackage`, el CSAF identifica el paquete fuente con PURL RPM `arch=src`, identifica el binario instalado por PURL y publica una relación explícita entre ambos productos.
- El estado VEX publicado para el paquete fuente se conserva como confianza media y `needs_review`; no se eleva a afectación confirmada del binario. Se muestran los productos binarios relacionados y la relación publicada.
- No se infieren relaciones por nombres compartidos, ni se cambia la aplicabilidad NVD. La coincidencia binaria exacta mantiene su flujo previo.


### 2026-11-02 — OSV de paquetes fuente para AlmaLinux y Rocky Linux

- Se consulta por separado el paquete binario instalado y el paquete fuente declarado, usando la versión propia de cada uno. La consulta fuente requiere `sourcePackage` y `sourceVersion` explícitos.
- Los avisos OSV del paquete fuente se adjuntan como evidencia indirecta (`source_package`, confianza media y `needs_review`). Sus versiones corregidas se etiquetan como versiones del fuente y no se trasladan al binario.
- No se usa el nombre fuente como sustituto silencioso del nombre binario, ni se consulta fuente sin versión fuente. La aplicabilidad NVD permanece independiente.


### 2026-11-02 — entrada de metadatos fuente para distribuciones RPM

- El formulario manual permite declarar `sourcePackage`, `sourceVersion` y arquitectura para Ubuntu, AlmaLinux, Rocky Linux y SUSE/openSUSE; antes los campos solo aparecían al seleccionar Ubuntu.
- La ayuda distingue que AlmaLinux/Rocky consultan el aviso de fuente con su propia versión y que esa evidencia no confirma automáticamente el binario. En SUSE la arquitectura ayuda a afinar la coincidencia CSAF.
- Los campos de paquete fuente, versión, arquitectura y relación SBOM explícita se conservan en CSV, backups JSON y almacenamiento local del navegador. SPDX GENERATED_FROM se interpreta en su dirección normativa; CycloneDX solo promueve ancestros RPM con arch=src o propiedades quasaric:source* declaradas. No se infieren relaciones por nombres.


El contrato de integración del paquete JSON v2 está publicado en [`docs/quasaric-security-audit.schema.json`](docs/quasaric-security-audit.schema.json) (JSON Schema Draft 2020-12). La CI comprueba su coherencia con las exportaciones reales. Permite validar la estructura del formato desde herramientas externas sin incorporar dependencias a la aplicación.


### Trazabilidad de evidencias en paquetes de auditoría

El resumen del paquete JSON v2 cuantifica las evidencias conservadas por componente: total de registros, distribución por fuente y número de registros con al menos una referencia HTTPS segura. Los enlaces se evalúan con la misma política de seguridad de la interfaz (HTTPS absoluto, sin credenciales); no se reescriben ni eliminan del registro original. Las referencias HTTP, esquemas activos, URLs malformadas o enlaces con credenciales no cuentan como referencias seguras. Esta métrica evalúa la presencia y seguridad del enlace, no la vigencia, autenticidad ni calidad semántica del aviso.
