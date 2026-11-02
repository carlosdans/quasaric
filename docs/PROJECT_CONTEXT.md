# Quasaric — contexto operativo actual

> Documento de continuidad. Esta sección describe el estado real del código de `main`; no sustituye las limitaciones que muestra la aplicación.
>
> **Actualizado:** 2 de noviembre de 2026  
> **Repositorio:** https://github.com/carlosdans/quasaric  
> **Rama:** `main`  
> **HEAD documentado:** `c4c333764086fd78f167cd41340a70af0fa0ecb6`

## 1. Objetivo y límites

Quasaric es una SPA estática para correlacionar un inventario tecnológico declarado por el usuario con fuentes públicas de vulnerabilidades. No es un escáner de red, un agente, una herramienta de explotación ni un sistema de monitorización.

La prioridad es la trazabilidad y la interpretación conservadora. Una coincidencia de producto, un aviso de distribución, una versión corregida publicada o una señal KEV/EPSS no equivalen por sí solos a una vulnerabilidad confirmada ni a una remediación confirmada. La ausencia de resultados tampoco demuestra que el sistema sea seguro.

## 2. Arquitectura y requisito de coste cero

- React 18 + Vite; interfaz en español e inglés.
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
- Importación SBOM: CycloneDX JSON 1.4–1.6 y SPDX JSON 2.3; máximo 10 MiB y 50.000 componentes. No consulta servicios externos durante la importación.
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
- Comparadores de versiones: Debian/Ubuntu, RPM EVR, Python PEP 440, npm/Composer SemVer y builds de Windows. Un formato desconocido o un rango no ordenable permanece en revisión.
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

CI ejecuta tests y build con Node 20 y 22 en cada push a `main`. El workflow de Azure publica desde `main`. No declarar publicado un cambio hasta verificar el run de Azure del commit exacto.

**Última validación antes de esta actualización documental:** commit `c4c333764086fd78f167cd41340a70af0fa0ecb6`; 328/328 tests correctos en Node 20 y 22, build correcto en ambas versiones; CI run [41468235111](https://github.com/carlosdans/quasaric/actions/runs/41468235111) y Azure run [41468235076](https://github.com/carlosdans/quasaric/actions/runs/41468235076) satisfactorios.

## 7. Limitaciones y trabajo pendiente

1. Ampliar fixtures de regresión con CVE/CPE reales de NVD y avisos oficiales de distribuciones; validar falsos positivos y negativos antes de elevar confianza.
2. Revisar cobertura de CPE y búsquedas por palabra clave; 6.000 resultados es un límite, no una garantía de exhaustividad.
3. Ampliar fixtures de versiones RPM/PEP 440/SemVer/Windows frente a las herramientas de referencia de cada ecosistema.
4. Mejorar cobertura de Windows Update, plugins/extensiones CMS y dependencias transitivas sin inferir versiones ausentes.
5. Continuar la revisión de accesibilidad y responsive con pruebas manuales y tecnologías de asistencia; CI no sustituye esa auditoría.
6. Verificar el comportamiento de los conectores contra fuentes oficiales cambiantes; la respuesta HTTP satisfactoria no garantiza cobertura semántica completa.
7. No convertir el producto en herramienta de producción certificada ni en sustituto de advisories de fabricantes sin un programa de validación más amplio.

## 8. Registro de cambios recientes

- `b2d8bdb`: corrección CSP para permitir el conector Red Hat; prueba de regresión de cabeceras.
- `4c55f7d`: detección de duplicados de inventario sensible a arquitectura, ecosistema, PURL/CPE y metadatos fuente.
- `c4c3337`: límite y concurrencia controlada para consultas Ubuntu OSV por paquete fuente.
- Los tres cambios son locales al frontend; no añaden dependencias, backend, servicios ni recursos Azure.

## 9. Instrucciones para continuar

- Leer el código de `main` y verificar HEAD, workflows y despliegue antes de modificar.
- Trabajar en bloques coherentes, con pruebas de regresión y documentación sincronizada.
- Integrar directamente en `main` con actualizaciones de referencia no forzadas.
- Corregir cualquier fallo de CI antes de dar por terminado el bloque.
- No inventar resultados de tests, despliegues, facturación ni planes Azure.
- Mantener la restricción de coste cero y la arquitectura estática/local-first.


### 2026-11-02 — validación de PURL en restauración y almacenamiento

- La restauración de copias JSON y el almacenamiento local validan tanto el PURL del componente como el PURL del paquete fuente con el mismo parser usado en SBOM y CSV.
- Los PURL opcionales vacíos siguen siendo válidos para inventarios heredados; los PURL malformados no entran en el inventario activo.
- Si el almacenamiento ya contiene filas con PURL inválidos, se preserva el JSON original en la clave de recuperación y se excluyen esas filas de la vista activa con advertencia; no se sobrescribe silenciosamente el original.
- No se cambia el formato/versionado de las copias ni se añade servicio externo.


- En SPDX, una relación `GENERATED_FROM` solo se conserva si ambos identificadores de paquete son únicos en el documento. Un SPDXID duplicado invalida esa arista para evitar asociar el binario al paquete fuente equivocado.


### 2026-11-02 — validación de inventario, SBOM y accesibilidad

- El alta manual, CSV, SBOM, restauración JSON y almacenamiento local usan el parser común para validar PURL binario y PURL fuente. Los PURL opcionales vacíos siguen permitidos; los malformados se rechazan.
- La carga de inventario antiguo preserva el JSON original en la clave de recuperación si encuentra filas con PURL inválidos y no incorpora esas filas al inventario activo.
- En SPDX, `GENERATED_FROM` solo crea una relación cuando los SPDXID del binario y la fuente son únicos. Relaciones múltiples o identificadores duplicados permanecen sin resolver; no se asocia provenance por orden de aparición.
- Los errores de PURL y almacenamiento en el alta manual se anuncian dentro del propio diálogo. El panel de importación conserva sus errores separados.
- La navegación móvil y el detalle de vulnerabilidad gestionan Escape, trampa de foco, restauración de foco y bloqueo del scroll; el contenido principal queda inerte mientras la navegación móvil está abierta.
- La interfaz identifica el espacio como local (sin cuenta ni workspace en la nube).
- Validación previa a esta actualización documental: 337 tests correctos en Node 20 y Node 22, sin fallos; builds correctos. CI run [41475952854](https://github.com/carlosdans/quasaric/actions/runs/41475952854). El despliegue Azure del mismo commit estaba en curso al redactar esta actualización.
- Los cambios no añaden backend, servicios externos de pago, recursos Azure ni dependencias; mantienen la arquitectura estática/local-first y el requisito de Azure Static Web Apps Free.
