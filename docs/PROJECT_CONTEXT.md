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
- Azure Static Web Apps de `main` tras merge: https://github.com/carlosdans/quasaric/actions/runs/41126093274 (success). El log confirma `Deployment Complete` y `https://orange-meadow-04bd1081e.4.azurestaticapps.net`.

### Estado y próximos pasos
- `main` apunta a `369cae516cdb66fa116e459ba6a02828b2759b95`.
- No hay PR abiertas después de integrar #17.
- Próximo bloque: ampliar fixtures de correlación con advisories Ubuntu OSV que incluyan varios paquetes fuente, varias releases y diferentes estados de parche, usando registros oficiales como referencia. Mantener la distinción entre ausencia de evidencia, coincidencia binaria y clasificación de versión fuente; no inferir `unaffected` por ausencia de entrada ni declarar cobertura Ubuntu completa.
- Tras completar CI/Azure de este commit, registrar sus conclusiones aquí. No alterar DNS, secretos ni recursos Azure.
- Se mantiene inventario local, sin envío del inventario completo, sin backend y sin infraestructura o servicios de pago.


---

## Estado actualizado — 30 de octubre de 2026 (PR #19: fixtures Canonical Ubuntu OSV)

**Esta sección prevalece sobre las fotografías históricas anteriores.**

### PR #19 — regresiones con un advisory oficial
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/19.
- Commit de integración en `main`: `5d39a861da7f1d78be5a7425ed1610a22a7cc974`.
- Añade `src/lib/correlation.ubuntu-osv-canonical.test.js`, con extractos mínimos del registro oficial de Canonical `UBUNTU-CVE-2025-9230`: https://github.com/canonical/ubuntu-security-notices/blob/main/osv/cve/2025/UBUNTU-CVE-2025-9230.json.
- Cubre los límites `fixed` independientes de Ubuntu 22.04 y 24.04, una entrada Ubuntu Pro 16.04 para `nodejs` sin evento `fixed`, aislamiento por release y la ausencia de promoción cuando falta evidencia binaria exacta.
- CI de PR #19: https://github.com/carlosdans/quasaric/actions/runs/41126959239 (success; 71 pruebas y build de Vite correctos).
- CI de `main` tras integración: https://github.com/carlosdans/quasaric/actions/runs/41127058860 (success; 71 pruebas y build correctos).
- Azure Static Web Apps tras integración: https://github.com/carlosdans/quasaric/actions/runs/41127059025 (success). El log confirma `Deployment Complete` y `https://orange-meadow-04bd1081e.4.azurestaticapps.net`.

### Hallazgo y limitación importante
- El registro oficial CVE-2025-9230 lista versiones fuente vulnerables de OpenSSL para Ubuntu 24.04 hasta `3.0.13-0ubuntu3.5`, con versión fija `3.0.13-0ubuntu3.6`; la lista `ecosystem_specific.binaries` del registro contiene los builds binarios fijos `3.0.13-0ubuntu3.6`.
- La clasificación de versión fuente reconoce `3.0.13-0ubuntu3.5` como afectada, pero la correlación completa se queda deliberadamente en `needs_review` si el build binario instalado no coincide con la evidencia binaria exacta publicada.
- Este comportamiento evita una afirmación positiva sin prueba binaria, pero puede reducir cobertura y producir falsos negativos conservadores. No relajar la comparación ni afirmar que el inventario está afectado sin definir antes una regla segura para mapear el nombre binario al paquete fuente y usar correctamente la versión binaria publicada (que puede representar el build corregido).
- Canonical documenta que `affected[].package` identifica el paquete fuente y la release, que las versiones `fixed` se expresan en el rango de versión fuente, y que `ecosystem_specific.binaries` lista binarios y versiones asociadas. Consultar https://documentation.ubuntu.com/security/security-updates/osv/ antes de modificar esta semántica.
- Los ecosistemas Ubuntu Pro FIPS y variantes adicionales deben seguir considerándose cobertura no verificada; no inferir soporte solo por la prueba de `Ubuntu:Pro:16.04:LTS`.

### Próximos pasos
1. Diseñar y probar por separado la relación binario→fuente a partir de los datos explícitos de inventario y del significado real de `ecosystem_specific.binaries`; distinguir build vulnerable, build fijo y falta de evidencia.
2. Añadir casos reales de Ubuntu OSV con varios paquetes fuente, releases, entradas sin `fixed`, versiones enumeradas y versiones fijas con sufijos Debian/ESM.
3. Mantener `needs_review` ante cualquier ambigüedad; no convertir ausencia de binary mapping en `unaffected`.
4. Mantener seguimiento del despliegue Azure en cada integración; para el commit `5d39a861da7f1d78be5a7425ed1610a22a7cc974` quedó confirmado `Deployment Complete`.
5. No alterar DNS, secretos ni recursos Azure. Mantener inventario local y no enviar el inventario completo a terceros.


---

## Estado actualizado — 30 de octubre de 2026 (PR #20 integrada y cobertura de ecosistemas Ubuntu Pro)

### PR #20 — documentación Canonical OSV
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/20.
- Commit de integración: `00eff8fece92560ff087e003dea2c0768c25f97d`.
- El CI de la PR para `775eadb45af35b808195d9cb846ea148e7be72a8` terminó `success`: https://github.com/carlosdans/quasaric/actions/runs/41127289460.
- CI y Azure de `main` para el commit `00eff8fece92560ff087e003dea2c0768c25f97d`: success (CI run `41127556574`; Azure run `41127556572`).

### Hallazgo adicional — identificadores de ecosistema Ubuntu Pro
- La documentación oficial de Canonical enumera ecosistemas Ubuntu Pro adicionales: `Ubuntu:Pro:FIPS:YY.MM:LTS`, `Ubuntu:Pro:FIPS-updates:YY.MM:LTS`, `Ubuntu:Pro:FIPS-preview:YY.MM:LTS` y `Ubuntu:Pro:YY.MM:LTS:Realtime:Kernel`.
- El filtro de inventario y la validación de consulta OSV anteriores solo aceptaban Ubuntu base y `Ubuntu:Pro:YY.MM[:LTS]`; por tanto, los identificadores Pro anteriores quedaban fuera del flujo aunque Canonical documenta datos para ellos.
- PR #21 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/21. Commit `65ca36c70930661e0ee340308b1db11b02f9339a`.
- CI de PR #21: success (run `41127791973`). CI de `main`: success (run `41128543499`). Azure Static Web Apps de `main`: success (run `41128543384`).
- La implementación reconoce las formas documentadas mediante un validador compartido por el filtro de inventario y la consulta OSV, con pruebas positivas/negativas. Esto amplía el reconocimiento del ecosistema, no acredita cobertura completa de advisories ni aplicabilidad de paquetes FIPS/Realtime.



---


## Estado actualizado — 30 de octubre de 2026 (fixtures Ubuntu Pro FIPS, PR #24 integrada)

- PR #24 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/24.
- Commit de `main`: `75dc393f34c0d9fff21f2046d1216bca8704d0f3`.
- Añadidos extractos del registro oficial Canonical `UBUNTU-CVE-2025-9230` para `Ubuntu:Pro:FIPS-preview:22.04:LTS` y `Ubuntu:Pro:FIPS-updates:22.04:LTS`.
- Se prueba que `ecosystem_specific.binaries[].binary_version` no es automáticamente un límite corregido cuando el entry no contiene un evento fuente `fixed` (FIPS-preview).
- Se prueba que, cuando sí hay evento `fixed` (FIPS-updates), se comparan por separado la versión fuente y la versión binaria instalada frente a sus límites publicados.
- CI de PR #24: success, 79/79 tests y build (run `41130132126`). CI de `main`: success, 79/79 tests y build (run `41130219096`).
- Azure Static Web Apps para el commit `75dc393f34c0d9fff21f2046d1216bca8704d0f3`: run `41130219146`; verificar conclusión final antes de afirmar el despliegue.
- Este cambio añade solo fixtures y pruebas; no modifica lógica de producción, inventario, DNS, secretos ni infraestructura.

## Estado actualizado — 30 de octubre de 2026 (corrección de semántica de binarios Ubuntu OSV, PR #22 integrada)

### Hallazgo corregido
- El matcher anterior exigía que la versión binaria instalada coincidiera exactamente con `ecosystem_specific.binaries[].binary_version`.
- Canonical documenta `ecosystem_specific.binaries` como los binarios y sus versiones publicados para cada entrada de paquete fuente. Cuando la entrada tiene un evento fuente `fixed`, esa versión binaria sirve como límite del build corregido. Si no hay evento `fixed`, la versión binaria publicada no debe interpretarse automáticamente como límite de corrección.
- La versión del paquete fuente (`source:Version`) y la versión binaria instalada (`Version`) son evidencias distintas y se comparan solo con sus respectivos límites.

### PR #22 — integrada
- PR: https://github.com/carlosdans/quasaric/pull/22.
- Integrada mediante squash en `main`: `b18b75c57f8edbfb7f6c37cd21dfc2be202aae9e`.
- CI de la PR: success, 77/77 tests y build (run `41129409758`). CI de `main`: success, 77/77 tests y build (run `41129512724`).
- Azure Static Web Apps de `main`: success, run `41129512795`; el log confirma `Deployment Complete`. URL publicada: `https://orange-meadow-04bd1081e.4.azurestaticapps.net`.
- El matcher usa nombre binario, paquete fuente y release exactos para validar la relación publicada por Canonical; conserva por separado la versión binaria instalada y `advisoryBinaryVersion`.
- La clasificación de vulnerabilidad sigue usando exclusivamente `sourceVersion` frente a versiones/rangos fuente Ubuntu OSV, con comparación Debian.
- Para una fuente afectada con límite binario fijo, el binario instalado debe quedar por debajo del build fijo; si está en/por encima, la evidencia entra en conflicto y se conserva `needs_review`.
- Para una fuente en/por encima del límite fijo, solo se emite `patched_candidate` si la versión binaria instalada también está en/por encima del build binario fijo. No se confirma remediación.
- Si no hay build binario fijo (por ejemplo, avisos Pro sin evento `fixed`), la clasificación afectada solo se permite cuando la versión fuente está explícitamente listada y el nombre binario aparece en el mismo paquete fuente/release. Cualquier falta o contradicción permanece en `needs_review`.
- Pruebas añadidas/actualizadas: fixtures Canonical OpenSSL Ubuntu 22.04/24.04, binario vulnerable anterior al build fijo, límites de build fijo, contradicciones fuente/binario, aislamiento por release y paquete fuente.
- El cambio no altera el inventario local, la privacidad, DNS, secretos ni infraestructura.



---

## Estado actualizado — 31 de octubre de 2026 (PR #25: fixtures Ubuntu OSV)

**Esta sección prevalece sobre las fotografías históricas anteriores.**

- PR #25 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/25.
- Commit de `main`: `fccd1ce9dd20687e9a8b485bf7298cb33a48a88b`.
- Se amplía `src/lib/correlation.ubuntu-osv-canonical.test.js` con extractos de los registros Canonical `UBUNTU-CVE-2026-14164` (libarchive) y `UBUNTU-CVE-2026-54371` (attr).
- Casos añadidos: varios binarios para un paquete fuente; Ubuntu Pro 20.04 con sufijo `+esm`; versiones Debian con epoch `1:`; entrada sin evento `fixed` donde una versión no listada permanece en `needs_review`.
- La primera ejecución de CI falló porque el fixture ESM identificaba el ecosistema como Ubuntu 20.04 estándar; se corrigió al identificador oficial `Ubuntu:Pro:20.04:LTS`. La CI final de PR #25 fue satisfactoria: run `41130731361`.
- CI de `main` tras merge: run `41143961674`, success; 83 tests, 83 pass, 0 fail y build Vite correcto.
- Azure Static Web Apps tras merge: run `41143961689`, success; el log confirma `Deployment Complete` y publica `https://orange-meadow-04bd1081e.4.azurestaticapps.net`.
- Cambios solo en tests/fixtures. No se modificó lógica de producción, inventario, DNS, secretos ni infraestructura.

### Hallazgo de interpretación de estados Ubuntu OSV

- La documentación oficial de Canonical confirma que el feed OSV lista en `affected` los estados `needs-triage`, `needed`, `ignored`, `pending`, `deferred` e `in-progress` sin evento `fixed`; `released` sí se representa con `fixed`. Por tanto, un registro OSV sin `fixed` no permite distinguir por sí solo si Canonical aún no ha evaluado, si el paquete necesita parche, si el fix está pendiente de publicación, si se ha diferido o si se ha decidido no corregir.
- La ausencia de una entrada en `affected` tampoco es un estado negativo inferible por sí solo desde un extracto incompleto: Canonical excluye `DNE` y `not-affected` de esa lista, pero también se debe tener en cuenta la cobertura y completitud del feed consultado.
- Canonical documenta OpenVEX como formato complementario con estados más expresivos: `needs-triage` y `deferred` se representan como `under_investigation`; `needed` e `ignored` como `affected`; `released` como `fixed`. Considerar VEX para una futura mejora de estado, pero no mezclarla todavía con la lógica de correlación OSV.
- Referencias oficiales: https://documentation.ubuntu.com/security/security-updates/osv/ y https://documentation.ubuntu.com/security/security-updates/vex/.
- Mantener la política conservadora: si no hay evento `fixed`, no inferir un límite de corrección a partir de `binaries[].binary_version`; si faltan datos o el estado no puede distinguirse, conservar `needs_review` o una clasificación de afectación provisional sustentada por las versiones fuente explícitas. No presentar `patched_candidate` como remediación confirmada.

### Próximo trabajo

1. Despliegue de `main` verificado para el commit `fccd1ce9`: Azure run `41143961689` completó con `Deployment Complete`.
2. Evaluar una integración separada y acotada de OpenVEX para enriquecer el estado del tracker, con fixtures oficiales y sin debilitar la correlación OSV existente.
3. Mantener las pruebas sobre versiones Debian, ecosistemas Ubuntu Pro y casos sin evento `fixed`; no modificar lógica de producción hasta definir una semántica de estados y evidencias verificable.

---

## Estado actualizado — 31 de octubre de 2026 (PR #26 y PR #27: OpenVEX)

**Esta sección prevalece sobre las fotografías históricas anteriores.**

### PR #26 — documentación de estados Ubuntu OSV
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/26.
- Commit de main: 2210e07b1d15f22404528047f0f12c515f292776.
- docs/PROJECT_CONTEXT.md registra PR #25, la cobertura de 83 tests y la limitación de Ubuntu OSV: needs-triage, needed, ignored, pending, deferred e in-progress se publican sin evento fixed; OSV no permite distinguirlos individualmente.
- Se documenta Canonical OpenVEX como fuente complementaria para estados más expresivos. PR #26 CI: run 41144131357, success; 83 tests y build. CI de main: run 41144208720, success. Azure de main: run 41144208733, success.

### PR #27 — matcher exacto de productos Canonical OpenVEX
- Integrada mediante squash: https://github.com/carlosdans/quasaric/pull/27.
- Commit de main: 995862f31f64b59f92192c3be67c85657522f48d.
- Añade matchCanonicalUbuntuVexProduct en src/lib/vulnerabilitySources.js y pruebas en src/lib/vulnerabilitySources.ubuntu-vex.test.js.
- El matcher requiere nombre de binario, versión completa, arquitectura y PURL del paquete fuente Ubuntu con arch=source; además comprueba que el nombre del paquete fuente coincide con el inventario. Compara el producto VEX por nombre, versión, arquitectura y distro exactos.
- Conserva los estados OpenVEX affected, fixed, not_affected y under_investigation sin convertirlos a una conclusión CVE global. Falta de coincidencia, arquitectura ausente, PURL inválido o estados contradictorios produce needs_review.
- Fixture basado en extractos oficiales de Canonical CVE-2025-9230: https://github.com/canonical/ubuntu-security-notices/blob/main/vex/cve/2025/CVE-2025-9230.json.
- CI de PR #27: run 41144510693, success; 90 tests, 90 pass, 0 fail y build correcto.
- CI de main tras merge: run 41144582967, success; 90 tests, 90 pass, 0 fail y build correcto.
- Azure Static Web Apps de main para 995862f3: run 41144582958, success; el log confirma Deployment Complete y la URL https://orange-meadow-04bd1081e.4.azurestaticwebapps.net.

### Limitaciones y siguiente integración
- El matcher es una pieza de base y todavía no se invoca desde analyzeInventory; no hay descarga de VEX ni cambios de interfaz.
- El inventario actual no recoge arquitectura. Por diseño, el matcher devuelve needs_review si no se proporciona, por lo que no se puede aplicar aún a inventarios existentes.
- Antes de integrar VEX, añadir captura local opcional de arquitectura (por ejemplo, campo Architecture de dpkg), manteniendo la privacidad y sin transmitir el inventario. Asegurar también que el PURL fuente procede de la entrada OSV exacta de paquete/release.
- Diseñar la agregación cuando haya varios productos/arquitecturas y estados distintos. Nunca convertir not_affected de un producto en unaffected para todo el CVE ni un estado de un release/arquitectura en otro.
- Evaluar recuperación de VEX por CVE con control de errores y disponibilidad parcial. No bloquear el resultado OSV/NVD si VEX falla; mostrar la fuente/fecha de VEX y mantener el estado por producto.
- No modificar la clasificación actual ni afirmar remediación confirmada hasta disponer de fixtures y reglas de agregación verificables.
- No se modificaron DNS, secretos, inventario existente ni infraestructura. La integración PR #27 no transmite datos de inventario a Canonical.
---

## Estado actualizado — 31 de octubre de 2026 (PR #29: arquitectura en inventario Ubuntu)

- PR #29 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/29.
- Commit de main: ca1f4c314f69b63e038aeeb9193075babad78003.
- El formulario de inventario local añade arquitectura Ubuntu opcional y la muestra en la lista de componentes. El CSV de inventario incluye la nueva columna architecture; los inventarios antiguos siguen siendo compatibles porque el campo es opcional.
- El comando local read-only dpkg-query ahora recopila binary:Package, Version, Architecture, source:Package y source:Version. No requiere sudo ni realiza conexiones de red.
- Añadido src/lib/inventoryCommands.test.js para comprobar que se recopilan los cinco campos y que el comando permanece local/read-only.
- CI de PR #29: run 41145016257, success; 92 tests, 92 pass, 0 fail y build Vite correcto.
- CI de main tras merge: run 41145107235, success; 92 tests, 92 pass, 0 fail y build Vite correcto.
- Azure Static Web Apps de main para ca1f4c31: run 41145107186, success; el log confirma Deployment Complete y la URL https://orange-meadow-04bd1081e.4.azurestaticapps.net.
- El campo architecture prepara la integración futura del matcher Canonical OpenVEX, que exige coincidencia exacta de arquitectura. Todavía no se consulta VEX ni se altera la clasificación OSV/NVD.
- No se envía el inventario a Canonical ni a terceros; no se modificaron DNS, secretos o infraestructura.

### Próximo trabajo

1. Despliegue Azure del commit ca1f4c31 verificado: run 41145107186 completó con Deployment Complete.
2. Diseñar recuperación VEX por CVE y adjuntar el estado por componente solo cuando coincidan PURL fuente, paquete binario, versión completa, arquitectura y distro exactos.
3. Mantener separadas las evidencias OSV y OpenVEX; resolver explícitamente discrepancias y no elevar not_affected de un producto a un estado global del CVE.
4. Si VEX no existe, falla o no contiene el PURL exacto, conservar la clasificación OSV existente y señalar la ausencia de evidencia VEX sin inferir un estado negativo.


---

## Estado actualizado — 31 de octubre de 2026 (PR #31: integración Canonical OpenVEX)

- PR #31 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/31.
- Commit de main: `0e86dfd8d37e6f8150740b830bf31ca6bc4bf6fc`.
- La correlación de inventario consulta el documento público OpenVEX de Canonical por CVE desde `ubuntu-security-notices/vex/cve/<year>/<CVE-ID>.json`. La petición solo contiene el identificador CVE; no se envían nombre de paquete, versión, arquitectura ni inventario.
- La consulta OpenVEX se limita a CVEs procedentes de las entradas Ubuntu OSV relacionadas con componentes locales que tienen arquitectura y PURL de paquete fuente. Concurrencia máxima: 4; límite de 100 documentos por análisis.
- El PURL fuente OSV debe corresponder al paquete fuente y ecosistema exactos; el producto OpenVEX se compara por nombre de binario, versión Debian completa, arquitectura y distro exactos.
- Los estados OpenVEX `affected`, `fixed`, `not_affected` y `under_investigation` se adjuntan como evidencia independiente por componente, con timestamp, versión de documento y URL de origen. No modifican `applicability`, `ubuntuOsv` ni el estado agregado del CVE.
- Si faltan arquitectura/PURL, no existe coincidencia exacta o falla la descarga, OpenVEX queda en `needs_review` o `unavailable`; se conserva la clasificación OSV/NVD y se informa del error. Un `not_affected` de un producto no se convierte en una conclusión global.
- La interfaz de resultados muestra OpenVEX por separado de la aplicabilidad OSV/NVD.
- Tests añadidos para estados exactos, arquitectura/PURL ausentes, discrepancia de distro, origen del fetch, CVE inválido y respuesta malformada.
- CI de PR #31: run `41145916798`, success; CI de main: run `41145990646`, success; **100 tests, 100 pass, 0 fail** y build Vite correcto (`✓ built in 2.37s`).
- Azure Static Web Apps para main: run `41145990560`, success; el log confirma `Deployment Complete` y publica https://orange-meadow-04bd1081e.4.azurestaticapps.net.
- No se modificaron DNS, secretos ni recursos de infraestructura; no se envió inventario a Canonical ni a terceros.

### Próximos pasos

1. Añadir pruebas de integración de `analyzeInventory` con fetches simulados para comprobar que los resultados OpenVEX se adjuntan al componente correcto cuando NVD y Ubuntu OSV devuelven el mismo CVE.
2. Mejorar la presentación del motivo y enlace del documento VEX por componente, conservando el estado independiente y el timestamp.
3. Revisar el límite de 100 documentos y la estrategia de caché durante un análisis con inventarios de mayor cobertura; no persistir el inventario en servicios remotos.
4. Mantener `patched_candidate` como candidato sujeto a verificación; nunca afirmar remediación confirmada solo por un estado VEX `fixed`.



---

## Estado actualizado — 31 de octubre de 2026 (PR #33: pruebas de integración OpenVEX y UI)

- PR #33 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/33.
- Commit de main: `c5118f26186c4ec3d754846d99bd7885ffa66d00`.
- `analyzeInventory` admite inyección opcional de fuentes para pruebas deterministas. En producción conserva las mismas funciones NVD, Ubuntu OSV, Canonical OpenVEX, EPSS y KEV por defecto.
- Nuevo test de integración `src/lib/correlation.ubuntu-vex-integration.test.js` cubre:
  - mismo CVE devuelto por NVD y Ubuntu OSV: OpenVEX se añade al componente sin sobrescribir `applicability`;
  - fallo de descarga VEX: se conserva la evaluación NVD/OSV y se marca VEX como no disponible;
  - arquitectura ausente: no se hace petición OpenVEX y el estado queda en `needs_review`;
  - CVE que llega solo por Ubuntu OSV: se crea el finding y se adjunta evidencia VEX;
  - múltiples binarios locales para un mismo CVE: un solo fetch del documento VEX.
- La interfaz muestra por componente el estado OpenVEX, motivo de revisión, fecha del documento y enlace al documento Canonical, separado de la aplicabilidad NVD/OSV.
- CI de PR #33: run `41146888837`, success; CI de main: run `41146976567`, success; **105 tests, 105 pass, 0 fail**, build Vite correcto (`✓ built in 1.99s`).
- Despliegue Azure de main para commit `c5118f26186c4ec3d754846d99bd7885ffa66d00`: run `41146976584`, success; log confirma `Deployment Complete` y publica https://orange-meadow-04bd1081e.4.azurestaticapps.net.
- No se han modificado DNS, secretos ni infraestructura; las pruebas usan fixtures locales y no transmiten inventario.

### Próximos pasos

1. Comprobar el despliegue de Azure del commit `c5118f2`.
2. Evaluar caché efímera por CVE durante un único análisis para evitar repetir consultas VEX si la lógica evoluciona a más de una ruta de evaluación; no persistir inventario ni versiones instaladas.
3. Añadir tests de límite y concurrencia para el máximo de 100 documentos y cuatro fetches simultáneos.
4. Mantener la evidencia OpenVEX independiente y no convertir `fixed` o `not_affected` en conclusiones globales del CVE.


---

## Estado actualizado — 31 de octubre de 2026 (PR #35: límites de recuperación OpenVEX)

- PR #35 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/35.
- Commit de main: `01ab819504702be11daa2f267adac11d45c67a9c`.
- Añadidas pruebas de integración que verifican el máximo de 100 documentos OpenVEX por análisis y un máximo de cuatro fetches concurrentes.
- Se verifica que el análisis continúa con los CVEs restantes: los documentos fuera del límite quedan sin evidencia VEX y se registra el motivo; no se convierten en `not_affected`.
- CI de PR #35: run `41147290551`, success; **107 tests, 107 pass, 0 fail**, build Vite correcto (`✓ built in 2.72s`).
- El cache de documentos ya existe en memoria por análisis mediante el mapa `vexDocuments`, indexado por CVE; no se persiste entre análisis ni se envía inventario.
- El límite y la concurrencia están cubiertos por pruebas deterministas usando fuentes simuladas locales.
- No se modificaron DNS, secretos ni infraestructura; los tests no transmiten inventario.

### Próximos pasos

1. Confirmar CI de main y despliegue Azure del commit `01ab819`.
2. Revisar si el fetch de Ubuntu OSV y el de Canonical OpenVEX podrían compartir una caché efímera por ejecución cuando se añadan nuevas fuentes, sin almacenar inventario.
3. Mantener el límite explícito de 100 documentos y la concurrencia máxima de cuatro salvo evidencia medida que justifique cambiarlo.
4. Continuar tratando OpenVEX como evidencia por producto exacto, no como veredicto CVE global.


---

## Estado actualizado — 31 de octubre de 2026 (PR #37: discrepancias Ubuntu OSV / Canonical OpenVEX)

- PR #37 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/37.
- Commit de integración en `main`: `5124475aec4a834307238855aca399ada9da31c0`.
- La correlación conserva ahora `ubuntuOsv` por componente incluso cuando NVD ya había creado el hallazgo para ese mismo CVE/componente. La evaluación `applicability` de NVD no se sobrescribe.
- Tras adjuntar la evidencia OpenVEX exacta, se compara con la clasificación OSV del mismo componente. Se etiqueta `ubuntuVex.consistency.status` como `conflicting`, `aligned` o `not_comparable`; esta metadata es diagnóstica y no modifica la clasificación de ninguna fuente ni el resumen CVE.
- Contradicciones cubiertas: Ubuntu OSV `affected` frente a OpenVEX `fixed`/`not_affected`; OSV `patched_candidate` frente a VEX `affected`; OSV `unaffected` frente a VEX `affected`.
- `under_investigation`, estados OSV incompletos, evidencia ausente o no comparable permanecen sin conclusión automática.
- Se añadieron pruebas de integración para:
  - NVD + OSV + VEX sobre el mismo CVE, verificando que la aplicabilidad NVD se conserva y que la discrepancia se señala.
  - Dos binarios (`openssl` y `libssl3`) del mismo paquete fuente con estados VEX distintos; cada estado se asocia exclusivamente al PURL exacto.
  - OSV `patched_candidate` frente a VEX `affected`.
- La interfaz muestra por separado el estado OSV y el estado VEX por componente, con una advertencia explícita cuando existe conflicto.
- CI de PR #37: run `41148044569`, success; **110 tests, 110 pass, 0 fail**, build Vite correcto (`✓ built in 2.93s`).
- El cambio no convierte una señal de un binario en un veredicto global del CVE y no confirma remediación.
- No se modificaron DNS, secretos, recursos Azure ni el flujo de privacidad. El inventario no se transmite a Canonical; solo se consulta el documento público por CVE.
- Pendiente de confirmar en CI/Azure el despliegue del commit de integración `5124475`.


---

## Estado actualizado — 31 de octubre de 2026 (PR #39: trazabilidad de evidencias por fuente)

- PR #39 integrada mediante squash: https://github.com/carlosdans/quasaric/pull/39.
- Commit de integración en `main`: `a997ef2684d3a5b13f8c988a8426fb1e16e5538c`.
- Cada componente asociado a un CVE incluye ahora `evidence[]`, con registros separados por fuente:
  - NVD: estado de aplicabilidad NVD, motivo, fecha de publicación/última modificación, identificador CVE, URL NVD y referencias disponibles.
  - Ubuntu OSV: estado y motivo de la clasificación por componente, identificador OSV Ubuntu cuando está disponible, fechas `published`/`modified`, URL del registro OSV y referencias del aviso.
  - Canonical OpenVEX: estado exacto del producto, timestamp del documento, versión documental y URL de origen.
- Cada registro conserva los detalles del producto local al que se refiere: nombre y versión binaria, paquete y versión fuente, arquitectura y ecosistema/distribución. Estos datos se mantienen en el navegador; no se transmiten a las fuentes.
- Se distingue explícitamente si un componente fue realmente emparejado con NVD. Los hallazgos procedentes únicamente de Ubuntu OSV no reciben una entrada NVD ficticia.
- La interfaz de resultados incorpora un panel desplegable de trazabilidad por componente. La exportación CSV de hallazgos añade una columna JSON con el conjunto completo de evidencias por fuente.
- El timestamp OpenVEX se etiqueta como fecha del documento; no se presenta como fecha de publicación o modificación del aviso.
- Las pruebas de integración comprueban identificadores, estados, URLs, referencias, fechas, versión documental y producto exacto, además de verificar que los hallazgos OSV-only no reclaman procedencia NVD.
- CI de PR #39: run `41150868942`, success; **112 tests, 112 pass, 0 fail**, build Vite correcto (`✓ built in 2.93s`).
- La trazabilidad es descriptiva: no cambia las clasificaciones NVD/OSV/VEX, el cálculo de conflictos ni las conclusiones de aplicabilidad o remediación.
- No se modificaron DNS, secretos ni infraestructura. El inventario permanece local; solo se consultan y enlazan avisos y documentos públicos.
- Pendiente de confirmar CI y despliegue Azure del commit de integración `a997ef2`.


## 8. Cambios del 31 de octubre de 2026

- PR #42 integrada: CSP permite las fuentes Ubuntu OSV y OpenVEX de Canonical (api.osv.dev y raw.githubusercontent.com). CI y despliegue Azure de main satisfactorios.
- PR #43 integrada: metadatos SEO, URL canónica, Open Graph/Twitter, robots.txt y sitemap.xml.
- Se añadieron pruebas automáticas de configuración de Static Web Apps: fallback SPA, cabeceras de seguridad y directivas CSP.
- Se incorporó un panel de primeros pasos en el resumen, visible cuando el inventario está vacío, con tres pasos y acceso directo a añadir el primer componente.
- Se amplió el aviso de privacidad para explicar que el inventario permanece local, pero las consultas a fuentes externas pueden revelar la IP y los identificadores consultados.
- CI del commit 4f1c63bfd6e492e27913b54a9f0d3969a03030fd satisfactoria. El despliegue Azure de ese commit falló por una colisión temporal entre despliegues concurrentes (No matching Static Web App environment was found). El despliegue del commit anterior b8437721797d6d281ab2717f410ac4fae918613d fue satisfactorio. Reintentar despliegue en un nuevo push y verificar el run antes de afirmar que el último CSS está publicado.


## 9. Cambios del 31 de octubre de 2026 — Centro de confianza

- Commit directo a `main`: `393d31acf956fcd34bb62b9869136eaea7748e0a`.
- Se añadió en Configuración un Centro de confianza bilingüe (español/inglés) con apartados de privacidad y datos, metodología y fuentes, limitaciones/uso responsable y contacto.
- La sección explica el almacenamiento local del inventario y de hasta 10 snapshots, la exposición potencial de IP y términos de consulta a servicios públicos, y recomienda no introducir datos personales, nombres de clientes, credenciales, tokens ni secretos.
- Se documentan las funciones diferenciadas de NVD, FIRST EPSS, CISA KEV, Ubuntu OSV y Canonical OpenVEX. La puntuación de triage se describe como heurística, no como probabilidad ni veredicto.
- Se explicita que la aplicación no escanea redes o equipos ni aplica parches; una coincidencia requiere validación y la ausencia de resultados no demuestra seguridad.
- README actualizado para enlazar conceptualmente la explicación visible en la aplicación y precisar que no sustituye una política legal ni una auditoría de los servicios de alojamiento/analítica.
- Estilos específicos para mejorar legibilidad de textos extensos y enlaces de fuentes en el Centro de confianza.
- CI: run [41200318548](https://github.com/carlosdans/quasaric/actions/runs/41200318548), success.
- Despliegue Azure: run [41200318556](https://github.com/carlosdans/quasaric/actions/runs/41200318556), success.
- No se modificaron DNS, secretos ni recursos de infraestructura.


---

## Estado actualizado — 31 de octubre de 2026 (CPE de distribuciones y escapes)

- HEAD verificado de `main`: `c6217354272d3bad6bb23ffbb72e48966ea36d77` (`Preserve escaped underscores in CPE product names`).
- Se amplió la clasificación de sistemas operativos para AlmaLinux, Rocky Linux, SUSE Linux Enterprise Server/SLES y Windows Server 2019/2025, manteniendo los pares CPE vendor/product explícitos.
- El parser CPE preserva los guiones bajos escapados en los campos vendor y product. Los guiones bajos no escapados continúan normalizándose como separadores; se añadieron regresiones para distinguir ambos casos.
- CI de `main`: [run 41238216338](https://github.com/carlosdans/quasaric/actions/runs/41238216338), `success`.
- Despliegue Azure de `main`: [run 41238216322](https://github.com/carlosdans/quasaric/actions/runs/41238216322), `success`.
- Ambos workflows completaron correctamente para el HEAD indicado. No se modificaron DNS, secretos ni recursos de infraestructura.

### Próxima revisión técnica

- Ampliar fixtures con registros CPE/NVD reales para contrastar los nombres vendor/product y los rangos por distribución, sin introducir alias genéricos que puedan generar falsos positivos.
- Mantener la regla de coincidencia exacta por producto y parte CPE; los nombres/versiones sin evidencia suficiente deben seguir en revisión.


## Estado actualizado — 1 de noviembre de 2026 (correlación CPE estricta)

- HEAD de `main`: `3f12ec264882e63726b8e51e7d7a9eae70b13b64` (`Align CPE parser tests with verified product matching`).
- La correlación CPE falla de forma cerrada para etiquetas de inventario sin una pareja vendor/product explícitamente conocida; no se infiere que el nombre local sea ambos campos CPE.
- Se añadió el par explícito OpenSSL `openssl:openssl`, necesario para correlacionar el producto real sin reintroducir coincidencias genéricas.
- Los campos CPE conservan los guiones bajos escapados como caracteres literales; los guiones bajos sin escapar se normalizan como separadores, conforme a los nombres CPE observados.
- Los pares Rocky Linux, SLES, Windows Server 2025, OpenSSL, Node.js, Apache HTTP Server, PHP, Python, NGINX y AlmaLinux se contrastaron con entradas del diccionario oficial NVD:
  - https://nvd.nist.gov/products/cpe/detail/1350429 (Rocky Linux, parte OS).
  - https://nvd.nist.gov/products/cpe/detail/398663 (SUSE Linux Enterprise Server).
  - https://nvd.nist.gov/products/cpe/detail/7b6738c8-9c48-49c9-a77d-bad316a73a45 (Windows Server 2025).
  - https://nvd.nist.gov/products/cpe/detail/6ffb0e8b-96dd-4965-968d-fbacda229444 (OpenSSL).
  - https://nvd.nist.gov/products/cpe/detail/68c01cb4-fd8c-455f-b561-ef4e6e05c40f (Node.js).
  - https://nvd.nist.gov/products/cpe/detail/4ed82f91-eee8-4010-bb0e-fabb22d8aef4 (Apache HTTP Server).
  - https://nvd.nist.gov/products/cpe/detail/1695313 (PHP).
  - https://nvd.nist.gov/products/cpe/detail/1638503 (Python).
  - https://nvd.nist.gov/products/cpe/detail/d455ea67-dd38-43e1-a35a-5ac268d759ab (NGINX; entrada histórica/deprecada).
  - https://nvd.nist.gov/products/cpe/search/results?keyword=cpe%3A2.3%3Ao%3Aalmalinux (AlmaLinux).
- La entrada NVD de Rocky Linux muestra que algunos registros históricos aparecen inicialmente con parte `a` y se deprecian a parte `o`; el matching de inventario OS exige la parte `o`.
- CI y despliegue Azure del commit `3f12ec2`: CI run [41262387014](https://github.com/carlosdans/quasaric/actions/runs/41262387014), success; Azure run [41262387123](https://github.com/carlosdans/quasaric/actions/runs/41262387123), success.
- Siguiente criterio: no añadir nuevas parejas por semejanza textual; exigir una entrada CPE oficial y una prueba positiva y negativa por vendor/product y parte.


### Alias Node.js en inventario

- `node`, `node.js` y `nodejs` se normalizan a la identidad CPE explícita `nodejs:node.js` (con compatibilidad para la identidad histórica `node.js:node.js`).
- El alias `nodejs` tiene prueba positiva y negativa: acepta el vendor/product oficial y rechaza un vendor distinto. Esto no amplía el matching a productos de nombre parecido.

### Alias `httpd` de inventario

- `httpd` se trata como alias de Apache HTTP Server para búsquedas y matching CPE, pero solo acepta la pareja exacta `apache:http server`.
- Hay pruebas para la identidad correcta, un vendor inesperado y Apache Tomcat; no se acepta cualquier producto del vendor Apache.


### Alias `apache2` de inventario

- `apache2`, habitual en inventarios de paquetes Debian/Ubuntu, se normaliza como Apache HTTP Server para búsqueda y matching CPE.
- La clasificación lo reconoce como componente web y el matching exige la pareja exacta `apache:http_server`; no se amplía a Apache Tomcat ni a otros proyectos Apache.
- Se añade una prueba de clasificación del alias y pruebas CPE positivas/negativas.


### Clasificación de OpenSSL en inventario

- OpenSSL se reconoce como `library` (librería/dependencia), no como runtime ni servidor.
- Su identidad CPE continúa restringida a `openssl:openssl`; la clasificación visual no amplía los criterios de correlación.
- Se añade una prueba para que el alta manual recomiende el tipo correcto.


### Alias `Node JS` en inventario

- `Node JS` se reconoce como variante ortográfica de Node.js en la clasificación, búsqueda y correlación CPE.
- El alias conserva exclusivamente las identidades CPE explícitas `nodejs:node.js` y `node.js:node.js`; una pareja con vendor distinto se rechaza.
- Se añaden pruebas positivas y negativas para evitar ampliar el matching por semejanza textual.

## Estado actualizado — 1 de noviembre de 2026 (clasificación de OpenSSL y alias Node JS)

- Commit `593d077de509b79173ba4a4b462ffa77e0a38013`: OpenSSL se clasifica como `library` en el inventario; su identidad CPE permanece restringida a `openssl:openssl`.
- CI de `593d077`: [run 41284729532](https://github.com/carlosdans/quasaric/actions/runs/41284729532), success. Azure: [run 41284729534](https://github.com/carlosdans/quasaric/actions/runs/41284729534), success.
- Commit `6a41b50ff03d7f9f3f11375f91b697984e18cd82`: `Node JS` se reconoce como alias de Node.js para clasificación, búsqueda y correlación CPE.
- El alias `Node JS` solo acepta las parejas explícitas `nodejs:node.js` y `node.js:node.js`; se comprueba también el rechazo de un vendor distinto.
- CI de `6a41b50`: [run 41285684116](https://github.com/carlosdans/quasaric/actions/runs/41285684116), success. Azure: [run 41285684190](https://github.com/carlosdans/quasaric/actions/runs/41285684190), success.
- HEAD validado de `main`: `6a41b50ff03d7f9f3f11375f91b697984e18cd82`. Ambos workflows están completados correctamente.
