# Quasaric — instrucciones permanentes para agentes

> Este archivo es la referencia operativa del proyecto. Léelo completo antes de proponer cambios o ejecutar tareas. Actualízalo cuando el usuario acuerde cambios duraderos de objetivo, arquitectura, restricciones o flujo de trabajo.

## 1. Objetivo del producto

Quasaric es una aplicación musical local-first y bilingüe (español/inglés). Lema: **“Play the song. Learn your part.”**

El objetivo es ofrecer una alternativa web y posteriormente Android que permita:
- Importar MP3/WAV.
- Separar audio en seis stems reales: drums, bass, other, vocals, guitar y piano.
- Reproducir las pistas de forma sincronizada, con volumen, mute y solo por stem.
- Mostrar acordes y notas MIDI sincronizados, con visualización de notas estilo Synthesia.
- Practicar con control de tempo y loops A-B.
- Mantener el procesamiento del audio en el dispositivo del usuario, sin subir canciones privadas ni depender de servicios de pago.

La referencia funcional principal es **MonoBand** (https://mono.band/). La meta es estudiar sus capacidades y reconstruir una implementación propia adaptada a Quasaric; no copiar código propietario ni asumir que su implementación interna o modelo son idénticos a los nuestros.

## 2. Objetivo prioritario: usar REA para ahorrar tiempo

**REA significa Reverse Engineer Anything:** https://github.com/morluto/rea

REA debe utilizarse como herramienta de investigación técnica para reducir el trabajo manual de entender MonoBand y evitar seguir desarrollando Quasaric a ciegas.

Flujo acordado:
1. Verificar qué versión de REA, CLI, MCP e instrucciones están realmente instaladas y disponibles en el entorno de Claude Code. No afirmar que están instaladas sin comprobarlo.
2. Obtener el APK de MonoBand desde una fuente legítima de Internet (preferir Google Play o una fuente verificable). No exigir que el Redmi Note 8 pueda ejecutar MonoBand: el análisis se realiza en el PC.
3. Verificar origen, firma/hash e integridad del APK. No eludir DRM, controles de acceso ni protecciones.
4. Analizar el APK con REA y las herramientas compatibles (por ejemplo JADX/JDK, según los requisitos de la versión instalada).
5. Documentar hallazgos basados en evidencia: arquitectura observable, pantallas/flows, separación de stems, reproducción multipista, sincronización, acordes, MIDI, práctica, grabación, almacenamiento y exportación. Distinguir hechos observados, inferencias e incógnitas.
6. Elaborar una matriz MonoBand vs. Quasaric: función, evidencia, estado actual de Quasaric, brecha y recomendación.
7. Solo después de revisar el informe, proponer el plan de implementación por fases en Quasaric.

REA ayuda a inspeccionar y comprender; no recupera mágicamente el código fuente original ni garantiza una clonación exacta. No inventar detalles que el APK no permita comprobar. Respetar licencias y propiedad intelectual.

## 3. Estado de REA

Estado al crear este documento: **instalación en Claude Code NO VERIFICADA**.

La primera tarea de cualquier sesión de análisis con REA es inspeccionar el entorno y comprobar:
- si el repositorio/herramienta REA está descargado o instalado;
- si el paquete/CLI está disponible y qué versión es;
- si el servidor MCP está registrado y responde;
- si las instrucciones de REA están cargadas en Claude Code;
- qué dependencias faltan.

No reinstalar ni modificar configuraciones a ciegas. Consultar primero la documentación oficial actual de https://github.com/morluto/rea y seguir los comandos de la versión vigente.

## 4. Reglas de trabajo obligatorias

- El usuario no es programador. Claude Code implementa y prueba; ChatGPT dirige producto/arquitectura y revisa técnicamente los informes.
- Responder al usuario en español, de forma clara, práctica y directa. Las instrucciones para Claude Code deben ser completas y copiables; distinguir claramente PowerShell de JavaScript.
- Trabajar exclusivamente en la rama **main**. No cambiar ni tocar **master**.
- No hacer commit ni push sin autorización expresa del usuario. La autorización para una tarea concreta de documentación no autoriza commits posteriores de código.
- No borrar archivos, no hacer reset general y no descartar trabajo existente sin autorización expresa.
- No cambiar CSP, permisos, políticas de seguridad ni configuración de despliegue sin autorización expresa.
- No subir canciones privadas, archivos de audio de prueba personales, modelos ONNX ni datos personales al repositorio.
- No tocar Azure, DNS, secretos, permisos, pipelines ni infraestructura salvo petición expresa.
- Antes de modificar código, inspeccionar el estado de Git y los cambios locales; no sobrescribir trabajo sin revisar.
- No asumir que el usuario tiene REA instalado, que MonoBand APK ya está disponible, ni que MonoBand funciona en su Redmi Note 8.
- No presentar hipótesis como hechos. Separar claramente lo verificado, lo probable y lo pendiente.
- Priorizar pruebas pequeñas y verificables antes de ejecutar procesos largos o costosos.
- No repetir preguntas cuya respuesta ya conste en este archivo o en el historial disponible.

## 5. Contexto técnico conocido

- Repositorio: https://github.com/carlosdans/quasaric
- Rama de trabajo: `main`
- Directorio Windows: `C:\\FCC-Projects\\Quasaric-Web`
- Stack: Vite + React 19 + JavaScript ES6+ + Web Audio API.
- Destino web: Azure Static Web Apps (no modificar infraestructura sin autorización).
- Versión Android: objetivo posterior; evaluar una solución apropiada después de validar el producto web y sus capacidades locales.

### Separación HT-Demucs / ONNX

- Se ha trabajado con un modelo ONNX HTDemucs 6-stem de aproximadamente 136 MB, excluido de Git.
- El modelo local de prueba reportado es `models/htdemucs_6s_fp16weights.onnx`; no asumir que está presente en cualquier entorno sin comprobarlo.
- La inferencia ONNX Runtime Web con WASM en el hilo principal puede bloquear el navegador durante `session.run()`.
- El usuario autorizó investigar y probar el **Proxy Worker oficial de ONNX Runtime**, siempre que mantenga el procesamiento local y no requiera cambios de seguridad.
- Esta autorización NO permite crear Workers personalizados ni cambiar CSP, permisos o políticas de seguridad.
- Antes de dar por válida una solución, comprobar versión/compatibilidad de ONNX Runtime, configuración del proxy antes de crear la sesión, evidencia de que la inferencia se ejecuta realmente fuera del hilo principal, respuesta de la interfaz, dimensiones de entrada/salida del modelo y calidad de audio.
- El modelo HT-Demucs espera una ventana fija reportada de 343980 muestras (~7,8 s a 44,1 kHz). No cambiar a segmentos arbitrarios de 2 s sin demostrar compatibilidad y calidad.
- No ejecutar canciones privadas largas como primera prueba. Usar primero un audio corto de prueba no privado.
- Si el Proxy Worker no funciona, informar del error; no hacer fallback silencioso al hilo principal.

### Entorno de desarrollo conocido

Claude Code se ha iniciado desde PowerShell con un endpoint local FCC/NVIDIA NIM mediante variables de entorno. No asumir que el endpoint o el modelo siguen disponibles; verificar antes de depender de ellos.

## 6. Cómo mantener esta referencia actualizada

- Al inicio de una tarea, leer este archivo y `PROJECT_STATUS.md`.
- Al finalizar una tarea relevante, presentar al usuario un resumen de resultados y proponer las actualizaciones necesarias.
- Actualizar este archivo cuando cambien el objetivo, las reglas permanentes, decisiones de arquitectura o el flujo de trabajo acordado.
- Actualizar `PROJECT_STATUS.md` con el estado técnico verificable, pruebas, bloqueos y próximos pasos.
- No afirmar que un documento está actualizado hasta haberlo modificado y comprobado.
- Los cambios en documentación del repositorio requieren la autorización del usuario. No inferir autorización para modificar código, hacer despliegues o cambiar infraestructura.
