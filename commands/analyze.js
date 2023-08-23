const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { Table } = require("console-table-printer");

const CACHE_DIR = '.cache';
const FETCHED_VERSIONS_DIR = path.join(CACHE_DIR, 'addons');
const INSTALLED_ADDONS_PATH = path.join(CACHE_DIR, 'installed-addons.json');

const ADDON_IGNORES = [
  'node_modules/ember-cli/blueprints/',
  'node_modules/ember-cli/lib/tasks/server/middleware',
  'node_modules/ember-cli/lib/tasks',
  'node_modules/ember-route-action-helper/.node_modules.ember-try',
  'node_modules/ember-cli-dependency-lint/tests-node',
  'node_modules/ember-one-way-controls/.node_modules.ember-try',
  'node_modules/ember-cli-typescript-blueprints/blueprints/in-repo-addon/files',
  'node_modules/@ember-data/canary-features',
  'node_modules/@ember-data/private-build-infra',
  'node_modules/tracked-built-ins/node_modules/ember-cli-typescript/test-skeleton-app',
  'node_modules/ember-decorators/package.json'
];

module.exports = function analyzeVersions(command) {
  let rows = [];
  let ignoredPackages = [];

  if (!fs.existsSync(INSTALLED_ADDONS_PATH)) {
    console.log('Must run inspect command before fetching versions');
    process.exit(1);
  }

  let installedAddons = JSON.parse(fs.readFileSync(INSTALLED_ADDONS_PATH));

  for (const addon of installedAddons) {
    if (ADDON_IGNORES.some(ignore => addon.startsWith(path.join(process.cwd(), ignore)))) {
      ignoredPackages.push(addon);
      continue;
    }

    //if (addon.trim() !== '') {
    const pkgPath = path.join(addon, 'package.json');
    const pkgJson = require(pkgPath);
    const pkgName = pkgJson.name;
    const pkgVersion = pkgJson.version;
    const emberAddon = pkgJson['ember-addon'];
    const repo = pkgJson.repository;

    if (emberAddon) {
      const addonVersion = emberAddon.version ?? 1;
      let v2Available = 'N';
      let v2Version = 'N/A';

      if (addonVersion === 2) {
        v2Available = 'Y';
        v2Version = pkgVersion;
      } else {
        const v2PkgPath = path.join(process.cwd(), FETCHED_VERSIONS_DIR, pkgName, 'package.json');

        if (!fs.existsSync(v2PkgPath)) {
          v2Available = '?';
          v2Version = '?';
        } else {
          //console.log(v2PkgPath);
          console.log(chalk.green(v2PkgPath));
          const v2PkgJson = require(v2PkgPath);
          const v2PkgVersion = v2PkgJson.version;
          const v2EmberAddon = v2PkgJson['ember-addon'];

          v2Available = v2EmberAddon?.version === 2 ? 'Y' : 'N';

          v2Version = v2Available === 'Y' ? v2PkgVersion : '-';
        }

        // fetch package.json from master and check if ember-addon.version is 2
      }
      rows.push({ path: addon.trim().replace(path.join(process.cwd(), 'node_modules/'), ''), pkg_version: pkgVersion, addon_version: addonVersion, v2_available: v2Available, v2_version: v2Version });
    }
    //}
  }

  let p = new Table({
    columns: [
      { name: 'path', alignment: 'right' },
      { name: 'pkg_version', alignment: 'right' },
      { name: 'addon_version', alignment: 'right' },
      { name: 'v2_available', alignment: 'right' },
      { name: 'v2_version', alignment: 'right' },
    ],
  });

  //sort rows by path
  //rows.sort((a, b) => (a.path > b.path) ? 1 : -1);
  rows.sort((a, b) => {
    let aParts = a.path.split('/');
    let bParts = b.path.split('/');

    let aPkg  = aParts[aParts.length - 1];
    let bPkg  = bParts[bParts.length - 1];

    //return (a.path > b.path) ? 1 : -1
    return (aPkg > bPkg) ? 1 : -1
  });

  let v2 = rows.filter(row => row.addon_version === 2);
  let v1 = rows.filter(row => row.addon_version === 1);
  let v1WithV2Available = v1.filter(row => row.v2_available === 'Y');
  let v1WithNoV2Available = v1.filter(row => row.v2_available === 'N');
  let v1WithUnknownV2Available = v1.filter(row => row.v2_available === '?');

  rows = [...v2, ...v1WithV2Available, ...v1WithUnknownV2Available, ...v1WithNoV2Available];

  for (const row of rows) {
    //p.addRow(row, { color: `${row.addon_version === 1 ? 'red' : 'green'}` });
    p.addRow(row, { color: `${row.addon_version === 2 ? 'green' : (row.v2_available === 'Y' ? 'yellow' : 'red')}` });
  }

  console.log(rows.length, 'addons');
  console.log(rows.filter(row => row.addon_version === 1).length, 'V1 addons');
  console.log(rows.filter(row => row.addon_version === 2).length, 'V2 addons');

  p.printTable();
  //printTable(rows);

  console.log(rows.length, 'addons');
  console.log(rows.filter(row => row.addon_version === 1).length, 'V1 addons');
  console.log(rows.filter(row => row.addon_version === 2).length, 'V2 addons');
};

