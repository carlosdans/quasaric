import React, { useEffect } from 'react';
import './legal.css';

const pages = {
  '/aviso-legal': {
    es: {
      title: 'Aviso legal',
      description: 'Información legal y condiciones de uso de Quasaric.',
      intro: 'Información sobre el titular del sitio y las condiciones de uso de Quasaric.',
      sections: [
        ['Titular del sitio', 'Quasaric (quasaric.com) es un proyecto personal, sin venta de productos ni contratación de servicios a través de este sitio. Para consultas relacionadas con la web, puedes escribir a contacto@quasaric.com.'],
        ['Objeto y uso', 'Quasaric es una herramienta de apoyo para relacionar componentes tecnológicos declarados por el usuario con información pública sobre vulnerabilidades. No realiza escaneos activos ni verifica directamente los sistemas del usuario. El usuario debe validar los resultados y las recomendaciones con los avisos del fabricante y en su entorno.'],
        ['Propiedad intelectual', 'Los textos, diseño, marca y elementos propios de Quasaric pertenecen a sus respectivos titulares. Las marcas, nombres de productos y contenidos de terceros pertenecen a sus propietarios y se citan como referencias informativas.'],
        ['Responsabilidad y disponibilidad', 'La información se ofrece con fines informativos y de apoyo. No se garantiza la detección exhaustiva, exactitud permanente, disponibilidad ininterrumpida ni ausencia de vulnerabilidades. Quasaric no sustituye una auditoría, un escáner especializado ni un proceso profesional de gestión de vulnerabilidades.'],
        ['Enlaces y fuentes externas', 'La aplicación consulta fuentes públicas de terceros. Sus contenidos, disponibilidad y políticas se rigen por las condiciones de cada proveedor. Quasaric no controla esos servicios externos.'],
        ['Legislación', 'El uso del sitio se rige por la normativa que resulte aplicable en función de las circunstancias concretas.']
      ]
    },
    en: {
      title: 'Legal notice', description: 'Legal information and terms of use for Quasaric.',
      intro: 'Information about the website operator and the terms governing use of Quasaric.',
      sections: [
        ['Website operator', 'Quasaric (quasaric.com) is a personal project. No products are sold and no services are offered for purchase through this website. For enquiries about the website, contact contacto@quasaric.com.'],
        ['Purpose and use', 'Quasaric is an assistance tool that correlates user-declared technology components with public vulnerability information. It does not actively scan or directly verify the user’s systems. Users must validate findings and recommendations against vendor advisories and their own environment.'],
        ['Intellectual property', 'Quasaric’s own text, design, brand and assets belong to their respective rights holders. Third-party marks, product names and content belong to their owners and are referenced for informational purposes.'],
        ['Liability and availability', 'Information is provided for informational and assistance purposes. Exhaustive detection, continuous accuracy, uninterrupted availability or the absence of vulnerabilities are not guaranteed. Quasaric does not replace an audit, specialist scanner or professional vulnerability-management process.'],
        ['External links and sources', 'The application queries public third-party sources. Their content, availability and policies are governed by each provider. Quasaric does not control those external services.'],
        ['Governing law', 'Use of the website is subject to the laws applicable in the relevant circumstances.']
      ]
    }
  },
  '/privacidad': {
    es: {
      title: 'Política de privacidad',
      description: 'Qué datos utiliza Quasaric, dónde se almacenan y qué información se comparte con fuentes externas.',
      intro: 'Quasaric está diseñada con un enfoque local-first: el inventario y el historial se guardan en el almacenamiento de tu navegador.',
      sections: [
        ['Responsable del tratamiento', 'Quasaric (quasaric.com) es el nombre de un proyecto personal, no una sociedad ni una persona jurídica independiente. El proyecto está gestionado por una persona física. Este aviso identifica el proyecto y facilita el contacto en contacto@quasaric.com, pero no publica el nombre civil de quien lo gestiona. Si el RGPD resulta aplicable, la identidad del responsable debe facilitarse a las personas interesadas; este aviso, por sí solo, no sustituye esa obligación.'],
        ['Datos tratados y finalidad', 'El inventario tecnológico, las versiones, los resultados y el historial de hasta 10 análisis se guardan en el almacenamiento local del navegador (localStorage). También se conservan localmente determinadas preferencias de interfaz, como el idioma y el tema. No se requiere una cuenta, no hay formularios de registro y Quasaric no utiliza una base de datos propia ni un backend para recibir el inventario completo. La información local permanece en el perfil del navegador hasta que la elimines o el navegador la borre.'],
        ['Consultas a fuentes externas', 'Las consultas se realizan directamente desde tu navegador a los servicios públicos utilizados por el análisis. En función de la consulta, pueden transmitirse identificadores CVE, CPE, nombres de paquetes, versiones, identificadores PURL y distribución o versión de Ubuntu. El proveedor recibe además la dirección IP de origen y los metadatos habituales de la conexión. Las fuentes identificadas en el código son: NVD/NIST (services.nvd.nist.gov, búsquedas por CPE o palabra clave); FIRST EPSS (api.first.org, identificadores CVE); CISA KEV (catálogo público servido desde GitHub); OSV (api.osv.dev, consultas de paquetes y ecosistemas); Red Hat (access.redhat.com, identificadores CVE); SUSE (ftp.suse.com, identificadores CVE); avisos de seguridad de Canonical/Ubuntu y AlmaLinux (raw.githubusercontent.com, identificadores CVE); y Rocky Linux/RESF (apollo.build.resf.org, identificadores CVE). No se envía el inventario completo como un único documento. No introduzcas nombres de clientes, datos personales, credenciales, tokens ni secretos. Cada proveedor aplica sus propias condiciones y políticas de privacidad.'],
        ['Alojamiento y datos técnicos', 'La web se publica mediante Azure Static Web Apps de Microsoft. Para entregar y proteger el sitio, la infraestructura de alojamiento puede tratar datos técnicos de las solicitudes, como dirección IP, fecha y hora, recurso solicitado, agente de usuario y códigos de respuesta. El repositorio no permite comprobar si están habilitados registros adicionales en la configuración de Azure, sus plazos de conservación ni la región efectiva de tratamiento. Microsoft publica sus compromisos de protección de datos y condiciones para Azure; la configuración concreta de la cuenta debe verificarse por separado. Quasaric no incorpora Application Insights, analítica, publicidad ni telemetría propia en el código revisado.'],
        ['Conservación y transferencias', 'Quasaric no recibe ni conserva en sus propios sistemas el inventario o el historial de análisis. Los datos locales permanecen en el navegador hasta su eliminación. Microsoft y las fuentes externas pueden conservar datos técnicos y registros de consultas conforme a sus condiciones y políticas; Quasaric no puede fijar ni confirmar desde el código los plazos de esos terceros. Algunos servicios externos pueden tratar datos fuera del Espacio Económico Europeo. Consulta sus políticas y condiciones para conocer ubicación, conservación y garantías aplicables; no se afirma que todos los proveedores sean encargados del tratamiento de Quasaric, ya que algunos pueden actuar como responsables independientes.'],
        ['Base jurídica, derechos y reclamaciones', 'Las consultas externas solo se ejecutan cuando el usuario inicia un análisis y son necesarias para ofrecer esa función. Para los datos técnicos imprescindibles para publicar, mantener y proteger el sitio, la base que se considera aplicable, cuando proceda el RGPD, es el interés legítimo en el funcionamiento y la seguridad del servicio; esta valoración debe revisarse según la configuración real del alojamiento. Cuando el RGPD resulte aplicable, puedes ejercer los derechos de acceso, rectificación, supresión, limitación y oposición, así como los demás derechos que correspondan, escribiendo a contacto@quasaric.com. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es). La identidad del responsable debe facilitarse cuando la normativa lo exija; el nombre del proyecto y el correo no sustituyen por sí solos la identidad civil del responsable.'],
        ,
        ['Cambios', 'Esta política debe revisarse si se incorporan cuentas, telemetría, analítica, publicidad, backend, formularios, nuevos proveedores o cambios en los datos tratados. Fecha de entrada en vigor: 6 de noviembre de 2026.']
      ]
    },
    en: {
      title: 'Privacy policy', description: 'What data Quasaric uses, where it is stored and what is shared with external sources.',
      intro: 'Quasaric is designed local-first: your inventory and history are stored in your browser.',
      sections: [
        ['Data controller', 'Quasaric (quasaric.com) is a personal project operated in a private capacity, with no sale of products or services. For privacy and data-protection enquiries, the contact channel is contacto@quasaric.com.'],
        ['Data and purposes', 'Components, versions, preferences, analyses and history you enter are stored locally in your browser to provide inventory, analysis, comparison and reporting features. No account is required, and the current architecture does not use a Quasaric-owned database or backend to store your inventory.'],
        ['Queries to external sources', 'Queries are sent directly from your browser to public services used by the analysis. Depending on the query, transmitted data may include CVE identifiers, CPEs, package names, versions, PURLs and Ubuntu distribution or release information. Each provider also receives your source IP address and ordinary connection metadata. The services identified in the code are NVD/NIST (services.nvd.nist.gov, CPE or keyword searches); FIRST EPSS (api.first.org, CVE identifiers); CISA KEV (public catalogue served from GitHub); OSV (api.osv.dev, package and ecosystem queries); Red Hat (access.redhat.com, CVE identifiers); SUSE (ftp.suse.com, CVE identifiers); Canonical/Ubuntu and AlmaLinux security notices (raw.githubusercontent.com, CVE identifiers); and Rocky Linux/RESF (apollo.build.resf.org, CVE identifiers). The complete inventory is not uploaded as a single document. Do not enter customer names, personal data, credentials, tokens or secrets. Each provider applies its own terms and privacy policy.'],
        ['Local storage and control', 'Data stays in the browser profile where it was entered. You can clear it using available application features or browser settings; clearing site data may irreversibly remove inventory, preferences and history. Export a backup first.'],
        ['Retention', 'Quasaric does not set a remote retention period for inventory because it is stored locally. Its persistence depends on browser settings, storage limits and user actions. External providers may retain request logs under their own policies.'],
        ['Cookies and similar technologies', 'The application currently includes no advertising tools or third-party analytics. It uses browser local storage for user-requested features such as retaining inventory, history and language preference. Local storage is not a cookie, but is a similar technology and is also described in the cookie policy.'],
        ['Rights and complaints', 'For data-protection enquiries or requests, you can contact contacto@quasaric.com. The competent supervisory authority depends on the circumstances of the processing.'],
        ['Changes', 'This policy must be reviewed if accounts, telemetry, analytics, advertising, a backend, forms, new providers or new data processing are introduced. Effective date: 6 November 2026.']
      ]
    }
  },
  '/cookies': {
    es: {
      title: 'Política de cookies y almacenamiento local',
      description: 'Información sobre cookies, almacenamiento local y tecnologías similares utilizadas por Quasaric.',
      intro: 'La versión actual de Quasaric no utiliza cookies publicitarias ni herramientas de analítica de terceros.',
      sections: [
        ['Cookies y alojamiento', 'El código de la aplicación no instala cookies propias de seguimiento ni incorpora cookies de publicidad o analítica de terceros. Microsoft Azure Static Web Apps presta el alojamiento y puede tratar datos técnicos de las solicitudes para entregar y proteger el sitio. No se ha podido verificar desde el repositorio si la infraestructura añade cookies técnicas o qué registros conserva; esos extremos deben comprobarse en la configuración y documentación del servicio.'],
        ['Almacenamiento local', 'Quasaric utiliza localStorage del navegador para conservar el inventario, el historial de análisis y preferencias de interfaz como el idioma y el tema. Esta tecnología permite que funcionen las características locales que el usuario solicita; no envía por sí misma esos datos a Quasaric ni los guarda en una cuenta o base de datos propia. LocalStorage no es una cookie HTTP, pero es una tecnología de almacenamiento o recuperación de información en el dispositivo y se informa aquí por transparencia.'],
        ['¿Hace falta un banner de consentimiento?', 'La versión revisada no incorpora cookies publicitarias ni tecnologías de seguimiento o analítica. El almacenamiento local se utiliza para funciones principales que el usuario solicita, como guardar su inventario e historial. La excepción de consentimiento del artículo 22.2 de la LSSI solo puede utilizarse cuando el almacenamiento o acceso sea estrictamente necesario para prestar el servicio expresamente solicitado; esta clasificación debe revisarse si cambia la funcionalidad. Antes de añadir analítica, publicidad, mapas, vídeos embebidos, chat externo o almacenamiento no esencial, habrá que evaluar el consentimiento y, si corresponde, incorporar un mecanismo de elección.'],
        ['Cómo borrar los datos', 'Puedes borrar el inventario y el historial desde la aplicación cuando esa opción esté disponible, o eliminar los datos del sitio desde la configuración del navegador. Esta última acción también puede borrar preferencias y otros datos locales. Exporta antes una copia si necesitas conservarlos.'],
        ['Fuentes externas', 'Durante un análisis, el navegador se conecta directamente con NVD/NIST, FIRST EPSS, CISA KEV, OSV, Red Hat, SUSE, Canonical/Ubuntu, AlmaLinux y Rocky Linux/RESF, según los componentes y las reglas de correlación. Las solicitudes pueden revelar la dirección IP y los identificadores técnicos consultados. Estas conexiones no son cookies de Quasaric; cada proveedor puede aplicar sus propias tecnologías y políticas.'],
        ['Contacto y revisión', 'Proyecto: Quasaric (quasaric.com), gestionado a título particular. Contacto: contacto@quasaric.com. Fecha de actualización: 6 de noviembre de 2026. Revisa esta política cada vez que cambie el código, el alojamiento o las integraciones de terceros.']
      ]
    },
    en: {
      title: 'Cookies and local storage policy',
      description: 'Information about cookies, local storage and similar technologies used by Quasaric.',
      intro: 'The current version of Quasaric does not use advertising cookies or third-party analytics tools.',
      sections: [
        ['Cookies and hosting', 'The application code does not set first-party tracking cookies and does not include third-party advertising or analytics cookies. Microsoft Azure Static Web Apps provides hosting and may process technical request data to deliver and protect the site. The repository cannot verify whether the infrastructure adds technical cookies or what logs it retains; those points must be checked against the service configuration and documentation.'],
        ['Local storage', 'Quasaric uses browser localStorage to retain inventory, analysis history and interface preferences such as language and theme. This technology supports local features requested by the user; it does not itself send that data to Quasaric or store it in a Quasaric account or database. Local storage is not an HTTP cookie, but it is a device storage/retrieval technology and is described here for transparency.'],
        ['Is a consent banner required?', 'The reviewed version does not include advertising cookies or tracking/analytics technologies. Local storage supports core features requested by the user, such as retaining inventory and history. The consent exception in Article 22(2) of the Spanish LSSI is available only where storage or access is strictly necessary to provide the service expressly requested; this classification must be reassessed if functionality changes. Before adding analytics, advertising, maps, embedded videos, external chat or non-essential storage, consent and an appropriate choice mechanism must be evaluated.'],
        ['How to clear data', 'You can clear inventory and history from the application where that option is available, or remove site data in your browser settings. The latter may also remove preferences and other local data. Export a backup first if you need to keep it.'],
        ['External sources', 'During an analysis, the browser connects directly to NVD/NIST, FIRST EPSS, CISA KEV, OSV, Red Hat, SUSE, Canonical/Ubuntu, AlmaLinux and Rocky Linux/RESF, depending on the components and correlation rules. Requests may reveal the IP address and queried technical identifiers. These connections are not Quasaric cookies; each provider may apply its own technologies and policies.'],
        ['Contact and review', 'Project: Quasaric (quasaric.com), operated in a personal capacity. Contact: contacto@quasaric.com. Last updated: 6 November 2026. Review this policy whenever code, hosting or third-party integrations change.']
      ]
    }
  }
};

export default function LegalPage({ path, lang = 'es', onLanguageChange }) {
  const page = pages[path] || pages['/aviso-legal'];
  const copy = page[lang] || page.es;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = copy.title + ' | Quasaric';
    const setMeta = (selector, attribute, value) => document.querySelector(selector)?.setAttribute(attribute, value);
    setMeta('meta[name="description"]', 'content', copy.description);
    setMeta('meta[name="robots"]', 'content', 'noindex,follow');
    setMeta('link[rel="canonical"]', 'href', 'https://quasaric.com' + path);
    setMeta('meta[property="og:title"]', 'content', copy.title + ' | Quasaric');
    setMeta('meta[property="og:description"]', 'content', copy.description);
  }, [copy, lang, path]);

  return <div className="legal-shell">
    <header className="legal-header"><a className="legal-brand" href="/"><span>Q</span> Quasaric</a><nav aria-label={lang === 'es' ? 'Navegación legal' : 'Legal navigation'}><a href="/aviso-legal">{lang === 'es' ? 'Aviso legal' : 'Legal notice'}</a><a href="/privacidad">{lang === 'es' ? 'Privacidad' : 'Privacy'}</a><a href="/cookies">{lang === 'es' ? 'Cookies' : 'Cookies'}</a></nav><button type="button" onClick={() => onLanguageChange?.(lang === 'es' ? 'en' : 'es')}>{lang === 'es' ? 'English' : 'Español'}</button></header>
    <main className="legal-main">
      <a className="legal-back" href="/">{lang === 'es' ? '← Volver a Quasaric' : '← Back to Quasaric'}</a>
      <p className="legal-eyebrow">QUASARIC · {lang === 'es' ? 'INFORMACIÓN' : 'INFORMATION'}</p>
      <h1>{copy.title}</h1>
      <p className="legal-intro">{copy.intro}</p>
      <div className="legal-pending" role="note"><strong>{lang === 'es' ? 'Información del proyecto' : 'Project information'}</strong><span>{lang === 'es' ? 'Información general; no constituye asesoramiento jurídico.' : 'General information; this is not legal advice.'}</span></div>
      {copy.sections.map(([heading, body]) => <section className="legal-section" key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      <p className="legal-updated">{lang === 'es' ? 'Actualizado · 6 de noviembre de 2026' : 'Updated · 6 November 2026'}</p>
    </main>
    <footer className="legal-footer"><span>© {new Date().getFullYear()} Quasaric</span><span><a href="/aviso-legal">{lang === 'es' ? 'Aviso legal' : 'Legal notice'}</a> · <a href="/privacidad">{lang === 'es' ? 'Privacidad' : 'Privacy'}</a> · <a href="/cookies">{lang === 'es' ? 'Cookies' : 'Cookies'}</a></span></footer>
  </div>;
}
