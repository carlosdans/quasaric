# Red Hat Security Data — adaptador de QuasarIC

QuasarIC consulta la API pública de Red Hat por identificadores CVE ya detectados por NVD. Documentación oficial: https://docs.redhat.com/en/documentation/red_hat_security_data_api/1.0/html-single/red_hat_security_data_api/index

La integración conserva dos tipos de evidencia separados:

- `package_state`: estado publicado por Red Hat para el paquete y producto (por ejemplo, Affected, Not affected, Will not fix).
- `affected_release`: errata que contiene la corrección publicada para un producto; puede incluir nombre y versión del paquete fuente.

La correlación exige coincidencia exacta del producto RHEL y el nombre del paquete o paquete fuente declarado en el inventario. No se interpreta una versión upstream como equivalente a un RPM de distribución. La existencia de un errata tampoco demuestra que el host haya instalado el backport: el estado de aplicabilidad original no se sobrescribe y la evidencia queda separada para revisión.

Límites actuales: 100 CVE por análisis, cuatro solicitudes simultáneas; solo productos Red Hat Enterprise Linux declarados explícitamente. No se consulta aún OVAL/CSAF ni se deduce cobertura de Rocky Linux, AlmaLinux o SUSE.
