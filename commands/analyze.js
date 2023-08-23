const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { Table } = require('console-table-printer');

const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');
const CACHE_DIR = '.xcache';
const CACHE_PATH = path.join(NODE_MODULES_PATH, CACHE_DIR);
const INSTALLED_ADDONS_PATH = path.join(CACHE_PATH, 'installed-addons.json');
const FETCHED_VERSIONS_DIR = path.join(CACHE_PATH, 'addons');

const REPO_NOTES = {
  'ember-invoke-action': 'Repo no longer exists'
};

module.exports = function analyzeVersions(/*options, command*/) {
  let rows = [];

  if (!fs.existsSync(INSTALLED_ADDONS_PATH)) {
    console.log('Must run inspect command before fetching versions');
    process.exit(1);
  }

  let installedAddons = JSON.parse(fs.readFileSync(INSTALLED_ADDONS_PATH));

  for (const addon of installedAddons) {
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
        const v2PkgPath = path.join(FETCHED_VERSIONS_DIR, pkgName, 'package.json');

        if (!fs.existsSync(v2PkgPath)) {
          v2Available = '?';
          v2Version = '?';
        } else {
          const v2PkgJson = require(v2PkgPath);
          const v2PkgVersion = v2PkgJson.version;
          const v2EmberAddon = v2PkgJson['ember-addon'];

          v2Available = v2EmberAddon?.version === 2 ? 'Y' : 'N';

          v2Version = v2Available === 'Y' ? v2PkgVersion : '-';
        }
      }

      rows.push({ path: addon.trim().replace(path.join(NODE_MODULES_PATH, '/'), ''), pkg_version: pkgVersion, addon_version: addonVersion, v2_available: v2Available, v2_version: v2Version, notes: REPO_NOTES[pkgName] ?? '' });
    }
  }

  let p = new Table({
    columns: [
      { name: 'path', alignment: 'right' },
      { name: 'pkg_version', alignment: 'right' },
      { name: 'addon_version', alignment: 'right' },
      { name: 'v2_available', alignment: 'right' },
      { name: 'v2_version', alignment: 'right' },
      { name: 'notes', alignment: 'left' },
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
    p.addRow(row, { color: `${row.addon_version === 2 ? 'green' : (row.v2_available === 'Y' ? 'yellow' : 'red')}` });
  }

  let addonsStats = rows.length;
  let v2AddonsStats = rows.filter(row => row.addon_version === 2).length;
  let upgradableV1AddonsStats = rows.filter(row => row.addon_version === 1 && row.v2_available === 'Y').length;
  let v1AddonsStats = rows.filter(row => row.addon_version === 1 && ['N', '?'].includes(row.v2_available)).length;

  const maxWidth = Math.max(
    String(addonsStats).length,
    String(v2AddonsStats).length,
    String(upgradableV1AddonsStats).length,
    String(v1AddonsStats).length
  );

  console.log(chalk.blueBright(pad(addonsStats, maxWidth)), 'Addons');
  console.log(chalk.green(pad(v2AddonsStats, maxWidth)), 'V2 addons');
  console.log(chalk.yellow(pad(upgradableV1AddonsStats, maxWidth)), 'Upgradable V1 addons');
  console.log(chalk.red(pad(v1AddonsStats, maxWidth)), 'V1 addons');

  p.printTable();

  console.log(chalk.blueBright(pad(addonsStats, maxWidth)), 'Addons');
  console.log(chalk.green(pad(v2AddonsStats, maxWidth)), 'V2 addons');
  console.log(chalk.yellow(pad(upgradableV1AddonsStats, maxWidth)), 'Upgradable V1 addons');
  console.log(chalk.red(pad(v1AddonsStats, maxWidth)), 'V1 addons');


  function pad(number, width) {
    const numberString = String(number);
    const padding = ' '.repeat(width - numberString.length);
    return padding + numberString;
  }
};

