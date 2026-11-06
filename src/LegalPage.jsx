import React, { useEffect } from 'react';
import './legal.css';

const pages = {
  '/aviso-legal': {
    es: {
      title: 'Aviso legal',
      description: 'Información legal y condiciones de uso de Quasaric.',
      intro: 'Información sobre el titular del sitio y las condiciones de uso de Quasaric.',
      sections: [
        ['Titular del sitio', 'Esta sección debe completarse antes de publicar la web como servicio definitivo. Proyecto personal sin actividad de venta de productos o servicios: Quasaric (quasaric.com). El nombre Quasaric identifica el proyecto y no es una persona jurídica. Identidad legal del titular: [PENDIENTE DE FACILITAR]. NIF: [PENDIENTE, si resulta exigible]. Domicilio a efectos legales: [PENDIENTE DE VALIDAR]. Correo electrónico de contacto: contacto@quasaric.com. No se ofrecen ventas ni contratación a través de este sitio.'],
        ['Objeto y uso', 'Quasaric es una herramienta de apoyo para relacionar componentes tecnológicos declarados por el usuario con información pública sobre vulnerabilidades. No realiza escaneos activos ni verifica directamente los sistemas del usuario. El usuario debe validar los resultados y las recomendaciones con los avisos del fabricante y en su entorno.'],
        ['Propiedad intelectual', 'Los textos, diseño, marca y elementos propios de Quasaric pertenecen a sus respectivos titulares. Las marcas, nombres de productos y contenidos de terceros pertenecen a sus propietarios y se citan como referencias informativas.'],
        ['Responsabilidad y disponibilidad', 'La información se ofrece con fines informativos y de apoyo. No se garantiza la detección exhaustiva, exactitud permanente, disponibilidad ininterrumpida ni ausencia de vulnerabilidades. Quasaric no sustituye una auditoría, un escáner especializado ni un proceso profesional de gestión de vulnerabilidades.'],
        ['Enlaces y fuentes externas', 'La aplicación consulta fuentes públicas de terceros. Sus contenidos, disponibilidad y políticas se rigen por las condiciones de cada proveedor. Quasaric no controla esos servicios externos.'],
        ['Legislación', 'La jurisdicción y legislación aplicables deberán confirmarse en función de la identidad y establecimiento del titular: [PENDIENTE DE VALIDACIÓN LEGAL].']
      ]
    },
    en: {
      title: 'Legal notice', description: 'Legal information and terms of use for Quasaric.',
      intro: 'Information about the website operator and the terms governing use of Quasaric.',
      sections: [
        ['Website operator', 'This section must be completed before the website is presented as a final service. Personal project with no sale of products or services: Quasaric (quasaric.com). Quasaric is the public project name, not a legal person. Operator’s legal identity: [TO BE PROVIDED]. Tax ID: [IF REQUIRED]. Legal address: [TO BE CONFIRMED]. Contact email: contacto@quasaric.com. No sales or contracting are offered through this website.'],
        ['Purpose and use', 'Quasaric is an assistance tool that correlates user-declared technology components with public vulnerability information. It does not actively scan or directly verify the user’s systems. Users must validate findings and recommendations against vendor advisories and their own environment.'],
        ['Intellectual property', 'Quasaric’s own text, design, brand and assets belong to their respective rights holders. Third-party marks, product names and content belong to their owners and are referenced for informational purposes.'],
        ['Liability and availability', 'Information is provided for informational and assistance purposes. Exhaustive detection, continuous accuracy, uninterrupted availability or the absence of vulnerabilities are not guaranteed. Quasaric does not replace an audit, specialist scanner or professional vulnerability-management process.'],
        ['External links and sources', 'The application queries public third-party sources. Their content, availability and policies are governed by each provider. Quasaric does not control those external services.'],
        ['Governing law', 'Applicable law and jurisdiction must be confirmed based on the operator’s identity and establishment: [LEGAL REVIEW REQUIRED].']
      ]
    }
  },
  '/privacidad': {
    es: {
      title: 'Política de privacidad',
      description: 'Qué datos utiliza Quasaric, dónde se almacenan y qué información se comparte con fuentes externas.',
      intro: 'Quasaric está diseñada con un enfoque local-first: el inventario y el historial se guardan en el almacenamiento de tu navegador.',
      sections: [
        ['Responsable del tratamiento', 'El proyecto Quasaric (quasaric.com) es gestionado por una persona física a título particular y no vende productos ni servicios. Quasaric es el nombre público del proyecto, no la identidad legal del responsable. Identidad legal del responsable: [PENDIENTE DE FACILITAR]. Correo de contacto para privacidad: contacto@quasaric.com. La identidad legal debe completarse para que la información del responsable sea plenamente transparente cuando resulte exigible.'],
        ['Datos tratados y finalidad', 'Los componentes, versiones, preferencias, análisis e historial que introduces se almacenan localmente en tu navegador para prestar las funciones de inventario, análisis, comparación e informes. No se requiere una cuenta y la arquitectura actual no utiliza una base de datos propia ni un backend de Quasaric para almacenar el inventario.'],
        ['Consultas a terceros y dirección IP', 'Cuando ejecutas un análisis, el navegador consulta fuentes públicas de vulnerabilidades. Esas solicitudes pueden revelar a cada proveedor tu dirección IP, los identificadores consultados y los metadatos técnicos habituales de una conexión. No introduzcas nombres internos sensibles, credenciales, tokens ni secretos en el inventario. Los proveedores externos actúan conforme a sus propias políticas.'],
        ['Almacenamiento local y control', 'Los datos permanecen en el perfil y navegador donde se introducen. Puedes borrarlos desde las funciones disponibles en la aplicación o desde la configuración del navegador; borrar los datos del sitio puede eliminar inventario, preferencias e historial sin posibilidad de recuperación. Exporta una copia antes de hacerlo.'],
        ['Conservación', 'Quasaric no establece un plazo remoto de conservación para el inventario porque se guarda localmente. Su permanencia depende de la configuración, capacidad y limpieza del almacenamiento del navegador y de las acciones del usuario. Los proveedores consultados pueden conservar registros de sus solicitudes según sus propias políticas.'],
        ['Cookies y tecnologías similares', 'La aplicación no incorpora actualmente herramientas publicitarias ni analítica de terceros. Utiliza almacenamiento local del navegador para funciones solicitadas por el usuario, como conservar inventario, historial y preferencia de idioma. Este almacenamiento no es una cookie, pero es una tecnología similar y se describe también en la política de cookies.'],
        ['Derechos y reclamaciones', 'Para ejercer los derechos de protección de datos que resulten aplicables o plantear una consulta, el canal de contacto del responsable debe completarse aquí: contacto@quasaric.com. La autoridad de control competente dependerá del establecimiento del responsable y de las circunstancias del tratamiento.'],
        ['Cambios', 'Esta política debe revisarse si se incorporan cuentas, telemetría, analítica, publicidad, backend, formularios, nuevos proveedores o cambios en los datos tratados. Fecha de entrada en vigor: [PENDIENTE].']
      ]
    },
    en: {
      title: 'Privacy policy', description: 'What data Quasaric uses, where it is stored and what is shared with external sources.',
      intro: 'Quasaric is designed local-first: your inventory and history are stored in your browser.',
      sections: [
        ['Data controller', 'The Quasaric project (quasaric.com) is operated by an individual in a personal capacity and does not sell products or services. Quasaric is the public project name, not the controller’s legal identity. Controller’s legal identity: [TO BE PROVIDED]. Privacy contact email: contacto@quasaric.com. The legal identity must be completed for full controller transparency where required.'],
        ['Data and purposes', 'Components, versions, preferences, analyses and history you enter are stored locally in your browser to provide inventory, analysis, comparison and reporting features. No account is required, and the current architecture does not use a Quasaric-owned database or backend to store your inventory.'],
        ['Third-party queries and IP address', 'When you run an analysis, your browser queries public vulnerability sources. Each provider may receive your IP address, queried identifiers and ordinary connection metadata. Do not enter sensitive internal names, credentials, tokens or secrets. External providers operate under their own policies.'],
        ['Local storage and control', 'Data stays in the browser profile where it was entered. You can clear it using available application features or browser settings; clearing site data may irreversibly remove inventory, preferences and history. Export a backup first.'],
        ['Retention', 'Quasaric does not set a remote retention period for inventory because it is stored locally. Its persistence depends on browser settings, storage limits and user actions. External providers may retain request logs under their own policies.'],
        ['Cookies and similar technologies', 'The application currently includes no advertising tools or third-party analytics. It uses browser local storage for user-requested features such as retaining inventory, history and language preference. Local storage is not a cookie, but is a similar technology and is also described in the cookie policy.'],
        ['Rights and complaints', 'To exercise applicable data-protection rights or make an enquiry, the controller’s contact channel must be completed here: contacto@quasaric.com. The competent supervisory authority depends on the controller’s establishment and processing circumstances.'],
        ['Changes', 'This policy must be reviewed if accounts, telemetry, analytics, advertising, a backend, forms, new providers or new data processing are introduced. Effective date: [TO BE COMPLETED].']
      ]
    }
  },
  '/cookies': {
    es: {
      title: 'Política de cookies y almacenamiento local',
      description: 'Información sobre cookies, almacenamiento local y tecnologías similares utilizadas por Quasaric.',
      intro: 'La versión actual de Quasaric no utiliza cookies publicitarias ni herramientas de analítica de terceros.',
      sections: [
        ['Cookies', 'La aplicación no instala actualmente cookies propias de seguimiento ni cookies de publicidad o analítica de terceros. El alojamiento web y la infraestructura de entrega podrían procesar registros técnicos necesarios para servir el sitio; el proveedor de alojamiento debe confirmar sus cookies, registros y plazos aplicables.'],
        ['Almacenamiento local', 'Quasaric utiliza almacenamiento local del navegador (localStorage) para guardar el inventario, el historial de análisis y la preferencia de idioma. Es necesario para ofrecer las funciones que el usuario solicita y permanece en el navegador, no en una cuenta o base de datos de Quasaric.'],
        ['¿Hace falta un banner de consentimiento?', 'Con la funcionalidad actual no se ha añadido un banner de aceptación porque no se han incorporado cookies no necesarias ni tecnologías de seguimiento/analítica. Esta conclusión debe revisarse antes de añadir analítica, publicidad, mapas, vídeos embebidos, chat externo u otras tecnologías no esenciales. La clasificación legal debe validarse para el caso concreto.'],
        ['Cómo borrar los datos', 'Puedes borrar el inventario y el historial desde la aplicación cuando esa opción esté disponible, o eliminar los datos del sitio desde la configuración del navegador. Esta última acción también puede borrar preferencias y otros datos locales. Exporta antes una copia si necesitas conservarlos.'],
        ['Terceros', 'Las consultas a fuentes públicas de vulnerabilidades generan conexiones directas desde tu navegador a los proveedores correspondientes. Esas conexiones no son cookies de Quasaric; los proveedores pueden aplicar sus propias tecnologías y políticas.'],
        ['Contacto y revisión', 'Proyecto: Quasaric (quasaric.com), gestionado a título particular. Contacto: contacto@quasaric.com. Fecha de actualización: 6 de noviembre de 2026. Revisa esta política cada vez que cambie el código, el alojamiento o las integraciones de terceros.']
      ]
    },
    en: {
      title: 'Cookies and local storage policy',
      description: 'Information about cookies, local storage and similar technologies used by Quasaric.',
      intro: 'The current version of Quasaric does not use advertising cookies or third-party analytics tools.',
      sections: [
        ['Cookies', 'The application currently sets no first-party tracking cookies and uses no third-party advertising or analytics cookies. The hosting and content-delivery infrastructure may process technical logs needed to serve the site; the hosting provider must confirm applicable cookies, logs and retention periods.'],
        ['Local storage', 'Quasaric uses browser local storage (localStorage) to retain inventory, analysis history and language preference. It supports features requested by the user and remains in the browser, not in a Quasaric account or database.'],
        ['Is a consent banner required?', 'No acceptance banner has been added for the current functionality because no non-essential cookies or tracking/analytics technologies have been introduced. This must be reassessed before adding analytics, advertising, maps, embedded video, external chat or other non-essential technologies. The legal classification should be validated for the specific implementation.'],
        ['How to clear data', 'You can clear inventory and history from the application where that option is available, or remove site data in your browser settings. The latter may also remove preferences and other local data. Export a backup first if you need to keep it.'],
        ['Third parties', 'Queries to public vulnerability sources create direct browser connections to the relevant providers. These are not Quasaric cookies; providers may apply their own technologies and policies.'],
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
      <div className="legal-pending" role="note"><strong>{lang === 'es' ? 'Documento pendiente de completar y validar' : 'Document pending completion and review'}</strong><span>{lang === 'es' ? 'Los campos entre corchetes requieren datos del titular. Estas páginas no constituyen asesoramiento jurídico.' : 'Bracketed fields require operator details. These pages are not legal advice.'}</span></div>
      {copy.sections.map(([heading, body]) => <section className="legal-section" key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      <p className="legal-updated">{lang === 'es' ? 'Versión de trabajo · 6 de noviembre de 2026' : 'Working draft · 6 November 2026'}</p>
    </main>
    <footer className="legal-footer"><span>© {new Date().getFullYear()} Quasaric</span><span><a href="/aviso-legal">{lang === 'es' ? 'Aviso legal' : 'Legal notice'}</a> · <a href="/privacidad">{lang === 'es' ? 'Privacidad' : 'Privacy'}</a> · <a href="/cookies">{lang === 'es' ? 'Cookies' : 'Cookies'}</a></span></footer>
  </div>;
}
