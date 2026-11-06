# Quasaric — contexto operativo actual

> Documento de continuidad. Esta sección describe el estado real del código de `main`; no sustituye las limitaciones que muestra la aplicación.
>
> **Actualizado:** 6 de noviembre de 2026  
> **Repositorio:** https://github.com/carlosdans/quasaric  
> **Rama:** `main`  
> **HEAD de código validado:** `0a6b47a4cecbeaae275b391f7efe8db3460e93fc`

## 1. Objetivo y límites

Quasaric es una SPA estática para correlacionar un inventario tecnológico declarado por el usuario con fuentes públicas de vulnerabilidades. No es un escáner de red, un agente, una herramienta de explotación ni un sistema de monitorización.

La prioridad es la trazabilidad y la interpretación conservadora. Una coincidencia de producto, un aviso de distribución, una versión corregida publicada o una señal KEV/EPSS no equivalen por sí solos a una vulnerabilidad confirmada ni a una remediación confirmada. La ausencia de resultados tampoco demuestra que el sistema sea seguro.

## 2. Arquitectura y requisito de coste cero

- React 19 + Vite 8; interfaz en español e inglés.
- Alojamiento estático en Azure Static Web Apps, con **plan Free como requisito de diseño**.
- App location `/`, API location vacía y output `dist`; despliegue desde `main`.
- No hay backend propio, Azure Functions, base de datos, colas, contenedores ni almacenamiento central.
- Inventario, preferencias e historial se guardan localmente en el navegador. Las consultas a proveedores públicos se hacen desde el cliente y envían identificadores mínimos, no el inventario completo.
- No introducir recursos, SaaS, APIs comerciales, claves de pago, dependencias o servicios que puedan facturar. Si una mejora no cabe en el nivel gratuito, se limita o se deja fuera.
- No modificar suscripción, plan, recursos ni facturación del portal Azure.
- La configuración de despliegue busca coste de infraestructura 0 €. No se ha verificado el estado real de facturación ni el plan contratado en el portal Azure; no afirmar que se ha auditado la factura.
- Dominio conocido: https://quasaric.com. URL Azure conocida: https://orange-meadow-04bd1081e.4.azurestaticapps.net.

## 3. Funcionalidad implementada

### Inventario e importación

- Inventario local de hasta 50.000 componentes, condicionado por el límite de 10 MiB y la capacidad del navegador.
- Alta manual con nombre, tipo, versión, proveedor/ecosistema, PURL, CPE, paquete fuente, versión fuente y arquitectura cuando corresponde.
- Importación CSV local: 5 MiB, 50.000 filas de datos, 32 columnas y 16.384 caracteres por celda. Valida esquema, cabeceras, tipos, filas y tamaños; informa de filas rechazadas sin perder las válidas.
- Importación SBOM: CycloneDX JSON 1.4–1.7 (incluidos componentes anidados de forma recursiva) y SPDX JSON 2.3; máximo 10 MiB y 50.000 componentes totales. No consulta servicios externos durante la importación.
- Las relaciones fuente→binario se conservan solo si el documento las declara explícitamente: SPDX `GENERATED_FROM`, propiedades `quasaric:source*` o ancestro CycloneDX con PURL RPM `arch=src`. No se infieren por nombres parecidos.
- CSV y backups JSON preservan PURL/CPE, arquitectura y metadatos de procedencia. Backups versionados y comparación local de inventarios.
- Almacenamiento local con validación de campos y copia de recuperación cuando puede rescatarse información corrupta.
- Control de calidad: versiones binarias ausentes, versiones fuente incompletas y posibles duplicados. La identidad de duplicado incluye tipo, proveedor, ecosistema, versión, arquitectura, paquete/versión fuente, PURL y CPE; no se eliminan componentes automáticamente.

### Correlación y fuentes

- NVD: búsquedas por palabra clave y CPE; consulta paginada y evaluación de coincidencias de producto, configuraciones CPE y rangos. Las búsquedas por palabra clave se limitan a 6.000 registros y se informa del truncamiento.
- FIRST EPSS y catálogo CISA KEV: señales separadas de severidad y aplicabilidad.
- OSV por PURL explícito: avisos de ecosistemas compatibles; los avisos sin CVE asociado se muestran aparte y requieren revisión.
- Ubuntu OSV: consulta por paquete fuente y ecosistema/release explícitos; relación binario→fuente y versión binaria corregida solo cuando el aviso publica el mapeo `ecosystem_specific.binaries`. Se comparan por separado versión fuente y binaria.
- Canonical OpenVEX: evidencia independiente por CVE y producto exacto, con distro, versión completa y arquitectura; nunca sobrescribe la clasificación NVD/OSV.
- OSV para AlmaLinux, Rocky Linux, SUSE y openSUSE: coincidencia de paquete/ecosistema; erratas oficiales individuales cuando se dispone de identificadores compatibles.
- Red Hat Security Data: evidencia por CVE y paquete; distingue coincidencia binaria de evidencia indirecta por paquete fuente.
- SUSE CSAF VEX: correlación por PURL RPM, producto y arquitectura; las relaciones fuente/binario requieren referencias explícitas del documento.
- Comparadores de versiones: Debian/Ubuntu, RPM EVR, Python PEP 440, npm/Composer SemVer (identificadores numéricos comparados con enteros de precisión arbitraria) y builds de Windows. Un formato desconocido o un rango no ordenable permanece en revisión.
- Priorización de hallazgos con señales separadas (CVSS, EPSS, KEV y contexto); la puntuación es una ayuda de triage, no una probabilidad de explotación.
- Orientación de remediación conservadora: las versiones objetivo son candidatas, no una orden de actualización ni confirmación de parche aplicado.

### Informes e historial

- Panel de resumen, inventario, vulnerabilidades, informes, guía de versiones y configuración.
- Filtros y detalle de hallazgos con trazabilidad por componente/fuente, errores y límites.
- Exportación CSV de inventario y hallazgos; informe imprimible desde el navegador (puede guardarse como PDF mediante el diálogo del navegador).
- Historial local de hasta 10 análisis, comparación de inventarios e indicadores de postura/dwell. Las fechas representan observaciones, no fechas inferidas de remediación.
- Cambio del inventario invalida los resultados visibles que ya no corresponden a la composición actual.

## 4. Límites de consulta y protección de recursos

- Inventario local: 50.000 componentes / 10 MiB.
- CSV: 5 MiB / 50.000 filas / 32 columnas / 16.384 caracteres por celda.
- SBOM: 10 MiB / 50.000 componentes.
- Backups e historial: 10 MiB; historial máximo de 10 snapshots.
- Lector JSON común: 20 MiB; respuestas OSV: 5 MiB. Se comprueba Content-Length y el tamaño real del stream.
- Cada petición individual a una fuente pública tiene un timeout de 30 segundos que incluye la lectura del cuerpo; la cancelación del usuario conserva su estado AbortError y los timeouts se notifican como error de fuente, nunca como ausencia de vulnerabilidades.
- OSV PURL: máximo 100 grupos por análisis; detalles hasta 200 avisos por consulta y concurrencia acotada.
- Ubuntu OSV por fuente: máximo 100 grupos por análisis y tres peticiones simultáneas. Los grupos restantes se notifican como cobertura parcial.
- OSV de distribuciones: máximo 100 grupos por análisis.
- OpenVEX, Red Hat y SUSE CSAF: hasta 100 CVE/documentos por análisis en sus respectivas colas.
- Los errores de fuentes no se convierten en resultados vacíos ni en ausencia de vulnerabilidades. Los límites alcanzados deben aparecer como cobertura parcial.
- Las fuentes públicas pueden cambiar, limitar tráfico o estar temporalmente no disponibles. Las consultas pueden revelar la IP del visitante y los CVE/PURL consultados.

## 5. Seguridad, privacidad y accesibilidad

- `staticwebapp.config.json`: fallback SPA, CSP restrictiva, `nosniff`, `DENY`, Referrer-Policy y Permissions-Policy.
- La CSP permite únicamente los orígenes externos requeridos por los conectores actuales; cualquier conector nuevo debe añadir su host de forma deliberada y tener prueba de regresión.
- Los enlaces externos generados desde datos de fuentes pasan por validación HTTPS antes de mostrarse.
- No introducir contraseñas, tokens, secretos ni datos personales en el inventario.
- Mantener navegación por teclado, foco visible, diálogos accesibles, etiquetas de controles y respeto por movimiento reducido. Los cambios visuales deben conservar contraste en temas claro y oscuro y en móvil.
- La documentación y la interfaz deben distinguir siempre datos declarados, evidencia de proveedor, inferencias y límites.

## 6. Desarrollo y validación

Requisitos: Node.js 20 o 22 y npm.

```bash
npm install
npm test
npm run build
npm run dev
npm run preview
```

CI ejecuta tests y build con Node 22 en cada push a `main`. El workflow de Azure publica desde `main` y omite despliegues cuando el cambio solo afecta a documentación, pruebas o workflows; si el mismo commit incluye código de aplicación, el despliegue sigue ejecutándose. No declarar publicado un cambio hasta verificar el run de Azure del commit exacto.

**Última validación de código en `main`:** commit `0a6b47a4cecbeaae275b391f7efe8db3460e93fc`; 609/609 tests correctos y build de producción correcto en Node 22. CI y despliegue Azure Static Web Apps [42251128498](https://github.com/carlosdans/quasaric/actions/runs/42251128498), satisfactorio el 6 de noviembre de 2026.

La portada pública y la plataforma se cargan ahora por separado: el navegador descarga primero la web pública y carga el bundle de la aplicación y sus estilos al entrar en `#app`. En el build validado, el JavaScript inicial queda en 253,30 kB (80,47 kB gzip); la plataforma se sirve en un chunk de 197,94 kB (51,75 kB gzip) y el motor de correlación en otro de 71,68 kB (21,49 kB gzip). Frente al bundle inicial anterior de 448,56 kB, supone una reducción aproximada del 43,5 % del JavaScript inicial. No se añaden dependencias ni servicios; el inventario y el análisis mantienen su funcionamiento local-first.

## 7. Limitaciones y trabajo pendiente

1. Ampliar fixtures de regresión con CVE/CPE reales de NVD y avisos oficiales de distribuciones; validar falsos positivos y negativos antes de elevar confianza.
2. Revisar cobertura de CPE y búsquedas por palabra clave; 6.000 resultados es un límite, no una garantía de exhaustividad.
3. Ampliar fixtures de versiones RPM/PEP 440/SemVer/Windows frente a las herramientas de referencia de cada ecosistema.
4. Mejorar cobertura de Windows Update, plugins/extensiones CMS y dependencias transitivas sin inferir versiones ausentes.
5. Continuar la revisión de accesibilidad y responsive con pruebas manuales y tecnologías de asistencia; CI no sustituye esa auditoría.
6. Verificar el comportamiento de los conectores contra fuentes oficiales cambiantes; la respuesta HTTP satisfactoria no garantiza cobertura semántica completa.
7. No convertir el producto en herramienta de producción certificada ni en sustituto de advisories de fabricantes sin un programa de validación más amplio.

## 8. Registro de cambios recientes

- `2adafb6`: web pública bilingüe con diseño responsive, descripción de producto y límites, navegación hacia la aplicación, metadatos SEO/Open Graph y datos estructurados.
- `9cf66e3`: retirada de CVE de demostración predefinidas que podían confundirse con hallazgos reales; estados vacíos distintos para inventario sin analizar y análisis sin candidatos.
- `1f519b2`: corrección de la estructura JSX del estado vacío de vulnerabilidades.
- `d2100b0`: importación del icono `Copy` usado en la guía de versiones y prueba de regresión para evitar un error en tiempo de ejecución.
- Los cambios son locales al frontend; no añaden dependencias, backend, servicios ni recursos Azure.
- CI Node 20/22 y despliegue Azure del commit `d2100b0` verificados como satisfactorios el 3 de noviembre de 2026.


### 2026-11-06 — carga diferida de la plataforma

- La portada pública carga inicialmente solo la interfaz de presentación. El módulo principal de la plataforma y `styles.css` se descargan al navegar a `#app`.
- Al abandonar la plataforma durante un análisis, el desmontaje cancela la petición activa e invalida su controlador para evitar trabajo de red en segundo plano.
- La navegación móvil de la portada devuelve el foco al botón del menú al seleccionar una sección, evitando que el foco quede en un enlace oculto. Prueba de regresión incluida.

- El selector de idioma, los metadatos SEO y el fallback de error siguen disponibles en la ruta pública; la carga de la aplicación tiene un estado accesible.
- Se añade una prueba de regresión para impedir que la portada vuelva a importar estáticamente la plataforma o sus estilos.
- Build validado: JavaScript inicial 253,30 kB (80,47 kB gzip), plataforma 198,02 kB (51,75 kB gzip), motor de correlación 71,68 kB (21,49 kB gzip). Reducción aproximada del 43,5 % frente al bundle inicial previo de 448,56 kB.
- Commit `9b60acb86b2f37928d52925c6524d8bf1a5f68c2`: 607/607 tests y build correctos; despliegue Azure Static Web Apps [42235075589](https://github.com/carlosdans/quasaric/actions/runs/42235075589), satisfactorio.
- Sin nuevas dependencias, backend, servicios de pago ni recursos Azure.


## 9. Instrucciones para continuar

- Leer el código de `main` y verificar HEAD, workflows y despliegue antes de modificar.
- Trabajar en bloques coherentes, con pruebas de regresión y documentación sincronizada.
- Integrar directamente en `main` con actualizaciones de referencia no forzadas.
- Corregir cualquier fallo de CI antes de dar por terminado el bloque.
- No inventar resultados de tests, despliegues, facturación ni planes Azure.
- Mantener la restricción de coste cero y la arquitectura estática/local-first.


### 2026-11-02 — validación de PURL en restauración y almacenamiento

- La restauración de copias JSON y el almacenamiento local validan tanto el PURL del componente como el PURL del paquete fuente con el mismo parser alineado con ECMA-427 usado en SBOM y CSV.
- Los PURL opcionales vacíos siguen siendo válidos para inventarios heredados; los PURL malformados no entran en el inventario activo.
- Si el almacenamiento ya contiene filas con PURL inválidos, se preserva el JSON original en la clave de recuperación y se excluyen esas filas de la vista activa con advertencia; no se sobrescribe silenciosamente el original.
- No se cambia el formato/versionado de las copias ni se añade servicio externo.


- En SPDX, una relación `GENERATED_FROM` solo se conserva si ambos identificadores de paquete son únicos en el documento. Un SPDXID duplicado invalida esa arista para evitar asociar el binario al paquete fuente equivocado.


### 2026-11-02 — validación de inventario, SBOM y accesibilidad

- El alta manual, CSV, SBOM, restauración JSON y almacenamiento local usan el parser común para validar PURL binario y PURL fuente. Los PURL opcionales vacíos siguen permitidos; los malformados se rechazan.
- La carga de inventario antiguo preserva el JSON original en la clave de recuperación si encuentra filas con PURL inválidos y no incorpora esas filas al inventario activo.
- En SPDX, `GENERATED_FROM` solo crea una relación cuando los SPDXID del binario y la fuente son únicos. Relaciones múltiples o identificadores duplicados permanecen sin resolver; no se asocia provenance por orden de aparición.
- Los errores de PURL y almacenamiento en el alta manual se anuncian dentro del propio diálogo. El panel de importación conserva sus errores separados.
- La navegación móvil y los diálogos de alta y detalle de vulnerabilidad gestionan Escape, trampa de foco, restauración de foco y bloqueo del scroll; el contenido principal queda inerte mientras la navegación móvil está abierta.
- La interfaz identifica el espacio como local (sin cuenta ni workspace en la nube).
- Validación de `main` en commit `1c0eba249d32b785ff44f483bab93dc5bdfc1105`: 348/348 tests correctos en Node 20 y Node 22, sin fallos; builds correctos en ambas versiones. CI run [41488978767](https://github.com/carlosdans/quasaric/actions/runs/41488978767) y despliegue Azure Static Web Apps [41488978569](https://github.com/carlosdans/quasaric/actions/runs/41488978569), ambos satisfactorios.
- La importación CycloneDX recorre componentes anidados de forma iterativa y aplica el límite global de 50.000 elementos al árbol completo.
- El parser PURL alinea normalización y codificación con ECMA-427 sin inferir identidades CPE.
- Cada petición de fuente pública está limitada a 30 segundos, incluida la lectura del cuerpo; la cancelación del usuario sigue siendo explícita y distinta del timeout.
- El comparador SemVer usa BigInt para ordenar major/minor/patch sin pérdida de precisión en identificadores numéricos grandes.
- Se añaden fixtures de regresión basados en los rangos CPE publicados por NVD para Log4j CVE-2021-44228: límites inferiores inclusivos, superiores exclusivos y versiones con sufijo de proveedor no ordenables que deben quedar en revisión.
- La identidad CPE oficial de Apache Log4j se vincula solo a `log4j-core` / `Log4j Core`; el nombre ambiguo `Log4j`, `log4j-api` y otros proveedores no se consideran una coincidencia automática y quedan para revisión.
- La plataforma de interfaz se ha actualizado de React 18/Vite 6 a React 19/Vite 8, junto con `@vitejs/plugin-react` 6; las actualizaciones se integraron juntas para respetar sus dependencias peer. 351/351 tests y build correctos en Node 20 y 22.
- La navegación incluye un enlace bilingüe para saltar directamente al contenido principal, visible al recibir foco de teclado; se ha añadido prueba de regresión. Validación posterior: 352/352 tests y build correctos en Node 20 y 22.
- Se han localizado en español los valores de severidad, aplicabilidad, estado candidato y KEV en paneles, resultados e informes; las etiquetas accesibles de copias también cambian con el idioma.
- El atributo `lang` del documento se sincroniza con el idioma seleccionado para que lectores de pantalla y herramientas del navegador interpreten correctamente el contenido.
- Validación de esta versión: 358/358 tests y build correctos en Node 20 y 22; despliegue Azure del commit `d2ec0dd` satisfactorio.
- La vista de análisis traduce los nombres y estados de las fuentes consultadas para que la cobertura y los fallos parciales sean comprensibles en español.
- La trazabilidad por componente también traduce nombres de fuentes y estados de evidencia del fabricante/CSAF; conserva intactos los identificadores y valores originales usados por el motor.
- La trazabilidad de componentes traduce también los estados de evidencia de fabricante (afectado, corregido, en investigación, no afectado y revisión), conservando los valores originales en inglés cuando no existe una traducción conocida.
- Se ha añadido un límite de error React con mensaje de recuperación bilingüe y recarga, para evitar una pantalla vacía ante fallos inesperados de renderizado. El texto de recuperación evita afirmaciones absolutas sobre persistencia o transmisión: indica que los datos se restauran si se guardaron localmente.
- Validación de la versión anterior: 361/361 tests y build correctos en Node 20 y 22; despliegue Azure del commit `104960b` satisfactorio.
- Validación actual: 362/362 tests y build correctos en Node 20 y 22; despliegue Azure del commit `30565b5` satisfactorio.
- Validación actualizada en commit de código `4026832`: 351/351 tests en Node 20 y 22; CI [41490335199](https://github.com/carlosdans/quasaric/actions/runs/41490335199) y Azure [41490335102](https://github.com/carlosdans/quasaric/actions/runs/41490335102), satisfactorios.
- Los cambios no añaden backend, servicios externos de pago, recursos Azure ni dependencias; mantienen la arquitectura estática/local-first y el requisito de Azure Static Web Apps Free.


### 2026-11-02 — regresión adicional de identidad CPE y rangos NVD reales

- Se añaden fixtures derivados de NVD para CVE-2026-47360 (Apache HTTP Server): se comprueban los límites inclusivo 2.4.60 y exclusivo 2.4.69, así como versiones inmediatamente fuera/dentro del rango.
- Se añade fixture de CVE-2023-44487 para el CPE de F5 NGINX. La identidad del fabricante F5 no se confunde con el NGINX upstream: queda en revisión, no como coincidencia positiva.
- Validación en main commit c120697db4ecddf06007a60ccd5314d4ab6f6600: 369/369 tests correctos en Node 20 y 22; builds correctas en ambos. CI [41504287266](https://github.com/carlosdans/quasaric/actions/runs/41504287266) y despliegue Azure [41504287342](https://github.com/carlosdans/quasaric/actions/runs/41504287342), satisfactorios.
- No se añaden dependencias, backend, servicios externos ni recursos Azure.


### 2026-11-02 — cualificadores CPE, fixtures NVD y despliegues eficientes

- Se incorporan fixtures NVD para CVE-2026-47360 (Apache HTTP Server), con límites inclusivo 2.4.60 y exclusivo 2.4.69, y CVE-2023-44487 (F5 NGINX), cuya identidad de fabricante no se confunde con NGINX upstream.
- La correlación CPE conserva la identidad fabricante/producto y evalúa además update, edition, language, sw_edition, target_sw, target_hw y other. Un cualificador conocido que no coincide rechaza la coincidencia; si falta el dato necesario, la aplicabilidad queda en needs_review, no se eleva a posible.
- Los CPE declarados manualmente se normalizan con las mismas reglas de escapes y guiones bajos que los CPE de NVD. Se valida además que la arquitectura declarada no contradiga target_hw.
- Validación del código en commit 5c906e49da89798ee4030c702e3cb98d222b7f89: 372/372 tests correctos y builds correctas en Node 20 y 22. CI [41505631835](https://github.com/carlosdans/quasaric/actions/runs/41505631835) y Azure [41505631814](https://github.com/carlosdans/quasaric/actions/runs/41505631814), satisfactorios.
- El workflow Azure ignora commits que solo cambian tests, documentación o workflows, evitando publicaciones innecesarias y consumo de cuota. Cambio de pipeline integrado en el commit cc86bb2.
- No se añaden dependencias, backend, servicios externos ni recursos Azure.


### 2026-11-02 — regresión de ordenación PEP 440 y validación final

- Se amplía la matriz de regresión de comparadores Debian, RPM, PEP 440 y SemVer: prereleases, revisiones, epoch/release, metadatos build y propiedades de ordenación inversa.
- La prueba de secuencia pública PEP 440 detectó un caso límite en versiones post-release-dev: `1.0.post0.dev0` debe ordenarse después de `1.0`. La condición especial de versiones dev-only se limita ahora a versiones sin segmento post-release.
- Validación en `main`, commit `c9a20e6e70dfceed913d42cdd266b3b8c39a09d0`: 377/377 tests correctos en Node 20 y 22; build de producción correcta en ambas versiones. CI [41508498115](https://github.com/carlosdans/quasaric/actions/runs/41508498115) y despliegue Azure [41508498377](https://github.com/carlosdans/quasaric/actions/runs/41508498377), satisfactorios.
- El build emite advertencias `MODULE_LEVEL_DIRECTIVE` procedentes de `lucide-react` sobre la directiva `use client`; no impiden la compilación ni las pruebas. No se modifica la dependencia por esta advertencia aislada.
- No se añaden dependencias, backend, servicios externos ni recursos Azure.


## 10. Web pública de presentación — 2026-11-03

- La ruta raíz presenta una web pública bilingüe (español/inglés); el acceso a la aplicación se realiza mediante el fragmento #app, sin añadir backend ni router.
- La web describe el inventario local, la correlación conservadora, las señales CVSS/EPSS/KEV, las evidencias, la remediación candidata, el historial y los informes.
- Incluye explicación de privacidad, consultas a fuentes públicas, límites metodológicos y preguntas frecuentes. No presenta Quasaric como escáner ni promete detección exhaustiva.
- La aplicación existente se conserva y añade un enlace para volver a la web pública. Los datos locales y las funciones existentes no cambian.
- La página incluye estructura semántica, navegación por anclas, FAQ nativa accesible, diseño responsive y respeto por movimiento reducido.
- Se amplían metadatos SEO/sociales y datos estructurados SoftwareApplication. No se añade analítica, fuente tipográfica externa ni servicio de pago.
- Pendiente tras integrar: verificar CI Node 20/22, build, ejecución del workflow de Azure del commit y revisión manual en navegador móvil/escritorio.


### 2026-11-03 — eliminar hallazgos de demostración de la aplicación

- Se retiraron CVE codificadas como ejemplos del resumen y de la sección de vulnerabilidades. Aunque estaban etiquetadas como demostración, podían confundirse con hallazgos del inventario real.
- Antes del primer análisis, ambas vistas muestran estados vacíos explícitos y una acción directa para añadir el primer componente.
- Tras un análisis sin candidatos, la interfaz aclara que la ausencia de resultados no demuestra que los componentes estén libres de vulnerabilidades.
- La lista y los filtros de vulnerabilidades quedan vacíos hasta disponer de un análisis real; no se fabrican resultados.
- Se añadieron pruebas de regresión para impedir que vuelvan a aparecer CVE de ejemplo como resultados. Sin dependencias, servicios externos ni cambios de backend.


- La primera compilación del bloque de estados vacíos detectó un cierre JSX prematuro en la vista de vulnerabilidades. Los 461 tests pasaron; se corrigió la frontera del fragmento antes de aceptar el despliegue y se repite CI/build en Node 20 y 22.

### 2026-11-03 — coherencia de PURL y versiones en SBOM

- La revisión de un ejemplo SPDX 2.3 publicado por spdx/spdx-examples detectó componentes cuyo versionInfo no coincide con la versión embebida en su PURL. El motor OSV ya rechazaba esa combinación durante el análisis, pero la importación no avisaba y conservaba el identificador inconsistente.
- CycloneDX y SPDX ahora comparan la versión explícita del componente con la versión del PURL. Si discrepan, se conserva el componente y su versión declarada, se retira el PURL incoherente y se emite una advertencia por entrada; no se descarta silenciosamente la fila ni se lanza una consulta OSV con identidad contradictoria.
- Se aplica la misma regla a sourcePurl frente a sourceVersion. Los metadatos derivados de un PURL inconsistente (por ejemplo, arquitectura) no se reutilizan como si pertenecieran al componente.
- La importación muestra el número y el detalle de advertencias en español o inglés. Los errores de fila siguen diferenciados de las advertencias que permiten conservar el componente.
- Se añadieron pruebas para SPDX 2.3, CycloneDX 1.6, PURL de paquete fuente y conservación de PURL cuando las versiones coinciden o no hay versión explícita.
- CI en commit a7a505a0d4c9e897d8de8aca5c5078f8455b3d90: 469 tests correctos y builds correctas en Node 20 y 22; [CI 41600052182](https://github.com/carlosdans/quasaric/actions/runs/41600052182).
- El código de aplicación quedó desplegado por Azure Static Web Apps en el commit a38a866fa305ac86c2bd2cf2508b9de00af8de05; [despliegue 41599895556](https://github.com/carlosdans/quasaric/actions/runs/41599895556), satisfactorio. El commit posterior solo ajustó la expectativa de una prueba.
- No se añaden dependencias, backend, servicios externos ni recursos Azure.


### 2026-11-03 · Footer y relaciones SPDX repetidas
- Se retiraron los enlaces de correo y GitHub de los pies de página de la web pública y de la aplicación; la sección de contacto de Acerca de permanece disponible.
- Las relaciones SPDX `GENERATED_FROM` idénticas repetidas se normalizan como una sola arista. Sólo distintas fuentes relacionadas mantienen la ambigüedad y dejan la procedencia sin resolver.


### 2026-11-03 — rangos Ubuntu OSV y versiones fuente enumeradas
- El clasificador trata el campo versions de Canonical como el conjunto exacto de versiones fuente afectadas: un evento introduced: 0 junto con fixed no convierte versiones intermedias no enumeradas en afectadas. Esas versiones quedan en revisión; las versiones enumeradas siguen siendo afectadas y las versiones en/tras fixed pueden quedar como candidatas a parche.
- Los rangos abiertos sin lista explícita siguen interpretándose como afectados desde introduced; las versiones no comparables o sin evidencia suficiente permanecen en revisión.
- Se reconocen entradas de familia publicadas por Canonical con comodín final `.*` (por ejemplo, `4.*` y `6.*`) como prefijos de versión. Otras formas de comodín no se interpretan y quedan en revisión.
- Se añadieron regresiones para listas exactas y familias `.*`, lista explícita combinada con límite fixed, y rangos abiertos simples y posteriores a un intervalo cerrado. Sin dependencias, backend, servicios externos ni cambios de recursos Azure.


### 2026-11-03 — semántica SRPM de Red Hat Security Data
- Se ajustó la correlación Red Hat: la documentación oficial define `package_state.package_name` y `affected_release.package` como nombres/versiones de SRPM, no como identidad del binario instalado. Estos campos solo se adjuntan como evidencia indirecta cuando el inventario declara `sourcePackage`; nunca elevan por sí solos la aplicabilidad binaria ni se transfieren versiones corregidas al binario.
- Se añadieron regresiones para impedir falsos positivos cuando el nombre del binario coincide casualmente con el SRPM y para conservar el estado del proveedor como evidencia de revisión.
- Se normaliza también el formato público de `affected_release.package` cuando llega como SRPM NEVRA en una cadena (por ejemplo, `openssl-1:3.0.7-28.el9`), conservando nombre y versión como evidencia fuente; no se trata como nombre binario.
- Referencia: documentación Red Hat Security Data API 1.0, secciones CVE y campos AffectedRelease/PackageState.


### 2026-11-03 — validación direccional de relaciones SUSE CSAF
- La correlación indirecta de paquete fuente a binario SUSE ahora exige una relación CSAF estructuralmente completa (incluye `full_product_name.product_id`), de categoría `default_component_of` y con dirección exacta fuente → producto binario. No se interpretan relaciones invertidas ni `installed_with`/`installed_on` como mapeo de compilación fuente-binario.
- Se añadieron regresiones para la dirección válida, dirección inversa y categorías no equivalentes. La evidencia fuente sigue siendo `needs_review`; no se transfiere estado de afectación ni remediación al binario.
- Referencia normativa: OASIS CSAF 2.0, sección 3.2.2.4 (relaciones direccionales y categorías), https://docs.oasis-open.org/csaf/csaf/v2.0/os/csaf-v2.0-os.pdf.


### 2026-11-03 — normalización PEP 440 de versiones Python
- El comparador PyPI reconoce el prefijo opcional `v` y la forma heredada de post-release `-N` (por ejemplo, `1.0-1` equivale a `1.0.post1`). Antes, esos identificadores válidos quedaban sin comparar y podían degradar una evaluación de rango a `needs_review`.
- Se añadieron pruebas de equivalencia, orden post/dev y clasificación de límites. El comparador sigue devolviendo revisión para cadenas no interpretables.


### 2026-11-03 — regresiones de ordenación RPM
- Se amplió la batería de comparación RPM con casos del conjunto de pruebas upstream de rpm-software-management: separadores equivalentes, tilde de prerelease y caret para snapshots posteriores a release. No se modificó la lógica de comparación.
- Referencias: https://github.com/rpm-software-management/rpm/blob/master/tests/rpmvercmp.at y https://rpm-software-management.github.io/rpm/man/rpm-version.7.


### 2026-11-03 — propiedades CycloneDX contradictorias
- La importación CycloneDX ya no aplica una política implícita de «último valor gana» a propiedades personalizadas `quasaric:`. Los valores repetidos idénticos se deduplican; si un mismo nombre de propiedad contiene valores distintos, se omite ese metadato y se emite una advertencia por propiedad conflictiva.
- Una propiedad `sourcePackage` contradictoria no se resuelve mediante inferencia automática alternativa desde pedigree; la procedencia queda sin resolver para revisión. Se evita así asociar un binario al paquete fuente equivocado por el orden de las propiedades del documento.
- Se añadieron regresiones para conflictos en sourcePackage/sourceVersion/sourcePurl, pedigree concurrente y duplicados idénticos. Sin dependencias, backend, servicios externos ni cambios de recursos Azure.


### 2026-11-03 — identidad ambigua del componente raíz CycloneDX
- La deduplicación de `metadata.component` sólo fusiona el sujeto con un componente cuando su `bom-ref` (o, en su ausencia, su PURL) identifica exactamente una entrada. Si el identificador aparece varias veces, se conserva el sujeto por separado en lugar de elegir arbitrariamente la primera coincidencia.
- Se añadieron regresiones para referencias `bom-ref` y PURL duplicadas. Esto evita que el orden del documento determine qué componente recibe los metadatos del sujeto.


### 2026-11-03 — versiones PURL opacas
- El parser PURL ya no rechaza versiones cuyo valor literal sea `.` o `..`. ECMA-427 define la versión como una cadena opaca; la protección contra segmentos de ruta punto se mantiene para namespace, nombre y subpath, no se aplica indebidamente a la versión.
- Se añadió una regresión para versiones literales y percent-encoded. Referencia: https://tc54.org/ecma427/multipage/purl-specification.


### 2026-11-03 — navegación móvil de la web pública

- La navegación principal de la landing ahora dispone de un menú móvil explícito, con estado accesible mediante `aria-expanded` y `aria-controls`; los enlaces cierran el menú al seleccionar una sección.
- La navegación se puede cerrar con Escape, el foco vuelve al botón de apertura y el control cambia entre iconos de apertura y cierre.
- Se incorpora un enlace para saltar directamente al contenido principal, visible al recibir foco de teclado, y el destino acepta foco programático sin añadir un contorno visual permanente.
- Los estilos mantienen la navegación de escritorio y respetan `prefers-reduced-motion`; no se añaden dependencias, servicios ni recursos de pago.
- Cambios aplicados directamente en `main`: `src/LandingPage.jsx` y `src/landing.css`.
- Pendiente de validación automatizada y revisión visual en navegador móvil/escritorio; el conector de GitHub no expone en esta sesión una ejecución manual de CI para commits de push.


### 2026-11-03 — metadatos multilingües y caché de producción

- El idioma seleccionado ahora actualiza también el título del documento, la descripción SEO, Open Graph, Twitter Cards y la locale Open Graph, además de `html[lang]`.
- La configuración de Azure Static Web Apps aplica caché inmutable de un año a los assets versionados de Vite, revalidación del shell HTML y caché corta para favicon, sitemap y robots.
- Se mantienen intactos los encabezados de seguridad existentes, la política CSP, el fallback SPA y la arquitectura estática.
- Cambios aplicados directamente en `src/App.jsx` y `staticwebapp.config.json`.
- Validación pendiente: build de Vite, comprobación de rutas/headers en Azure Static Web Apps y revisión SEO con herramientas de navegador. No se ha confirmado un despliegue en producción desde esta sesión.


### 2026-11-03 — endurecimiento de exportaciones CSV

- La neutralización de fórmulas de hoja de cálculo ahora detecta prefijos de fórmula precedidos por caracteres de control ASCII, controles C1 y BOM, además de los espacios en blanco habituales.
- Se amplían las regresiones para cubrir esos prefijos invisibles y conservar el formato CSV normal.
- No se añaden dependencias ni servicios. La suite completa del proyecto y el build siguen pendientes de ejecución en el entorno del repositorio.


### 2026-11-03 — validación de metadatos de copias de inventario

- Las copias locales ahora validan el tipo y la longitud de las marcas temporales del propio backup y de cada componente, tanto al crear como al restaurar.
- Se evita aceptar metadatos malformados que después se descartaban silenciosamente durante la restauración.
- Se añadieron regresiones para timestamps numéricos, objetos y cadenas excesivamente largas. No se cambia el formato versionado ni se añaden dependencias.
- La ejecución completa de node --test y vite build sigue pendiente en el entorno del repositorio.


### 2026-11-03 — validación estricta de señal CISA KEV

- La puntuación de riesgo y la creación de snapshots solo reconocen `kev: true` como pertenencia al catálogo CISA KEV. Valores truthy malformados (por ejemplo, la cadena `"false"`, `1` u objetos) ya no pueden sumar 40 puntos ni convertirse en una señal positiva al guardar el historial.
- Se añaden regresiones tanto para el cálculo de prioridad como para la serialización del historial. Los valores booleanos válidos mantienen el comportamiento anterior.
- Sin cambios de dependencias, backend o infraestructura. Pendiente de ejecutar la suite completa y el build en el entorno del repositorio.


### 2026-11-03 — validación de tipo KEV en el historial

- La carga, comparación y persistencia del historial ahora exigen que cualquier señal KEV presente sea booleana (true o false). Valores malformados como cadenas, números u objetos invalidan el snapshot en lugar de propagarse como evidencia ambigua.
- Los snapshots antiguos que omiten KEV y los que guardan null siguen siendo compatibles. Si el historial contiene snapshots inválidos, se conserva el JSON original en la clave local de recuperación mientras se exponen únicamente los snapshots válidos.
- Se añaden regresiones para carga, recuperación, guardado y compatibilidad heredada. Sin cambios de dependencias, backend ni infraestructura.
- La ejecución completa de tests y build queda pendiente de validación en CI.


### 2026-11-03 — validación de rangos EPSS y CVSS en la prioridad

- El cálculo de prioridad ya no recorta puntuaciones EPSS/CVSS fuera de rango para convertirlas en evidencia válida. EPSS acepta probabilidades 0–1 o porcentajes 0–100; CVSS acepta exclusivamente 0–10. Valores negativos, no finitos o superiores al máximo se marcan como no disponibles y aportan cero puntos.
- Se conserva la compatibilidad con cadenas numéricas finitas de los adaptadores y con EPSS expresado como porcentaje. Se añaden regresiones para límites y valores fuera de rango.
- Sin cambios de dependencias, backend o infraestructura. Suite completa y build pendientes de ejecución en CI.


### 2026-11-03 — selección de métricas CVSS de NVD

- La extracción de CVSS prefiere la generación más reciente disponible (4.0, 3.1, 3.0 y 2.0); dentro de cada generación selecciona una evaluación marcada como `Primary` antes que una `Secondary`.
- Se descartan puntuaciones no numéricas, no finitas o fuera de 0–10. Si la métrica más reciente no contiene una puntuación válida, se intenta la siguiente generación; si ninguna es válida, CVSS queda sin dato.
- Se añaden pruebas para prioridad entre versiones, preferencia Primary, fallback y métricas inválidas. No se añaden dependencias, backend ni servicios externos. La ejecución de la suite y el build queda pendiente de CI.


### 2026-11-03 — integridad de paginación de NVD

- Las consultas NVD por CPE y palabra clave comparten ahora un validador de páginas. Se comprueban el tamaño de página, los índices y metadatos de paginación cuando están presentes, y la estructura e identidad CVE de cada entrada.
- Las entradas incompletas, identificadores inválidos o repetidos, páginas sobredimensionadas y cambios del total entre páginas abortan la consulta en vez de descartarse silenciosamente o producir un conjunto parcial aparentemente válido.
- Las búsquedas por palabra clave rechazan términos vacíos o superiores a 200 caracteres antes de realizar peticiones. Se añaden pruebas de regresión para entradas inválidas, tamaño de página y respuesta válida.
- No se añaden dependencias, backend ni servicios externos. Suite completa y build pendientes de ejecución en CI.


### 2026-11-03 — normalización de identificadores CVE en la correlación OSV

- La correlación OSV reconoce el CVE cuando el propio campo `id` del aviso ya es un CVE, además de los campos `aliases` y `upstream`.
- Los identificadores se recortan y normalizan a mayúsculas antes de validarlos y asociarlos a un hallazgo, evitando que variantes de capitalización creen asociaciones separadas.
- Se deduplican las rutas de identificación para que un mismo CVE presente en `id`, `aliases` y `upstream` no duplique la evidencia.
- Los avisos OSV sin ningún CVE válido siguen apareciendo como avisos independientes de revisión; no se inventa una relación CVE.
- Se añade una prueba de regresión para CVE directo en minúsculas y rutas de alias repetidas.


- Ajuste de validación posterior: la expresión regular de CVE usa los escapes de dígito correctos en JavaScript; la prueba de CVE directo cubre este camino de extremo a extremo.


### 2026-11-03 — validación de ambigüedad en estados SUSE CSAF VEX

- El matcher SUSE ya no selecciona silenciosamente la primera entrada CSAF cuando un mismo documento contiene varias entradas para el CVE solicitado; devuelve `needs_review` y el número de entradas coincidentes.
- Comprueba que `product_status` sea un objeto y que las listas de estados conocidas contengan identificadores de producto no vacíos.
- Las estructuras VEX malformadas se convierten en evidencia pendiente de revisión en lugar de provocar una excepción o una conclusión de aplicabilidad.
- Se añaden pruebas para CVE duplicados con estados diferentes y para colecciones de estados malformadas.


### 2026-11-03 — validación defensiva de evidencias de Red Hat

- El matcher de Red Hat comprueba que `package_state` y `affected_release` sean colecciones cuando están presentes; las respuestas con estructuras incorrectas quedan en `needs_review`.
- Las entradas individuales malformadas se descartan sin romper el análisis del inventario.
- Los paquetes fuente siguen siendo evidencia indirecta: no se trasladan estados ni versiones corregidas a un binario instalado.
- Se añaden pruebas para colecciones inválidas y elementos individuales malformados.

- Corrección de implementación: se verificaron los escapes de las expresiones regulares del normalizador de producto y del parser de SRPM; ambos usan ahora los tokens de espacio y dígito de JavaScript correctamente.


### 2026-11-03 — consistencia estricta de KEV en postura histórica

- El resumen de postura de seguridad ahora cuenta una CVE como presente en CISA KEV únicamente cuando `finding.kev === true`; valores truthy como cadenas u objetos no se convierten en evidencia positiva.
- Se cubre el uso directo de `buildSecurityPosture` con snapshots malformados, además de la validación ya aplicada al historial persistido.


### 2026-11-03 — preferencias de idioma persistentes

- La aplicación restaura el idioma español/inglés elegido anteriormente desde el almacenamiento local del navegador y guarda los cambios.
- Si el almacenamiento no está disponible, mantiene el español como idioma predeterminado sin interrumpir la carga.
- Se añade una prueba de regresión para la restauración y persistencia de la preferencia.


### 2026-11-03 — consistencia de KEV en la interfaz

- Los contadores, etiquetas de hallazgos, detalles y exportaciones CSV de la aplicación exigen `kev === true`; los valores truthy malformados ya no se presentan como pertenencia confirmada al catálogo.
- Añadida una prueba de regresión sobre los puntos de presentación y exportación.


### 2026-11-03 — validación de señales de riesgo en el historial

- Los snapshots nuevos y los ya persistidos validan CVSS en el rango 0–10 y EPSS en el rango 0–100 (admite tanto probabilidad 0–1 como porcentaje).
- Se aceptan valores numéricos y cadenas numéricas heredadas; se rechazan booleanos, objetos, cadenas vacías/no numéricas, valores no finitos y puntuaciones fuera de rango.
- Si el historial local contiene puntuaciones inválidas, se excluyen esos snapshots de la vista activa y se conserva el JSON original en la clave de recuperación.
- Se añaden pruebas para la creación, carga, recuperación y guardado de snapshots con puntuaciones inválidas.


### 2026-11-03 — correcciones tras la primera ejecución completa de CI

- Se corrigió un salto de línea escapado accidentalmente en el resumen de postura, que ocultaba la propiedad KEV y provocaba cuatro fallos de regresión.
- La paginación NVD ahora rechaza páginas que contienen más registros que el total declarado restante, incluso cuando la página no supera el tamaño máximo solicitado.
- La prueba de NVD existente se renombra para expresar con precisión la incoherencia detectada.


### 2026-11-03 — límite de inventario explícito en importaciones

- Las importaciones CSV y SBOM comprueban el total combinado antes de generar identificadores o intentar guardar los componentes.
- Si la importación superaría el máximo de 50.000 componentes, se muestra un error específico y se conserva intacto el inventario actual, en lugar de presentar el rechazo como un fallo genérico de almacenamiento.
- Se reutiliza el límite exportado por `inventoryStorage` para mantener una única fuente de verdad.


### 2026-11-03 — límite de inventario al añadir componentes manualmente

- El formulario de alta comprueba el límite compartido de 50.000 componentes antes de crear el registro y ofrece una explicación localizada con las acciones posibles.
- El alta utiliza la referencia actual del inventario para evitar depender de un estado potencialmente obsoleto durante interacciones rápidas.
- El inventario permanece sin cambios cuando se alcanza el límite.


### 2026-11-03 — protección frente a ejecuciones simultáneas de análisis

- El inicio de un análisis comprueba también la referencia síncrona del controlador AbortController, además del estado React, para bloquear dobles activaciones antes del siguiente render.
- El bloque `finally` solo libera el estado de ejecución si sigue perteneciendo al controlador activo; una ejecución obsoleta no puede marcar como finalizado un análisis posterior.
- Sin dependencias, backend ni cambios de infraestructura. Validación completa pendiente de CI.


### 2026-11-03 — aislamiento de progreso y errores de análisis obsoletos

- Los eventos tardíos de progreso solo actualizan la interfaz si pertenecen al controlador de análisis que sigue activo.
- Los errores de peticiones abortadas o de ejecuciones sustituidas no se muestran sobre el inventario actualizado ni sobre un análisis posterior.
- Complementa la protección frente a ejecuciones simultáneas y evita estados visuales obsoletos tras editar el inventario. Validación CI pendiente.


### 2026-11-03 — copias portables del historial de análisis

- Informes permite exportar los últimos diez análisis como JSON versionado (quasaric-analysis-history, versión 1), incluyendo inventario de cada snapshot, hallazgos y evidencias almacenadas.
- La restauración valida el fichero completo (formato, estructura, límites y snapshots) antes de modificar el almacenamiento; no realiza importaciones parciales.
- La importación integra el backup con el historial local, deduplica por identificador y conserva los diez análisis más recientes. No sustituye el inventario actual ni presenta un snapshot importado como análisis en vivo.
- Límites: 10 MiB por copia y diez snapshots, coherentes con el almacenamiento local existente. Funciona sin backend ni servicios externos.


### 2026-11-03 — concurrencia del historial local

- La interfaz mantiene una referencia síncrona al historial más reciente para evitar que operaciones asíncronas escriban sobre una versión capturada en un render anterior.
- La importación integra la copia con el historial vigente al terminar la lectura del fichero; si un análisis acaba durante la importación, ambos snapshots se conservan, independientemente del orden de finalización.
- El alta de un análisis usa un upsert validado: reemplaza el mismo ID, conserva los demás y respeta el máximo de diez snapshots.
- La exportación lee el historial más reciente y la importación solo actualiza la interfaz tras persistir correctamente.
- Se añaden pruebas para concurrencia por upsert, deduplicación, límite y rechazo de datos inválidos. Sin dependencias, backend ni servicios nuevos.


### 2026-11-03 — paquete portable de auditoría

- Se añade una exportación JSON versionada `quasaric-security-audit` (versión 1) para compartir un análisis completo sin depender de la vista HTML o de un CSV.
- El paquete conserva inventario, hallazgos originales y priorizados, evidencia por componente, referencias, señales, cobertura por fuente, errores, límites de consulta, postura histórica y comparación disponible.
- Incluye metodología y advertencias explícitas: ausencia de candidatos no demuestra ausencia de vulnerabilidades, los estados son candidatos y el score es triage, no probabilidad de explotación.
- Se limita a 20 MB y falla de forma explícita ante datos circulares/no serializables o entradas inválidas; no crea exportaciones parciales.
- La exportación es local, no envía los datos a un servicio. No añade backend ni dependencias.


### 2026-11-03 — cobertura de fuentes en el informe imprimible

- El informe HTML/impresión/PDF ahora incluye una matriz con el estado de consulta de cada fuente, además de los errores y límites alcanzados durante el análisis.
- Añade el descargo metodológico original para conservar el contexto cuando se comparte el PDF fuera de Quasaric.
- Se prueba que la plantilla imprimible incluye los tres elementos de trazabilidad y mantiene las etiquetas localizadas.


### 2026-11-03 — resumen cuantitativo del paquete de auditoría

- El paquete JSON añade un resumen calculado de hallazgos candidatos, evaluaciones por componente, KEV estricto, severidades, aplicabilidad, bandas de prioridad, estados de fuentes, errores y límites.
- Los recuentos se derivan de los mismos datos exportados; los valores ausentes quedan como `unknown` en lugar de imputarse.
- Se mantiene KEV como señal booleana estricta (`true` únicamente) y las bandas como clasificación de triage, no como confirmación.


### 2026-11-03 — integridad y validación de paquetes de auditoría

- Los nuevos paquetes de auditoría usan la versión 2 e incorporan un digest SHA-256 del contenido serializado; la validación comprueba el digest, el formato, la estructura y la coherencia entre inventario, hallazgos y contadores.
- Informes permite validar paquetes JSON recibidos localmente y muestra su resumen, fecha y huella. Es una operación de solo lectura: no restaura inventario, no integra historial ni altera el análisis activo.
- Los paquetes v1 se aceptan como formato heredado estructuralmente válido, pero se marcan expresamente como no verificables por carecer de huella. SHA-256 detecta alteraciones, no acredita autoría ni sustituye una firma digital.
- Sin dependencias, backend, transmisión de datos ni recursos Azure adicionales.

- La validación v2 recalcula el resumen cuantitativo a partir de hallazgos, evaluaciones por componente, prioridades y estados de fuente. Comprueba también la coherencia de marcas temporales y que las colecciones principales contengan registros estructurados; un digest recalculado no permite ocultar un resumen manipulado.

- Se publica `docs/quasaric-security-audit.schema.json` como contrato JSON Schema Draft 2020-12 para integraciones externas del formato v2; la CI comprueba que los campos obligatorios del contrato coincidan con los paquetes v2 generados, incluidos resumen, cobertura, marcas temporales y formato del digest, sin añadir dependencias de validación.


### 2026-11-03 — calidad y trazabilidad de evidencias en auditorías

- El resumen del paquete de auditoría v2 cuenta los registros de evidencia por componente, su distribución por fuente y cuántos contienen al menos una referencia HTTPS segura.
- La validación de enlaces reutiliza la política de enlaces externos de la aplicación: HTTPS absoluto, sin credenciales. Una URL insegura no se contabiliza como referencia segura, pero el registro original se conserva intacto para no alterar la evidencia recibida.
- El parser recalcula estos contadores desde las evidencias incluidas y rechaza un resumen inconsistente incluso si se vuelve a calcular el digest SHA-256.
- La métrica no afirma que un enlace esté disponible, que el contenido siga vigente ni que el proveedor haya autenticado el paquete. No se añaden dependencias ni servicios.


### 2026-11-03 — coherencia de versiones declaradas y PURL

- El panel de calidad detecta por separado discrepancias entre la versión binaria declarada y la versión del PURL, y entre la versión fuente declarada y la del PURL fuente.
- Solo compara cuando el PURL es válido y contiene una versión explícita; los PURL sin versión no generan advertencias artificiales.
- La comprobación es de solo lectura: no corrige ni elimina metadatos automáticamente. Añade pruebas para coincidencias, discrepancias, PURL sin versión y PURL malformados.


### 2026-11-03 — validación cruzada de arquitectura de componentes

- El control de calidad compara arquitectura declarada, calificador `arch` del PURL y `targetHw` del CPE cuando están disponibles.
- Normaliza alias habituales (amd64/x86_64, arm64/aarch64 y familias x86) y no interpreta comodines CPE como afirmaciones.
- Las discrepancias se muestran como advertencias de inventario; no se reescriben PURL/CPE ni se altera la correlación. No añade dependencias ni servicios.


### 2026-11-03 — coherencia de versiones declaradas y PURL

- El control de calidad compara la versión binaria declarada con la versión explícita del PURL del componente.
- Compara por separado la versión del paquete fuente con la versión de su PURL fuente.
- Solo compara PURL válidos con versión explícita y versiones declaradas no vacías; no infiere diferencias cuando faltan datos.
- Las advertencias son de solo lectura: no modifican el inventario ni alteran la correlación.
- Se añadieron pruebas para discrepancias binarias/fuente y para PURL ausentes, sin versión o malformados.
- Código validado en `636831dc5fe429e4328c71f3acb6c68ddcf5203a`: tests y build correctos en Node 20 y Node 22; CI [41678699374](https://github.com/carlosdans/quasaric/actions/runs/41678699374).
- Despliegue Azure Static Web Apps del mismo commit completado satisfactoriamente: [41678699645](https://github.com/carlosdans/quasaric/actions/runs/41678699645).


### 2026-11-03 — coherencia de versiones declaradas y CPE

- El control de calidad compara la versión declarada del componente con la versión explícita del CPE 2.3.
- Omite CPE inválidos, sin versión, con comodines `*`/ `?` o con versión no aplicable `-`.
- Las discrepancias se muestran en el panel de inventario en español e inglés, con una nota de que pueden deberse a revisiones de empaquetado.
- La advertencia no reescribe el CPE, no altera el inventario y no cambia la aplicabilidad ni el resultado de correlación.
- Pruebas añadidas para versiones coincidentes, discrepantes, comodines y metadatos ausentes/malformados.
- Código integrado en `939ee5b81a245ae10f33a8869d42eea0cff45a8b`; CI de Node 20 y 22 completada correctamente: [41683490410](https://github.com/carlosdans/quasaric/actions/runs/41683490410).


### 2026-11-03 — validación canónica de identificadores CVE

- Se centraliza la validación de IDs CVE para las rutas de correlación OSV y las consultas NVD, FIRST EPSS, CISA KEV, Red Hat, SUSE CSAF y Canonical OpenVEX.
- Aplica las reglas de longitud de secuencia: 1–4 dígitos para años anteriores a 2014 y al menos 4 para 2014 en adelante; rechaza años anteriores al inicio del programa y secuencias cero.
- Un alias CVE moderno malformado ya no se promueve a hallazgo CVE; el aviso OSV permanece separado como aviso PURL pendiente de revisión.
- Se añaden pruebas unitarias para IDs históricos/modernos y regresión de correlación OSV. La validación es sintáctica y no certifica que un CVE exista.
- Implementación: `e2fee2b88803f0f6db05f347c8cc43811155377d`; corrección del patrón de validación: `2f0b9f6cd8a1ca958d34f0915a53f3fab565b891`. CI de Node 20 y Node 22, suite completa y build de producción: correctos ([run 41687038828](https://github.com/carlosdans/quasaric/actions/runs/41687038828)). Despliegue Azure Static Web Apps del mismo commit iniciado ([run 41687039161](https://github.com/carlosdans/quasaric/actions/runs/41687039161)); pendiente de confirmación final.


### 2026-11-03 — comparación conservadora de versiones Alpine APK

- Se incorpora el ecosistema APK al comparador de versiones, detectándolo por PURL `pkg:apk` o por metadatos explícitos de Alpine.
- Se comparan épocas, tuplas numéricas, sufijos de versión APK conocidos y revisiones de paquete `-rN`; las versiones fuera de la gramática soportada devuelven `null` y permanecen en revisión.
- Se añaden regresiones para orden de prereleases, sufijos git, revisiones de paquete, épocas, detección de ecosistema y formatos no soportados.
- Validado en commit `76ba6349ea139bc009dda0ebc9a826fe5bbafff6`: CI Node 20/22 [41711832726](https://github.com/carlosdans/quasaric/actions/runs/41711832726) y despliegue Azure [41711832552](https://github.com/carlosdans/quasaric/actions/runs/41711832552), ambos satisfactorios.
- No se añaden dependencias, backend ni infraestructura.


### 2026-11-03 — consultas OSV para Alpine Linux

- Se amplía la consulta de avisos OSV de distribuciones para reconocer el ecosistema oficial `Alpine` a partir de metadatos explícitos de Alpine Linux.
- Cuando no hay metadatos de distribución, solo se infiere Alpine desde un PURL APK cuyo namespace inicial sea exactamente `alpine`; otros namespaces APK no activan esa consulta.
- Las consultas usan el nombre y versión instalados, y exigen coincidencia exacta de paquete y ecosistema en el aviso OSV. Las versiones corregidas se conservan como evidencia del proveedor, sin cambiar la aplicabilidad NVD ni declarar remediación.
- Se añaden pruebas para detección por metadatos/PURL, coincidencia exacta y rechazo de namespaces genéricos.
- Sin dependencias ni infraestructura adicional. Validación final en `a351cbb6f6115b4da873ac4f1f273d61cf70f14b`: 562/562 tests y build correctos en Node 20 y 22, CI [41722041561](https://github.com/carlosdans/quasaric/actions/runs/41722041561). Despliegue Azure del código de aplicación `dd8f4009367caae0cafd91ae6bc449b707ca2bde`: [41721482608](https://github.com/carlosdans/quasaric/actions/runs/41721482608), satisfactorio. `a351cbb` solo ajusta la regresión de aplicabilidad y no cambia el bundle desplegado.


### 2026-11-03 — vista previa de duplicados en importación

- La revisión previa de CSV y SBOM calcula y muestra los posibles duplicados frente al inventario actual antes de confirmar.
- La estimación usa el mismo detector de calidad de inventario que el flujo de confirmación; no elimina ni fusiona filas automáticamente. El usuario conserva el control y puede cancelar.
- El contador se recalcula si cambia el inventario mientras la vista previa sigue abierta.
- Validación automatizada añadida para el contrato de vista previa. Sin dependencias ni servicios nuevos.


### 2026-11-03 — progreso de análisis por fases

- La barra de progreso ya no presenta el final de las consultas NVD como si hubiera terminado todo el análisis.
- La interfaz distingue las consultas de producto NVD de la fase posterior de enriquecimiento OSV, VEX y avisos de distribución.
- Durante el enriquecimiento se muestra un indicador animado, con alternativa sin animación para usuarios con preferencia de movimiento reducido.
- El análisis y sus fuentes no cambian; es una corrección de comunicación del progreso para evitar una falsa señal de finalización.
- Sin dependencias ni servicios nuevos.

## Finding evidence detail (2026-11-03)

- The vulnerability detail dialog now surfaces optional source-provided context (title, reason/description, version boundaries and publication/update dates) instead of showing only a source name and status.
- Safe external advisory URLs remain individually validated; additional source references are deduplicated and validated before links are rendered.
- Metadata is rendered only when supplied by the source adapter. Missing fields stay absent rather than being inferred.
- The layout wraps on narrow screens and remains within the existing static, local-first frontend architecture.


### 2026-11-03 — revisión explicativa de paquetes de auditoría

- La validación local de un paquete JSON ahora muestra distribuciones de severidad, aplicabilidad y estado de las fuentes, además de los recuentos básicos.
- Si el análisis de origen registró errores o límites, el panel lo destaca y muestra hasta cinco detalles de cada tipo para que el lector pueda valorar la cobertura.
- Se vuelve a explicitar que los hallazgos son candidatos de correlación y que SHA-256 detecta cambios, pero no autentica al emisor.
- La validación sigue siendo de solo lectura; no importa datos al inventario ni al historial. Diseño adaptable a móvil y sin servicios ni dependencias nuevos.


### 2026-11-03 — visibilidad de cobertura durante el análisis

- El resumen y la vista de vulnerabilidades muestran ahora un panel cuando alguna fuente no quedó en estado `queried`, o el análisis registró errores o límites.
- El panel resume los recuentos y permite desplegar el estado de cada fuente y hasta cinco detalles de errores/límites por categoría.
- El aviso aclara que las consultas parciales o ausentes no permiten concluir que no existan vulnerabilidades. El paquete JSON sigue conservando el registro completo.
- Sin cambios en la correlación, sin dependencias ni servicios nuevos; interfaz localizada y adaptable a móvil.


### 2026-11-03 — comandos de actualización candidatos para Ubuntu

- En los detalles de hallazgos, una recomendación Ubuntu solo muestra un comando `apt-get` copiable cuando la correlación aporta un único build binario corregido para el paquete y versión instalados exactos.
- El nombre de paquete y la versión se entrecomillan para el shell; no se generan comandos para revisión manual, otros ecosistemas ni objetivos ausentes.
- El comando es orientativo, no se ejecuta desde Quasaric. La interfaz pide revisar el aviso oficial y simular el cambio en el entorno antes de ejecutarlo.
- Pruebas unitarias para elegibilidad y quoting. Sin dependencias, backend ni cambios de infraestructura.


### 2026-11-03 — comandos de remediación Ubuntu visibles en resultados

- La tabla de vulnerabilidades muestra el comando `apt-get` solo cuando `buildRemediationCommand` valida una recomendación Ubuntu exacta y no ambigua.
- El comando se puede copiar desde la propia fila; se conserva el aviso de que es una propuesta que debe revisarse antes de ejecutarla.
- Los casos sin una versión binaria corregida inequívoca siguen mostrando revisión manual y no reciben comandos.
- Cambio limitado al frontend; sin nuevas dependencias, backend ni recursos Azure.


### 2026-11-04 — portapapeles robusto para comandos

- Las acciones de copiar comandos de remediación y de la guía de versiones usan ahora un helper común.
- Prioriza la Clipboard API y recurre a `execCommand('copy')` cuando el navegador bloquea o no expone el portapapeles moderno.
- Devuelve un resultado explícito y falla de forma segura si el navegador no ofrece ningún mecanismo; no añade dependencias ni servicios.


### 2026-11-04 — búsqueda en inventarios grandes

- El inventario permite filtrar localmente por nombre, versión, tipo, fabricante/ecosistema, PURL, CPE, paquete fuente, arquitectura y referencias de procedencia.
- La paginación opera sobre los resultados filtrados y vuelve a la primera página al cambiar la búsqueda; limpiar el campo restaura el inventario completo.
- No se envían los términos de búsqueda a fuentes externas ni se modifica el inventario persistido.


### 2026-11-04 — filtro de aplicabilidad en vulnerabilidades

- La lista de hallazgos permite filtrar por el estado agregado de aplicabilidad: afectado, parche candidato, posible, requiere revisión, no afectado o desconocido.
- El filtro se combina con la búsqueda de texto y la severidad/KEV, sin modificar ni recalcular los hallazgos.
- Los valores ausentes se agrupan como desconocidos; la interfaz está localizada en español e inglés.
- La operación es local y de solo lectura; no añade dependencias, backend ni servicios externos.


### 2026-11-04 — contador de paginación del inventario

- El contador de resultados en español ahora utiliza el total filtrado, igual que el inglés.
- El rango mostrado y el total corresponden a la búsqueda activa, no al inventario completo.


### 2026-11-04 — exportación de copias de recuperación del inventario

- Cuando Quasaric detecta datos locales dañados o parcialmente recuperables, conserva una copia intacta en la clave de recuperación del navegador.
- La pantalla de inventario ofrece descargar esa copia en bruto como archivo de texto, sin sobrescribirla ni intentar reinterpretar los datos dañados.
- La lectura de recuperación falla de forma segura si el almacenamiento está bloqueado; incluye pruebas de lectura, ausencia y errores de acceso.
- La recuperación no envía datos a ningún servicio y no sustituye la copia JSON normal del inventario.


### 2026-11-04 — normalización del tipo de componente en almacenamiento local

- La persistencia rechaza nuevos inventarios con tipos fuera del catálogo soportado (`os`, `web`, `runtime`, `cms`, `database`, `library`, `other`).
- Los inventarios antiguos con tipos desconocidos conservan sus componentes: se normaliza ese campo a `other`, se activa el aviso y se mantiene una copia intacta del JSON original para recuperación.
- Prueba de regresión para rechazo al guardar, migración sin pérdida de filas y preservación de la copia original.


### 2026-11-04 — descarga de recuperación del historial de análisis

- Cuando el historial local está dañado o contiene snapshots inválidos, Quasaric conserva el JSON original en una clave de recuperación separada.
- La sección de historial ofrece descargar esa copia original en texto plano sin reinterpretarla, sobrescribirla ni modificar el historial.
- La lectura falla de forma segura si el almacenamiento está bloqueado; incluye pruebas de contenido intacto, ausencia de copia y errores de acceso.
- Los datos permanecen en el navegador y la descarga no utiliza servicios externos.


### 2026-11-04 — avisos visibles de persistencia del historial

- El estado de fallo de guardado del historial, que antes se calculaba pero no se mostraba, ahora aparece como alerta accesible cuando un análisis termina sin poder persistirse.
- Si existe una copia original de recuperación, la sección explica por qué está disponible y recomienda descargarla antes de reemplazar o limpiar los datos locales.
- Pruebas de regresión para ambos mensajes y sus roles accesibles.


### 2026-11-04 — persistencia del aviso de historial no guardado

- Un análisis nuevo ya no borra el aviso de un historial que previamente no pudo persistirse. El aviso solo se limpia cuando una importación o un análisis consigue guardar el historial correctamente.
- Prueba de regresión para evitar que el inicio de una ejecución oculte una pérdida de persistencia todavía no resuelta.


### 2026-11-04 — detección de historial inaccesible al iniciar

- La carga inicial distingue un historial realmente vacío de un almacenamiento bloqueado, JSON dañado o snapshots inválidos.
- Cuando no se puede leer el historial, la interfaz conserva el aviso de persistencia desde el arranque; los datos dañados siguen preservándose en la clave de recuperación cuando el navegador permite escribirla.
- La API de lectura mantiene `loadAnalysisHistory` compatible y añade un resultado explícito con historial y estado de advertencia.
- Pruebas para almacenamiento vacío, inaccesible y JSON dañado.

## 11. Estado de cierre y validación — 2026-11-06

- Rama `main`, HEAD actual: `748371a5c2527005db76552c2e06490560c1ffd9`.
- La corrección de inicialización del estado de análisis está integrada (`6a79a40`); los cambios revisados de importación CSV, remediación y SBOM están integrados (`e8feb2d`).
- Seguridad del repositorio: `.gitignore` reforzado para credenciales y certificados locales; GitHub Actions fijadas a SHA inmutable; Dependabot semanal para npm y Actions.
- Workflow de producción: eliminado `skip_api_build`, que la acción Azure Static Web Apps no admite. La ejecución `42231474206` del commit `748371a` terminó correctamente: 605/605 pruebas, build Vite y despliegue Azure completados. No se reprodujo la advertencia de input no reconocido.
- El build sigue mostrando una advertencia de tamaño de chunk (518,68 kB minificados; 150,33 kB gzip) y avisos `MODULE_LEVEL_DIRECTIVE` de `lucide-react`. No impiden tests, build ni despliegue; revisar división de código si se aborda una optimización de carga.
- El workflow actual ejecuta Node 22. La validación anterior de Node 20/22 citada en secciones históricas corresponde a commits previos y no debe interpretarse como matriz vigente del workflow unificado.
- El repositorio no tiene `package-lock.json`; CI utiliza `npm install`, por lo que la resolución transitiva no queda fijada por lockfile. Revisar la generación y adopción de un lockfile antes de cambiar a `npm ci`.
- La rama `main` aparece sin protección y no hay rulesets configurados. La lectura de la protección clásica requiere permisos de administración que no están disponibles en la conexión actual.
- No se han observado secretos evidentes en los archivos actuales revisados; no equivale a un escaneo exhaustivo del historial, forks, tags o alertas de GitHub Secret Scanning.
- Pendiente de cierre manual: recorrido visual real en navegador de escritorio y móvil, prueba de navegación/teclado y comprobación de cabeceras HTTP en el dominio publicado. La herramienta de revisión de esta sesión no pudo acceder directamente a los dominios de producción.
- No se ha verificado el plan ni la facturación del recurso Azure desde el portal. Mantener como requisito: Azure Static Web Apps Free y coste objetivo 0 €, sin backend ni servicios de pago.
- No ampliar funcionalidades por añadir. Priorizar correcciones reproducibles, cobertura metodológica y validación de la experiencia existente. Quasaric sigue siendo una herramienta de apoyo a la revisión, no una garantía de detección exhaustiva ni una herramienta certificada para decisiones de producción.
