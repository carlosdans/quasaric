# Quasaric — contexto del proyecto

> Documento de continuidad para retomar el desarrollo en cualquier conversación. Actualizarlo al cerrar cada bloque de trabajo.
>
> **Última actualización:** 30 de octubre de 2026  
> **Repositorio:** https://github.com/carlosdans/quasaric  
> **Rama principal:** `main`

## 1. Visión del producto

Quasaric es una plataforma estática de inteligencia de vulnerabilidades que analiza un inventario tecnológico declarado por el usuario. Su objetivo es ayudar a entender qué CVE podrían afectar a los componentes y qué conviene verificar o corregir primero.

No está concebida como un escáner ni como una herramienta de pentesting. La calidad y trazabilidad de la correlación son más importantes que mostrar muchos resultados.

**Estado y limitación:** el MVP es un prototipo en evolución y no debe utilizarse todavía como única base para decisiones de seguridad en producción. La ausencia de resultados no demuestra que un sistema esté libre de vulnerabilidades.

## 2. Límites de alcance y principios

- Sin escaneo de dominios, redes o sistemas; sin reconocimiento remoto, explotación, pruebas activas ni ejecución de exploits.
- Sin agentes, monitorización continua, alertas en segundo plano ni conexión a servidores para descubrir tecnologías.
- El usuario declara o importa su inventario; las futuras ayudas de inventario deben usar comandos locales de solo lectura.
- Sin cuentas, login, backend, base de datos ni almacenamiento central en el MVP.
- Inventario e informes guardados localmente en el navegador, de forma opcional.
- No enviar el inventario completo a proveedores externos: consultar solo los identificadores necesarios.
- Informar de que las consultas a terceros pueden revelar la IP del visitante y los identificadores CVE consultados.
- No introducir ni almacenar contraseñas, tokens, secretos o datos personales.
- No inventar versiones afectadas, rangos, fixes, escenarios, PoC ni referencias.
- Una PoC pública no demuestra explotación activa. EPSS, CISA KEV y CVSS son señales distintas.
- CVSS alto no equivale automáticamente a explotación fácil ni a prioridad máxima.
- No declarar una vulnerabilidad confirmada solo por coincidencia de nombre de producto.
- Mostrar errores, límites y disponibilidad de fuentes. Un resultado vacío o una fuente caída no equivale a ausencia de vulnerabilidades.
- No bloquear funciones críticas por una futura monetización. Presupuesto inicial: 0 €, sin anuncios ni monetización inicial.

## 3. Arquitectura y despliegue

- Aplicación estática React + Vite, bilingüe español/inglés.
- Hosting: Azure Static Web Apps, plan Free.
- URL Azure conocida: https://green-cliff-074e49a0f.2.azurestaticapps.net
- Dominio: https://quasaric.com
- Contacto: contacto@quasaric.com
- Build de producción: `npm run build`; salida Vite: `dist`.
- Desarrollo local: Node.js 20+ y npm; `npm install`, `npm run dev`, `npm run preview`.
- `staticwebapp.config.json` define fallback SPA y cabeceras iniciales; CSP/cabeceras deben comprobarse en el despliegue real.
- No afirmar que un cambio está publicado en el dominio hasta comprobar merge en `main` y despliegue Azure de `main` satisfactorio.

## 4. Funcionalidad y estado conocido

### Implementado en el MVP (según README de main)

- Interfaz React/Vite bilingüe.
- Inventario local de hasta 10 componentes.
- Exportación CSV.
- Consultas desde navegador a NVD, FIRST EPSS y CISA KEV.
- Correlación inicial de candidatos CVE con metadatos CPE y rangos de versión NVD.
- Indicadores de disponibilidad de fuentes y errores parciales.
- Aplicabilidad conservadora: posible o requiere verificación; no se confirma automáticamente.
- Primera consulta Ubuntu OSV central para paquetes fuente. El flujo usa `querybatch`, recupera fichas OSV y relaciona avisos Ubuntu con CVE públicos mediante `upstream`. Los resultados siguen siendo candidatos que requieren verificación.

### Limitaciones que deben mantenerse visibles

- CPE ambiguos y cobertura incompleta de NVD.
- Ubuntu: el inventario habitual de `dpkg-query` contiene paquetes binarios; Ubuntu OSV organiza el seguimiento por paquetes fuente y publica el mapeo en `ecosystem_specific.binaries`. Hasta implementar y probar ese mapeo, la consulta OSV solo es válida cuando se introduce el nombre del paquete fuente.
- Ubuntu: verificar paquete fuente/binario, versión completa incluida revisión, release/codename y parches retroportados. No comparar versiones upstream a ciegas.
- Windows Server: hacen falta edición, build y hotfixes/actualizaciones.
- PHP: versión exacta y extensiones.
- Apache/NGINX: versión de paquete y módulos.
- WordPress/Joomla/Drupal: versión del CMS y de plugins/extensiones.
- Dependencias y librerías: identificar versiones exactas y, cuando proceda, dependencias transitivas.
- No inferir versiones que el inventario no proporciona.

### Funcionalidad objetivo / pendiente

- Correlación robusta por producto, versión, plataforma, paquete y CPE; pruebas con fixtures de CVE conocidos.
- Integración de avisos oficiales de fabricantes y distribución, incluidos Ubuntu USN.
- Fichas CVE con aplicabilidad, CVSS, EPSS, KEV, vector, precondiciones, punto de entrada, mecanismo, impacto, PoC (con cautela), versiones corregidas, remediación, mitigaciones y referencias.
- Escenarios técnicos de ataque basados en fuentes verificables.
- Vista global con componentes, CVE únicas deduplicadas, severidad, KEV, prioridad y componentes con versión insuficiente; navegación entre resumen y fichas.
- Priorización con fórmula explicada y señales separadas.
- Exportación PDF/CSV con logo; comparación de informes.
- Inventario asistido mediante comandos locales read-only.
- Guardado local opcional de inventarios e informes.
- Textos legales y de privacidad en español e inglés antes del lanzamiento público.
- Accesibilidad WCAG 2.2 AA y diseño responsive.

## 5. Componentes iniciales previstos

Windows Server, Ubuntu, Apache HTTP Server, NGINX, PHP, Node.js, WordPress, Joomla, Drupal, MySQL y MariaDB. Debian se contempla para una fase posterior. Después, plugins CMS, paquetes, librerías y dependencias.

## 6. Fuentes y reglas de interpretación

- NVD: https://nvd.nist.gov/developers/vulnerabilities
- FIRST EPSS: https://www.first.org/epss/
- CISA KEV: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- Ubuntu Security Tracker: https://ubuntu.com/security/cves/about
- Ubuntu Security Notices: https://ubuntu.com/security/notices
- Ubuntu OVAL: https://documentation.ubuntu.com/security/security-updates/oval/
- Ubuntu OSV: https://documentation.ubuntu.com/security/security-updates/osv/
- GitHub puede servir para localizar PoC públicas, pero su existencia no acredita explotación activa ni aplicabilidad al componente analizado.

La Ubuntu Security API está descrita por Canonical como trabajo en curso y no recomendada para automatización de producción. Preferir fuentes oficiales documentadas y validar la cobertura de cada conector.

## 7. Estado de GitHub y Azure — fotografía de la última sesión

**No asumir que este estado sigue vigente.** Al comenzar una sesión nueva, consultar GitHub antes de actuar.

- Repositorio privado: `carlosdans/quasaric`.
- `main` actual tras integrar PR #1: commit `bb4e5a69f3cde135dbc4fb2bc0497a7c3a251bb8` (30-10-2026).
- PR #1: https://github.com/carlosdans/quasaric/pull/1
- Rama PR: `fix/component-classification-search`.
- Objetivo PR #1: corregir clasificación de tecnologías y reducir búsquedas excesivas/ambiguas de CVE.
- Último commit conocido de la rama: `6bb7b98a04ab67eded68cc9726467b62b8d821ca`.
- La corrección más reciente arregló una expresión regular de espacios (`/\\s+/g`) y añadió una prueba para Apache HTTP Server con espacios repetidos.
- En la última consulta, CI #43 y Azure #53 estaban `in_progress` para ese commit. CI #42 había fallado en el commit anterior por el defecto de regex; Azure #52 había sido satisfactorio para ese commit anterior.
- CI #43: https://github.com/carlosdans/quasaric/actions/runs/41055602751
- Azure #53: https://github.com/carlosdans/quasaric/actions/runs/41055602950
- CI #40 y Azure #50 fueron satisfactorios para el commit conocido de `main`.
- PR #1 se integró mediante squash el 30-10-2026 tras revisar el diff y confirmar CI #43 y Azure #53 satisfactorios en el commit de rama `6bb7b98a04ab67eded68cc9726467b62b8d821ca`. Merge commit en `main`: `bb4e5a69f3cde135dbc4fb2bc0497a7c3a251bb8`.
- La integración actualiza `main`, pero todavía debe comprobarse el workflow Azure disparado por el merge antes de afirmar que el dominio público ya sirve esos cambios.

### Cambios integrados mediante PR #1

- Nuevo `src/lib/componentTypes.js`: catálogo de tecnologías conocidas y clasificación esperada.
- Nuevo `src/lib/componentTypes.test.js`: pruebas del catálogo.
- `src/lib/correlation.js`: consulta canónica por componente, coincidencia CPE exacta vendor/product, evita coincidencias basadas solo en descripción, límite de consulta NVD de 400 y normalización de tipos heredados.
- `src/lib/vulnerabilitySources.js`: tamaño de página respeta `maxResults`.
- `src/App.jsx`: sugiere tipo al introducir el nombre y normaliza al añadir.
- Revisar si la interfaz comunica claramente límites/cobertura cuando se alcanza el tope de 400 resultados; no presentar el resultado como exhaustivo.
- Revisar que la normalización de tipos heredados sea coherente en la interfaz y en el análisis.

## 8. Criterios de calidad antes de dar una tarea por terminada

1. Leer el código actual y confirmar rama/commit antes de modificar.
2. Hacer cambios pequeños, explicables y probables; evitar refactorizaciones no solicitadas.
3. Añadir o actualizar pruebas para lógica de correlación y normalización.
4. Ejecutar pruebas y build cuando sea posible; revisar CI y despliegue reales.
5. No declarar éxito de CI/deploy sin comprobar el estado del run asociado al último commit.
6. No fusionar PR sin verificar checks y revisar el diff.
7. No presentar candidatos como vulnerabilidades confirmadas.
8. Documentar límites de fuentes, cobertura, versiones y aplicabilidad.
9. Mantener español e inglés sincronizados.
10. Actualizar este documento al terminar cada bloque: cambios, commit/PR, pruebas, despliegue, riesgos y siguiente paso.

## 9. Próximos pasos inmediatos

1. Comprobar el workflow Azure disparado por el merge `bb4e5a69f3cde135dbc4fb2bc0497a7c3a251bb8`; no afirmar publicación hasta verificarlo.
2. Añadir pruebas de regresión de correlación con fixtures CPE reales y casos negativos. Revisar especialmente el mapeo actual, que solo contempla explícitamente algunos productos; PHP-FPM, Python, Java, PostgreSQL, MongoDB e IIS requieren una política CPE validada y no deben considerarse cubiertos solo por estar en el catálogo de tipos.
3. Hacer visible el límite de 400 resultados NVD por componente y evitar presentar los resultados como exhaustivos.
4. Resolver y probar el mapeo Ubuntu paquete binario → paquete fuente antes de presentar cobertura OSV de inventarios `dpkg-query` como completa.

## 10. Cómo retomar en una conversación nueva

Pega este mensaje:

> Continuamos con Quasaric. Lee `docs/PROJECT_CONTEXT.md` de `carlosdans/quasaric` en GitHub. Comprueba primero el estado real de ramas, PR, CI y Azure; después continúa desde los próximos pasos documentados. No des por vigente ningún estado histórico sin verificarlo.
 
## 11. Registro de sesiones

### 2026-10-30

- Se preparó este documento como punto de continuidad del proyecto.
- Estado de partida documentado desde el README de `main` y el estado conocido de PR #1.
- PR #1 fusionada en `main` tras CI #43 y Azure #53 satisfactorios para el commit de rama.
- Merge commit: `bb4e5a69f3cde135dbc4fb2bc0497a7c3a251bb8`.
- Pendiente: verificar el workflow Azure posterior al merge y continuar con las pruebas de regresión CPE y la comunicación del límite NVD.
