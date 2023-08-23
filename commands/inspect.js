const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');
const CACHE_DIR = '.xcache';
const CACHE_PATH = path.join(NODE_MODULES_PATH, CACHE_DIR);
const INSTALLED_ADDONS_PATH = path.join(CACHE_PATH, 'installed-addons.json');

const PATHS_TO_IGNORE = [
  CACHE_DIR,
  '@ember-data/canary-features',
  '@ember-data/private-build-infra',
  '@ember/jquery/node_modules/resolve/test/resolver/malformed_package_json',
  'ember-cli-dependency-lint/tests-node',
  'ember-cli-typescript-blueprints/blueprints/in-repo-addon/files',
  'ember-cli/blueprints',
  'ember-cli/lib/tasks',
  'ember-cli/lib/tasks/server/middleware',
  'ember-one-way-controls/.node_modules.ember-try',
  'ember-route-action-helper/.node_modules.ember-try',
  'tracked-built-ins/node_modules/ember-cli-typescript/test-skeleton-app',
];

function findPackageJsonPaths(dir, results = []) {
  if (PATHS_TO_IGNORE.some(ignore => dir.startsWith(path.join(NODE_MODULES_PATH, '/', ignore)))) {
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

module.exports = function inspectVersions(options, command) {
  if (!fs.existsSync(NODE_MODULES_PATH)) {
    command.error(chalk.redBright('Make sure you install your dependencies before running this command'));
  }

  if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH);
  }

  if (fs.existsSync(INSTALLED_ADDONS_PATH) && !options.refreshCache) {
    console.log('Installed addons already crawled');
    console.log('Use --refresh-cache to force a refresh');
    process.exit(0);
  }

  const packageJsonPaths = findPackageJsonPaths(NODE_MODULES_PATH);

  fs.writeFileSync(INSTALLED_ADDONS_PATH, JSON.stringify(packageJsonPaths));
}
