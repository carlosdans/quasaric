
const normalizeName = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const componentTypes = {
  php: 'runtime', 'php-fpm': 'runtime', node: 'runtime', 'node.js': 'runtime', nodejs: 'runtime',
  python: 'runtime', java: 'runtime',
  apache: 'web', 'apache http server': 'web', httpd: 'web', nginx: 'web', 'microsoft iis': 'web', iis: 'web',
  wordpress: 'cms', joomla: 'cms', drupal: 'cms',
  mysql: 'database', mariadb: 'database', postgresql: 'database', mongodb: 'database',
  ubuntu: 'os', debian: 'os', 'windows server': 'os'
};
export function suggestedComponentType(name) { return componentTypes[normalizeName(name)] || null; }
export function normalizeComponentType(component) {
  const suggested = suggestedComponentType(component?.name);
  return suggested ? { ...component, type: suggested } : component;
}
