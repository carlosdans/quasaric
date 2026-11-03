# Quasaric — contexto operativo actual

> Documento de continuidad. Esta sección describe el estado real del código de `main`; no sustituye las limitaciones que muestra la aplicación.
>
> **Actualizado:** 3 de noviembre de 2026  
> **Repositorio:** https://github.com/carlosdans/quasaric  
> **Rama:** `main`  
> **HEAD de código validado:** `d2100b00412620edef907e87043712be669b7194`

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

CI ejecuta tests y build con Node 20 y 22 en cada push a `main`. El workflow de Azure publica desde `main` y omite despliegues cuando el cambio solo afecta a documentación, pruebas o workflows; si el mismo commit incluye código de aplicación, el despliegue sigue ejecutándose. No declarar publicado un cambio hasta verificar el run de Azure del commit exacto.

**Última validación de código en `main`:** commit `d2100b00412620edef907e87043712be669b7194`; tests y build correctos en Node 20 y Node 22 con React 19 y Vite 8. CI run [41597463540](https://github.com/carlosdans/quasaric/actions/runs/41597463540) y despliegue Azure Static Web Apps [41597463458](https://github.com/carlosdans/quasaric/actions/runs/41597463458), ambos satisfactorios. El despliegue corresponde exactamente a ese commit.

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
