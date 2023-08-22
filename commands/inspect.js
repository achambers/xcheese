const fs = require('fs');
const path = require('path');

const CACHE_DIR = '.cache';
const INSTALLED_ADDONS_PATH = path.join(CACHE_DIR, 'installed-addons.json');

const PACKAGES_TO_IGNORE = [
  '@ember/jquery/node_modules/resolve/test/resolver/malformed_package_json'
];

function findPackageJsonPaths(dir, results = []) {
  if (PACKAGES_TO_IGNORE.includes(dir.replace(path.join(process.cwd(), 'node_modules/'), ''))) {
    return results;
  }

  let files = fs.readdirSync(dir);

  if (files.includes('package.json')) {
    let packageJsonPath = path.join(dir, 'package.json');
    let packageJsonContent = require(packageJsonPath);
    if (packageJsonContent.keywords && packageJsonContent.keywords.includes('ember-addon')) {
      results = [...results, dir];
    }
  }

  for (let file of files) {
    let filePath = path.join(dir, file);
    let isDirectory = fs.statSync(filePath).isDirectory();

    if (isDirectory) {
      results = findPackageJsonPaths(filePath, results);
    }
  }

  return results;
}

module.exports = function inspectVersions(command) {
  let options = command.opts();

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
  }

  if (fs.existsSync(INSTALLED_ADDONS_PATH) && !options.refreshCache) {
    console.log('Installed addons already crawled');
    console.log('Use --refresh-cache to force a refresh');
    process.exit(0);
  }

  let nodeModulesPath = path.join(process.cwd(), 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    command.error('Must run script in a directory with a node_modules folder');
  }

  const packageJsonPaths = findPackageJsonPaths(nodeModulesPath);

  fs.writeFileSync(INSTALLED_ADDONS_PATH, JSON.stringify(packageJsonPaths));
}
