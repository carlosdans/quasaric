export const inventoryCommands = {
  windows: {
    label: 'Windows Server',
    commands: [
      'Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber',
      'Get-HotFix | Select-Object HotFixID, InstalledOn'
    ],
    note: 'Collects product/version/build and installed hotfix identifiers. It does not include credentials.'
  },
  ubuntu: {
    label: 'Ubuntu',
    commands: [
      'cat /etc/os-release',
      'uname -r',
      "dpkg-query -W -f='${Package}\\t${Version}\\n'"
    ],
    note: 'Package versions may include Ubuntu revisions/backported security fixes; upstream version alone is not enough.'
  },
  php: {
    label: 'PHP',
    commands: ['php -v', 'php -m'],
    note: 'Lists the PHP runtime version and loaded modules.'
  },
  node: {
    label: 'Node.js',
    commands: ['node --version', 'npm list --depth=0'],
    note: 'Lists the runtime and top-level installed packages in the current project.'
  }
};