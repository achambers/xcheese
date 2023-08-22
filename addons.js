const fs = require('fs');
const path = require('path');
//const { printTable } = require("console-table-printer");
const { Table } = require("console-table-printer");

const addonsFilePath = path.join(__dirname, 'addons.txt'); // Update with the correct path

let rows = [];

const ignore = [
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

const p = new Table({
  columns: [
    { name: 'path', alignment: 'right' },
    { name: 'pkg_version', alignment: 'right' },
    { name: 'addon_version', alignment: 'right' },
    { name: 'v2_available', alignment: 'right' },
    { name: 'v2_version', alignment: 'right' },
  ],
});

const lines = fs.readFileSync(addonsFilePath, 'utf-8').split('\n');
for (const line of lines) {
  if (ignore.some(i => line.startsWith(i))) {
    continue;
  }

  if (line.trim() !== '') {
    const pkgPath = path.join(__dirname, '../embercom', line.trim());
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
        const v2PkgPath = path.join(__dirname, 'cache', pkgName, 'package.json');

        if (!fs.existsSync(v2PkgPath)) {
          v2Available = '?';
          v2Version = '?';
        } else {
          //console.log(v2PkgPath);
          const v2PkgJson = require(v2PkgPath);
          const v2PkgVersion = v2PkgJson.version;
          const v2EmberAddon = v2PkgJson['ember-addon'];

          v2Available = v2EmberAddon?.version === 2 ? 'Y' : 'N';

          v2Version = v2Available === 'Y' ? v2PkgVersion : 'N/A';
        }

        // fetch package.json from master and check if ember-addon.version is 2
      }
      rows.push({ path: line.trim(), pkg_version: pkgVersion, addon_version: addonVersion, v2_available: v2Available, v2_version: v2Version });
    }
  }
}

//sort rows by path
//rows.sort((a, b) => (a.path > b.path) ? 1 : -1);
rows.sort((a, b) => {
  let aParts = a.path.split('/');
  let bParts = b.path.split('/');

  let aPkg  = aParts[aParts.length - 2];
  let bPkg  = bParts[bParts.length - 2];

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
  p.addRow(row, { color: `${row.addon_version === 1 ? 'red' : 'green'}` });
}

console.log(rows.length, 'addons');
console.log(rows.filter(row => row.addon_version === 1).length, 'V1 addons');
console.log(rows.filter(row => row.addon_version === 2).length, 'V2 addons');

p.printTable();
//printTable(rows);

console.log(rows.length, 'addons');
console.log(rows.filter(row => row.addon_version === 1).length, 'V1 addons');
console.log(rows.filter(row => row.addon_version === 2).length, 'V2 addons');
