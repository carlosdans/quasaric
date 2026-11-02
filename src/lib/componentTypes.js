
const normalizeName = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const componentTypes = {
  php: 'runtime', 'php-fpm': 'runtime', node: 'runtime', 'node.js': 'runtime', nodejs: 'runtime', 'node js': 'runtime',
  python: 'runtime', java: 'runtime', ruby: 'runtime', rust: 'runtime', go: 'runtime', golang: 'runtime', dotnet: 'runtime', '.net': 'runtime', 'asp.net': 'runtime', powershell: 'runtime', openssl: 'library',
  apache: 'web', 'apache http server': 'web', apache2: 'web', httpd: 'web', nginx: 'web', caddy: 'web', tomcat: 'web', 'apache tomcat': 'web', 'microsoft iis': 'web', iis: 'web',
  wordpress: 'cms', joomla: 'cms', drupal: 'cms',
  mysql: 'database', mariadb: 'database', postgresql: 'database', mongodb: 'database',
  ubuntu: 'os', debian: 'os', 'windows server': 'os', 'windows server 2019': 'os', 'windows server 2022': 'os', 'windows server 2025': 'os', 'red hat enterprise linux': 'os', rhel: 'os', fedora: 'os', 'alpine linux': 'os', almalinux: 'os', 'rocky linux': 'os', 'suse linux enterprise server': 'os', sles: 'os'
};
export function suggestedComponentType(name) { return componentTypes[normalizeName(name)] || null; }
export function normalizeComponentType(component) {
  const suggested = suggestedComponentType(component?.name);
  return suggested ? { ...component, type: suggested } : component;
}
