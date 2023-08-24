const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const util = require('util');

const exists = util.promisify(fs.exists);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');
const CACHE_DIR = '.xcache';
const CACHE_PATH = path.join(NODE_MODULES_PATH, CACHE_DIR);
const INSTALLED_ADDONS_PATH = path.join(CACHE_PATH, 'installed-addons.json');

const PATHS_TO_IGNORE = [
  CACHE_DIR,
  '@ember-data/canary-features',
  '@ember-data/private-build-infra',
  //'@ember/jquery/node_modules/resolve/test/resolver/malformed_package_json',
  'ember-cli-dependency-lint/tests-node',
  'ember-cli-typescript-blueprints/blueprints/in-repo-addon/files',
  'ember-cli/blueprints',
  'ember-cli/lib/tasks',
  'ember-cli/lib/tasks/server/middleware',
  'ember-one-way-controls/.node_modules.ember-try',
  'ember-route-action-helper/.node_modules.ember-try',
  'tracked-built-ins/node_modules/ember-cli-typescript/test-skeleton-app',
];

async function findPackageJsonPaths(dir, results, options, spinner) {
  results = await results;
  if (PATHS_TO_IGNORE.some(ignore => dir.startsWith(path.join(NODE_MODULES_PATH, '/', ignore)))) {
    return results;
  }

  let files = await readdir(dir);

  if (files.includes('package.json')) {
    let packageJsonPath = path.join(dir, 'package.json');
    let packageJsonContent;

    try {
      packageJsonContent = require(packageJsonPath);
    } catch (e) {
      //if (e instanceof SyntaxError && e.message.includes('JSON')) {
      //}

      return results;
    }

    if (packageJsonContent.keywords && packageJsonContent.keywords.includes('ember-addon')) {
      if (options.verbose) {
        spinner.clear();
        console.log(chalk.green('found: '), dir.concat('/package.json').replace(path.join(NODE_MODULES_PATH, '/'), ''));
        spinner.render();
      }
      results = [...results, dir];
    }
  }

  for (let file of files) {
    let filePath = path.join(dir, file);
    let isDirectory = (await stat(filePath)).isDirectory();

    if (isDirectory) {
      results = findPackageJsonPaths(filePath, results, options, spinner);
    }
  }

  return results;
}

module.exports = async function crawlCommand(options, command, spinner) {
  if (await exists(INSTALLED_ADDONS_PATH)) {
    return;
  }

  const packageJsonPaths = await findPackageJsonPaths(NODE_MODULES_PATH, [], options, spinner);

  await writeFile(INSTALLED_ADDONS_PATH, JSON.stringify(packageJsonPaths));
}
