# Quasaric — contexto del proyecto

> Documento de continuidad para retomar el desarrollo en cualquier conversación. Actualizarlo al cerrar cada bloque de trabajo.
>
> **Última actualización:** 30 de octubre de 2026 (PR #13 integrada; clasificación Ubuntu OSV por versión fuente)  
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
- URL Azure conocida: https://orange-meadow-04bd1081e.4.azurestaticapps.net
- Dominio: https://quasaric.com
- Marca visible: **Quasaric.com**; `public/favicon.svg` es el icono único compartido por favicon y cabecera de la aplicación.
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
- `main` actual tras integrar PR #2: commit `1fc492b5041384429a9c10450ef7968e8514d78a` (30-10-2026).
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
- Tras PR #1, los workflows de CI y Azure para `main` terminaron correctamente. Tras PR #2, los workflows de CI y Azure para el commit de `main` `1fc492b5041384429a9c10450ef7968e8514d78a` estaban en cola en la última comprobación; verificar antes de afirmar que el dominio público ya sirve estos cambios.

### Cambios integrados mediante PR #1 y PR #2

- Nuevo `src/lib/componentTypes.js`: catálogo de tecnologías conocidas y clasificación esperada.
- Nuevo `src/lib/componentTypes.test.js`: pruebas del catálogo.
- `src/lib/correlation.js`: consulta canónica por componente, coincidencia CPE exacta vendor/product, evita coincidencias basadas solo en descripción, límite de consulta NVD de 400 y normalización de tipos heredados.
- `src/lib/vulnerabilitySources.js`: tamaño de página respeta `maxResults`.
- `src/App.jsx`: sugiere tipo al introducir el nombre y normaliza al añadir.
- PR #2 añadió mapeos CPE explícitos para PHP-FPM, Python, PostgreSQL, MongoDB e IIS, con pruebas de coincidencia y casos negativos.
- `fetchNvdByKeyword` conserva `totalResults` y marca `truncated` cuando se alcanza el máximo configurado.
- `src/App.jsx` muestra aviso bilingüe cuando NVD llega al tope de 400 resultados; los resultados se identifican como parciales.

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

1. Verificar CI y Azure de `main` para el merge `1fc492b5041384429a9c10450ef7968e8514d78a`; no afirmar publicación hasta que Azure termine correctamente.
2. Ampliar pruebas de regresión con fixtures CVE/CPE reales de NVD y rangos de versiones; los tests actuales validan parejas vendor/product, no la cobertura de todos los rangos publicados.
3. Revisar la limitación de búsquedas NVD por palabra clave: el aviso hace visible el truncamiento, pero la estrategia no garantiza exhaustividad.
4. Resolver y probar el mapeo Ubuntu paquete binario → paquete fuente antes de presentar cobertura OSV de inventarios `dpkg-query` como completa.
5. Diseñar y probar el siguiente bloque de calidad: evaluación de aplicabilidad por versión y rangos inclusivos/exclusivos con casos reales.

## 10. Cómo retomar en una conversación nueva

Pega este mensaje:

> Continuamos con Quasaric. Lee `docs/PROJECT_CONTEXT.md` de `carlosdans/quasaric` en GitHub. Comprueba primero el estado real de ramas, PR, CI y Azure; después continúa desde los próximos pasos documentados. No des por vigente ningún estado histórico sin verificarlo.
 
## 11. Registro de sesiones

### 2026-10-30

- Se preparó este documento como punto de continuidad del proyecto.
- Estado de partida documentado desde el README de `main` y el estado conocido de PR #1.
- PR #1 integrada en `main`; CI y Azure de `main` satisfactorios.
- PR #2 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/2.
- Commit de `main` tras PR #2: `1fc492b5041384429a9c10450ef7968e8514d78a`.
- CI de PR #2 satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41057242701 (tests de correlación y build).
- Azure de PR #2 satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41057242969.
- CI y Azure disparados para el merge de PR #2 estaban en cola en la última consulta: CI #? run `41057568828`; Azure run `41057569100`.
- Próximo paso: comprobar ambos workflows de `main`, especialmente Azure, y continuar con fixtures CVE/CPE reales y mapeo Ubuntu binario → fuente.


### 2026-10-30 — PR #3 y marca Quasaric.com

- PR #3 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/3.
- Merge commit: `08cf843b0166b850d68ecc890268902caffa722d`.
- Añade siete pruebas de regresión para rangos CPE inclusivos/exclusivos, versión concreta, CPE no vulnerable, versión ausente y producto distinto.
- CI de PR #3 satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41057961438.
- Azure de PR #3 satisfactorio para el build de la rama de PR: https://github.com/carlosdans/quasaric/actions/runs/41057961544. Esto no acredita por sí solo el despliegue de `main`.
- Siguiente PR: identidad visual Quasaric.com, con el mismo SVG como favicon y marca de cabecera; título y descripción SEO actualizados.
- La prueba de rangos solo caracteriza la semántica CPE básica; no acredita comparadores correctos para versiones Ubuntu/Debian ni esquemas específicos de fabricantes.


### Ajuste de despliegue Azure — 2026-10-30

- El log de Azure para la PR #4 confirma que Oryx instaló Node y `npm run build` terminó correctamente. El rechazo se produjo después, al intentar crear/publicar el entorno de staging: Azure indicó que se alcanzó el máximo de entornos de staging.
- No se debe atribuir este error a un token inválido: en este intento la acción llegó a la fase de publicación y la razón explícita fue el límite de entornos.
- Workflow actualizado en la rama de la PR #4: los despliegues `upload` se ejecutan solo en push a `main`; el evento `pull_request: closed` se conserva para solicitar la limpieza del entorno de esa PR. Las PR mantienen su CI independiente y no consumen plazas de staging nuevas.
- Se retiró el parámetro `github_id_token` y la preparación OIDC que la acción `Azure/static-web-apps-deploy@v1` advertía como input no reconocido. La autenticación de despliegue sigue usando el secreto Azure existente.
- Antes de fusionar, validar CI y comprobar que el workflow modificado se comporta como se espera. Tras el merge, confirmar el workflow de push a `main` para acreditar el despliegue de producción.


### PR #4 integrada — marca y despliegue económico

- PR #4 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/4.
- Commit de `main`: `f4e70f7b2454a517fc5070e6343670638ccc2ec5`.
- Cabecera y favicon usan el mismo `public/favicon.svg`; nombre visible Quasaric.com; metadatos SEO actualizados.
- Workflow Azure modificado para desplegar `upload` únicamente en push a `main`. Se mantienen los tests CI en PR y el evento de cierre para limpiar el staging correspondiente.
- El log de la PR #4 mostró build Vite correcto, seguido de rechazo por límite de entornos de staging. No fue un fallo de compilación.
- CI de `main` para el commit integrado correcto: https://github.com/carlosdans/quasaric/actions/runs/41060073434.
- Azure de `main` para el mismo commit estaba en ejecución al actualizar este registro: https://github.com/carlosdans/quasaric/actions/runs/41060073320. No afirmar publicación hasta comprobar conclusión satisfactoria.

### Regla de coste permanente

- Requisito explícito del producto: mantener Quasaric como Static Web App estática y operar con coste de infraestructura de 0 €.
- Mantener Azure Static Web Apps Free; sin backend, bases de datos, funciones serverless de pago, agentes, monitorización, escaneo remoto, servicios premium ni APIs con tarifa.
- Preferir APIs públicas gratuitas y consultas bajo demanda; controlar frecuencia, límites y errores para no generar costes ni exponer inventarios completos.
- Evitar despliegues de staging por PR; el despliegue de publicación se hace desde `main`.
- No prometer coste total de propiedad absolutamente cero si existen conceptos externos ajenos al hosting (por ejemplo, renovación del dominio, impuestos o cambios futuros de tarifas/condiciones del proveedor). No activar ningún recurso que pueda facturar sin autorización explícita.

### Siguiente bloque técnico

- Revisar Ubuntu OSV usando la documentación oficial: Ubuntu OSV identifica paquetes fuente en `affected[].package.name` y publica paquetes binarios y versiones en `affected[].ecosystem_specific.binaries`. No inferir la relación binario→fuente sin datos explícitos.
- Añadir pruebas con fixtures reales anonimizados/sintéticos basados en el esquema oficial para comprobar nombre de binario, versión binaria completa, release Ubuntu y estado de parche. Hasta entonces, mantener candidatos como `needs_review`.
- Referencia oficial: https://documentation.ubuntu.com/security/security-updates/osv/.

---

## Estado actualizado — 30 de octubre de 2026 (PR #5)

**Estado verificado al cierre de este bloque; esta sección prevalece sobre fotografías históricas anteriores.**

- main previo a esta PR: 281d2577e05ea86e60051852ab8f68ddb654ca1b.
- PR #5 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/5.
- Commit de merge en main: ee837a019788595a1b714c18640e02f08d386033.
- Rama: feat/ubuntu-osv-binary-mapping.
- CI final de PR #5 satisfactorio para 1f2e2e82dddc3bb05cdf684b82843cb006d9e11a: https://github.com/carlosdans/quasaric/actions/runs/41060935538.
- El primer CI falló por una expectativa textual incorrecta en un test, no por la lógica del matcher. Se corrigió y el CI posterior completó tests y build correctamente.
- Nuevo export en src/lib/vulnerabilitySources.js: matchUbuntuOsvBinary(record, binaryName, binaryVersion, ecosystem).
- La función solo devuelve matched cuando coinciden exactamente nombre binario, versión binaria completa y ecosistema/release Ubuntu presentes en affected[].ecosystem_specific.binaries[]; si no hay evidencia suficiente, devuelve needs_review.
- Añadidos cinco tests con fixture para coincidencia exacta, revisión distinta, release distinta, mapeo no inferido y campos obligatorios.
- Importante: este bloque añade y prueba el matcher puro; todavía no conecta automáticamente el inventario dpkg-query con la consulta OSV. La función de consulta existente sigue esperando un paquete fuente y versión. Próximo paso: diseñar el flujo de búsqueda/advisory que use evidencia binaria OSV sin comparar versiones de fuente contra versiones binarias ni inventar el mapeo.
- Azure Static Web Apps para main sigue fallando antes del build remoto con 'No matching Static Web App was found or the api key was invalid'. Runs observados: https://github.com/carlosdans/quasaric/actions/runs/41060241920 y https://github.com/carlosdans/quasaric/actions/runs/41060073320. El CI principal para el commit previo de documentación fue satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41060242047.
- El secreto esperado por el workflow es AZURE_STATIC_WEB_APPS_API_TOKEN_GREEN_CLIFF_074E49A0F. Verificar/regenerar el token desde Azure Portal > Static Web App > Manage deployment token y actualizar directamente el GitHub Actions secret; nunca compartir el valor en chat.
- No afirmar que el branding o el commit de PR #5 están publicados en quasaric.com hasta que el workflow Azure de main termine satisfactoriamente.
- No se añadieron recursos de pago ni se cambió el modelo de infraestructura; mantener Azure Static Web Apps Free y coste 0 € en servicios bajo nuestro control.

### Próximos pasos técnicos

1. Conectar el matcher con un flujo real de consulta OSV para paquetes binarios, partiendo de advisories obtenidos por una vía documentada y sin API experimental de mapeo.
2. Añadir fixtures de avisos Ubuntu para varias releases y paquetes con más de un binario; cubrir estados patched/unaffected/affected solo cuando el esquema y datos oficiales lo permitan.
3. Diferenciar claramente ausencia de evidencia, binario coincidente y paquete corregido; nunca convertir la ausencia en 'no vulnerable'.
4. Actualizar la interfaz para solicitar release/codename y versión completa del paquete cuando falten; documentar qué representa la versión que introduce el usuario.
5. Revisar CI/build y actualizar este documento tras cada PR. Resolver token Azure por separado.

---

## Estado actualizado — 30 de octubre de 2026 (PR #6 integrada)

**Estado de la integración; distinguir CI de despliegue Azure.**

- PR #6 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/6.
- Commit de merge en `main`: `57ef0834c4011fd5fdf7cac7fe53ab173f0eb7b8`.
- Rama: `feat/ubuntu-binary-osv-integration`; último head antes de merge: `0b852a9bd5257a83419ae52f899767f7b71cab32`.
- CI de la PR para el head final satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41064731280. Tests de correlación y build estático completados correctamente.
- La integración consulta OSV con paquete fuente y release Ubuntu explícitos, pagina con `next_page_token`, recupera advisories y filtra entradas afectadas por nombre de paquete fuente y ecosistema.
- La correlación con el inventario exige coincidencia exacta de nombre binario, versión binaria completa y release en `affected[].ecosystem_specific.binaries[]`. Los hallazgos permanecen `needs_review`; no se confirman ni se infiere parche aplicado.
- El campo opcional `sourcePackage` se añade al formulario y se conserva porque el inventario local serializa el objeto completo en `localStorage`. No se infiere la relación binario→fuente.
- Se limitó a cinco el número de peticiones simultáneas de detalle OSV para evitar un `Promise.all` sin límite ante paquetes con muchos avisos históricos.
- Tests añadidos para consulta package-only, validación de release, paginación y exclusión de advisories retirados.
- Limitación: solo se correlacionan advisories con CVE upstream reconocible. Los avisos OSV sin CVE upstream no se incorporan a los hallazgos CVE; no interpretar esto como cobertura completa de Ubuntu.
- Limitación: la validación de CI usa fixtures/mocks; no acredita una prueba de integración live contra OSV ni la exhaustividad de sus datos.
- El workflow CI de `main` tras merge está en cola al redactar esta actualización: https://github.com/carlosdans/quasaric/actions/runs/41064875167.
- El workflow Azure Static Web Apps de `main` también está en cola: https://github.com/carlosdans/quasaric/actions/runs/41064875145. No afirmar despliegue de producción hasta verificar que termina satisfactoriamente.
- El problema anterior de Azure token no se ha resuelto ni modificado en esta PR. Si vuelve a fallar con `No matching Static Web App was found or the api key was invalid`, actualizar el secreto existente desde Azure Portal > Static Web App > Manage deployment token; no compartir el token ni crear recursos nuevos.
- No se añadieron backend, base de datos, agentes, recursos Azure nuevos ni servicios de pago. Se mantiene el objetivo de 0 € de infraestructura/servicios bajo nuestro control.

### Próximos pasos

1. Verificar CI de `main` y workflow Azure de `main` por separado.
2. Mejorar la ayuda de inventario para obtener `sourcePackage` mediante consulta local de solo lectura, por ejemplo: `dpkg-query -W -f='${binary:Package}\\t${Version}\\t${source:Package}\\t${source:Version}\\n'`. No ejecutar remotamente ni enviar inventarios completos.
3. Añadir fixtures oficiales/sintéticos adicionales para advisories con varios binarios, múltiples releases y estados de parche; documentar que no se cubren avisos sin CVE upstream.
4. Mantener los resultados como candidatos que requieren verificación con avisos oficiales de Canonical.


---

## Estado actualizado — 30 de octubre de 2026 (PR #7 y diagnóstico Azure)

**Estado verificado tras integrar PR #7. Esta sección prevalece sobre las fotografías históricas anteriores.**

- PR #7 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/7.
- Commit actual de `main`: `b7cb6c437216592176c8102fefb1646d058d1ce6`.
- La PR añade ayuda bilingüe para distinguir paquete binario instalado y paquete fuente Ubuntu, e incluye el comando local read-only `dpkg-query -W -f='${binary:Package}\\t${Version}\\t${source:Package}\\t${source:Version}\\n'`. La interfaz indica copiar solo el nombre del paquete fuente y no enviar el inventario completo.
- CI de PR #7 satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41065484533.
- CI de `main` para el commit integrado satisfactorio (tests y build): https://github.com/carlosdans/quasaric/actions/runs/41066132085.
- Se revisó el diff: `BookOpen` está importado desde lucide-react y el comando se representa con escapes dobles para que el usuario pueda copiar los literales \\t y \\n.

### Estado Azure — token renovado pero rechazado

- El usuario confirmó que regeneró el deployment token desde Azure y actualizó el GitHub Actions secret existente. No se ha mostrado ni compartido el valor del secreto.
- A pesar de ello, el despliegue de `main` para `b7cb6c437216592176c8102fefb1646d058d1ce6` falló: https://github.com/carlosdans/quasaric/actions/runs/41066131962.
- El log confirma que la acción recibió un valor en `azure_static_web_apps_api_token`, pero el servidor de contenido respondió `BadRequest`: `No matching Static Web App was found or the api key was invalid.` Falló en el paso de publicación; el CI y build estático independiente sí fueron correctos.
- El workflow Azure asociado al cierre de la PR también terminó fallando: https://github.com/carlosdans/quasaric/actions/runs/41066134496. No confundirlo con el despliegue de producción.
- Diagnóstico pendiente: comprobar en Azure Portal que la Static Web App existente corresponde al recurso y suscripción correctos, y que el token copiado pertenece exactamente a ese recurso. Revisar también que el secreto actualizado sea el mismo nombre que consume el workflow: `AZURE_STATIC_WEB_APPS_API_TOKEN_GREEN_CLIFF_074E49A0F`. No regenerar repetidamente el token sin confirmar primero recurso, suscripción y asociación.
- No crear una Static Web App nueva ni cambiar de plan. Mantener Azure Static Web Apps Free y el objetivo de coste 0 € en servicios bajo nuestro control.
- No afirmar que los cambios de PR #7 estén publicados en `quasaric.com` ni en la URL Azure hasta que un workflow de push a `main` termine correctamente.

### Próximos pasos

1. Resolver la asociación recurso/token en Azure Portal, sin exponer el secreto en chat.
2. Reejecutar únicamente el workflow de despliegue de `main` cuando la asociación esté verificada; comprobar que finaliza con éxito.
3. Añadir fixtures Ubuntu para advisories con múltiples binarios, releases y estados de parche, conservando resultados como `needs_review` cuando no exista evidencia suficiente.
4. Mantener inventario local, límite de 10 componentes y ausencia de escaneo remoto/backend facturable.


---

## Estado actualizado — 30 de octubre de 2026 (PR #8, nueva Azure SWA y PR #9)

**Esta sección prevalece sobre los estados históricos anteriores.**

### Azure Static Web Apps
- El usuario recreó la Static Web App y confirmó que el nuevo secreto de GitHub se llama `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_MEADOW_04BD1081E`.
- PR #8 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/8.
- Commit de `main`: `cc5d88266b4b16c53a829ffe74f3207d1fc0b73b`.
- Workflow actualizado para usar el nuevo secreto, compilar con `npm run build` y publicar `dist`; se retiró el workflow antiguo de Green Cliff para evitar despliegues duplicados.
- CI de `main` satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41093771388.
- Despliegue de producción Azure satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41093771593. El log confirma `Deployment Complete` y URL `https://orange-meadow-04bd1081e.4.azurestaticapps.net`.
- El usuario indicó que ya ha vuelto a configurar el DNS del dominio. No se ha verificado DNS/HTTPS desde aquí; no alterar DNS ni recursos Azure.

### PR #9 — regresiones Ubuntu OSV multi-binario
- PR #9 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/9.
- Commit de `main`: `dfd9477c01031409e5f1041962852db7fa87518d`.
- Añade `src/lib/vulnerabilitySources.ubuntu-multi-binary.test.js` con cuatro casos: múltiples binarios en una release, aislamiento entre releases Ubuntu, revisión distinta de versión binaria y separación de paquetes fuente dentro de una release.
- CI de la PR satisfactorio: https://github.com/carlosdans/quasaric/actions/runs/41094510113.
- El diff fue revisado; no cambia lógica de producción ni altera estados de aplicabilidad.
- CI de `main` tras merge: https://github.com/carlosdans/quasaric/actions/runs/41094665542 (pendiente de comprobación al registrar esta nota).
- Azure de `main` tras merge: https://github.com/carlosdans/quasaric/actions/runs/41094665512 (pendiente de comprobación al registrar esta nota).

### Próximo bloque
1. Verificar CI y despliegue Azure del commit `dfd9477c01031409e5f1041962852db7fa87518d`.
2. Investigar con datos/documentación oficial cómo representar estados Ubuntu `affected`, `fixed` y `unaffected` sin comparar versiones binarias con rangos de fuente; añadir pruebas antes de cambiar el estado visible.
3. Mejorar la entrada Ubuntu para importar de forma local (sin transmitir el inventario) los campos binario, versión completa, paquete fuente y release extraídos con `dpkg-query`. Mantener la revisión manual si faltan campos.
4. Mantener el límite de 10 componentes, la consulta bajo demanda y la infraestructura Azure Free; no añadir backend ni servicios de pago.


---

## Estado actualizado — 30 de octubre de 2026 (verificación y análisis del esquema Ubuntu OSV)

**Estado real verificado antes de este bloque**

- `main` apunta a `ac0470048609049ee9aab773c3bbf07379a4dd5d`.
- PR #9 está integrada; la consulta de PR recientes no muestra PR abierta.
- CI de `main` para `ac047004…`: satisfactorio, run https://github.com/carlosdans/quasaric/actions/runs/41094711668.
- Azure Static Web Apps para el mismo commit: satisfactorio, run https://github.com/carlosdans/quasaric/actions/runs/41094711529.
- URL de despliegue confirmada previamente: https://orange-meadow-04bd1081e.4.azurestaticapps.net. El éxito del workflow acredita el despliegue a esa Static Web App, no verifica por sí solo DNS/HTTPS de `quasaric.com`.

### Hallazgo importante en la semántica oficial de Ubuntu OSV

Fuentes oficiales revisadas:
- Ubuntu OSV: https://documentation.ubuntu.com/security/security-updates/osv/
- Ubuntu OVAL: https://documentation.ubuntu.com/security/security-updates/oval/
- Ubuntu Security Notices: https://ubuntu.com/security/notices

La documentación de Canonical establece que:

1. `affected[].package.name` es el **paquete fuente**, y `package.ecosystem` identifica la release Ubuntu (incluidas variantes Pro/ESM).
2. `affected[].versions` enumera versiones **fuente** afectadas.
3. `affected[].ranges[].events[].fixed` expresa la versión **fuente** que contiene el arreglo. Para Ubuntu, Canonical indica que el evento `introduced` es normalmente `0`; el equipo no registra el inicio de vulnerabilidad de la misma forma que otros ecosistemas.
4. `affected[].ecosystem_specific.binaries[]` enumera nombres y versiones de paquetes **binarios** asociados a la versión de paquete fuente parcheada. No es una lista de versiones binarias vulnerables.
5. En el ejemplo oficial `UBUNTU-CVE-2025-6491`, para Ubuntu 22.04 el evento `fixed` es `8.1.2-1ubuntu2.22` y los binarios publicados tienen esa misma versión; las versiones fuente anteriores figuran en `versions`. Esto demuestra que la coincidencia binaria exacta que hoy usa `matchUbuntuOsvBinary` puede identificar la versión corregida, no una versión afectada.

### Consecuencia para la implementación actual

- El matcher actual que trata la igualdad exacta con `binaries[].binary_version` como `matched` no debe usarse para afirmar afectación. La evidencia de binario puede ser evidencia de la versión corregida.
- No comparar `binaryVersion` con `ranges[].fixed` ni con `versions[]`: esos valores representan versiones fuente.
- Para determinar el estado de una instalación con rigor se necesita, como mínimo, binario + versión binaria + paquete fuente + versión fuente + release Ubuntu. El comando `dpkg-query` ya documentado proporciona `source:Version`; la UI/modelo actual aún no lo recoge.
- Un diseño futuro debe correlacionar primero paquete fuente/release y evaluar `sourceVersion` contra las versiones fuente OSV con semántica Debian (`dpkg`), no con el comparador genérico actual. También debe contrastar el binario y su versión contra `ecosystem_specific.binaries` para validar que pertenece a la compilación indicada.
- Si existe evento `fixed` y la versión fuente instalada es igual o posterior según orden Debian, puede considerarse corregida para ese advisory solo si la entrada fuente/release corresponde exactamente y el dato oficial es completo. Si es anterior y consta en `versions[]` (o está dentro de un rango interpretado correctamente), puede clasificarse como afectada/candidata. Cualquier hueco, contradicción o falta de versión fuente debe quedar en `needs_review`.
- Una combinación fuente/release ausente de `affected` no demuestra automáticamente `unaffected`: puede significar que Canonical no publica esa entrada, que el paquete no existe en esa release o que el feed no cubre el caso. No generar un estado negativo por ausencia.
- Ubuntu Security Tracker mapea `released` a OSV con `fixed`; `needed`, `pending`, `deferred`, `ignored` y `needs-triage` permanecen sin `fixed`. No son equivalentes entre sí y no deben resumirse todos como “afectado confirmado”.
- Ubuntu OVAL y USN OVAL son alternativas oficiales para validar aplicabilidad y parches; Canonical describe OVAL como datos machine-readable para CVEs y fixes, y USN como anuncio de una actualización ya publicada.

### Próximo trabajo (no implementado todavía)

1. Añadir fixtures basados en el ejemplo oficial OSV para probar: versión fuente listada como vulnerable; versión fuente igual a `fixed`; versión fuente posterior; binario exacto de la versión corregida; binario/versión no coincidentes; releases aisladas; ausencia de versión fuente.
2. Incorporar un comparador Debian fiable y cubierto por pruebas antes de usar `sourceVersion` para ordenar versiones. No reutilizar `compareVersions` de `correlation.js`.
3. Cambiar el modelo local/UI para recoger y conservar `sourceVersion` junto a `sourcePackage`, release, binario y versión binaria. El inventario seguirá en el navegador; no se transmitirá el inventario completo.
4. Revisar la lógica de producción del matcher y la correlación OSV: hasta corregirla y probarla, mantener resultados Ubuntu en revisión manual y no presentar la coincidencia binaria exacta como evidencia de afectación.
5. Evaluar OVAL/USN como verificación complementaria; no introducir un escáner remoto ni infraestructura facturable.

**Sin cambios de código de producción en este bloque.** No se modificaron recursos Azure, DNS, secretos ni infraestructura. Se mantiene Azure Static Web Apps Free y el objetivo de 0 € de infraestructura/servicios bajo nuestro control.


### 2026-10-30 — PR #12 y PR #13: clasificación Ubuntu OSV

- PR #12 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/12.
- Commit de merge PR #12: `930564215ecc6f2ec2bbc403ee3735a4e8241aa8`.
- Añade `classifyUbuntuOsvSourceVersion`: usa exclusivamente la versión del paquete fuente para evaluar `affected[].versions` y rangos `ECOSYSTEM`; una versión en o por encima de `fixed` queda como `patched_candidate`, nunca como parche confirmado.
- CI del commit final de PR #12 satisfactoria: https://github.com/carlosdans/quasaric/actions/runs/41121343055.
- PR #13 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/13.
- Commit de merge PR #13 / main: `f024f37d47d79dff8657eff3797e1eb6ffdba882`.
- Integra el clasificador en `src/lib/correlation.js`; requiere paquete fuente y release exactos, `sourceVersion` y coincidencia exacta del paquete binario/version en Ubuntu OSV. Falta de evidencia o discrepancia permanece en `needs_review`.
- La interfaz muestra estados diferenciados: afectado según Ubuntu OSV, candidato a parche (verificar), no afectado según entrada explícita y requiere revisión.
- Pruebas de integración nuevas en `src/lib/correlation.ubuntu-osv.test.js`: afectado, sourceVersion ausente, límite fixed, binario no coincidente, paquete/release distintos y estado explícito not-affected.
- CI de PR #13 satisfactoria: https://github.com/carlosdans/quasaric/actions/runs/41122820333.
- CI de `main` tras PR #13: run `41123347036`, inicialmente en cola; comprobar conclusión antes de dar el bloque por validado.
- Azure Static Web Apps de `main` tras PR #13: run `41123346868`, inicialmente en cola; comprobar conclusión antes de afirmar despliegue.
- Riesgo pendiente: el clasificador usa la semántica de Ubuntu OSV documentada por Canonical; seguir añadiendo fixtures reales por release/paquete, en particular estados pendientes y entradas no listadas. No declarar cobertura completa del inventario Ubuntu.
- Siguiente paso: confirmar CI y Azure del commit `f024f37d47d79dff8657eff3797e1eb6ffdba882`; después ampliar fixtures reales de Ubuntu OSV y revisar el resumen cuando un mismo CVE tenga varios componentes con estados distintos.


---

## Estado actualizado — 30 de octubre de 2026 (PR #15, #16 y #17)

**Esta sección prevalece sobre las fotografías históricas anteriores.**

### PR #15 — resumen conservador de aplicabilidad
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/15.
- Commit de `main`: `0721a21eb7c117ec9f7eff1262d770c550316827`.
- El estado agregado de un CVE conserva el estado común solo si todos los componentes tienen el mismo estado; ante resultados contradictorios, incompletos o ausentes, queda en `needs_review`.
- CI de `main`: https://github.com/carlosdans/quasaric/actions/runs/41124575890 (success).
- Azure Static Web Apps: https://github.com/carlosdans/quasaric/actions/runs/41124575980 (success).

### PR #16 — aislamiento por paquete fuente Ubuntu
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/16.
- Commit de integración: `f5f3dd0c009ee523a00219648e2ad83499c6c25c`.
- `matchUbuntuOsvBinary` requiere ahora nombre binario, versión binaria completa, release Ubuntu y paquete fuente explícito. Filtra primero por coincidencia exacta de `affected[].package.name` y `affected[].package.ecosystem`, y solo después compara nombre/versión binarios.
- Esto evita que un binario publicado bajo otro paquete fuente de la misma release valide la versión fuente de un componente distinto. La ausencia o discrepancia de evidencia sigue siendo `needs_review`.
- Se actualizaron las pruebas que llamaban al matcher con la firma antigua y se aclararon los motivos de discrepancia.
- CI final de PR #16 (tests de correlación y build): https://github.com/carlosdans/quasaric/actions/runs/41125710573 (success).
- CI de `main` tras merge: https://github.com/carlosdans/quasaric/actions/runs/41125794811 (success).
- Azure Static Web Apps tras merge: https://github.com/carlosdans/quasaric/actions/runs/41125794762 (success). El log confirma `Deployment Complete` y `https://orange-meadow-04bd1081e.4.azurestaticapps.net`.

### PR #17 — regresión de integración source-package
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/17.
- Commit de integración: `369cae516cdb66fa116e459ba6a02828b2759b95`.
- Añade una prueba en `src/lib/correlation.ubuntu-osv.test.js` con un advisory que contiene dos paquetes fuente para la misma release. Comprueba que el binario `curl`, aunque figure en el advisory, no valida un componente cuyo `sourcePackage` declarado es `openssl`; el resultado permanece `needs_review` y no se adjunta evidencia binaria.
- CI de PR #17 (tests y build): https://github.com/carlosdans/quasaric/actions/runs/41126005275 (success).
- CI de `main` tras merge: https://github.com/carlosdans/quasaric/actions/runs/41126093289 (success; tests y build).
- Azure Static Web Apps de `main` tras merge: https://github.com/carlosdans/quasaric/actions/runs/41126093274 (pendiente de comprobación).

### Estado y próximos pasos
- `main` apunta a `369cae516cdb66fa116e459ba6a02828b2759b95`.
- No hay PR abiertas después de integrar #17.
- Próximo bloque: ampliar fixtures de correlación con advisories Ubuntu OSV que incluyan varios paquetes fuente, varias releases y diferentes estados de parche, usando registros oficiales como referencia. Mantener la distinción entre ausencia de evidencia, coincidencia binaria y clasificación de versión fuente; no inferir `unaffected` por ausencia de entrada ni declarar cobertura Ubuntu completa.
- Tras completar CI/Azure de este commit, registrar sus conclusiones aquí. No alterar DNS, secretos ni recursos Azure.
- Se mantiene inventario local, sin envío del inventario completo, sin backend y sin infraestructura o servicios de pago.
