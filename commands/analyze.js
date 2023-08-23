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

module.exports = function analyzeVersions(options/*, command*/) {
  let rows = [];

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

        if (pkgName === 'ember-invoke-action') {
          v2Available = 'N';
          v2Version = '-';
        } else if (!fs.existsSync(v2PkgPath)) {
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

      rows.push({
        path: addon.trim().replace(path.join(NODE_MODULES_PATH, '/'), ''),
        pkg_version: pkgVersion,
        addon_version: addonVersion,
        v2_available: v2Available,
        v2_version: v2Version,
        notes: REPO_NOTES[pkgName] ?? '',
        get unique_name() {
          let segments = this.path.split('/');
          return segments[segments.length - 1];
        }
      });
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
    disabledColumns: ['unique_name'],
  });

  rows.sort((a, b) => {
    let aParts = a.path.split('/');
    let bParts = b.path.split('/');

    let aPkg  = aParts[aParts.length - 1];
    let bPkg  = bParts[bParts.length - 1];

    return (aPkg > bPkg) ? 1 : -1
  });

  let v2 = rows.filter(row => row.addon_version === 2);
  let v1 = rows.filter(row => row.addon_version === 1);
  let v1WithV2Available = v1.filter(row => row.v2_available === 'Y');
  let v1WithNoV2Available = v1.filter(row => row.v2_available === 'N');
  let v1WithUnknownV2Available = v1.filter(row => row.v2_available === '?');

  rows = [...v2, ...v1WithV2Available, ...v1WithUnknownV2Available, ...v1WithNoV2Available];

  let groupedV2 = groupByAddon(v2);
  let groupedV1WithV2Available = groupByAddon(v1WithV2Available);
  let groupedV1WithNoV2Available = groupByAddon(v1WithNoV2Available);
  let groupedV1WithUnknownV2Available = groupByAddon(v1WithUnknownV2Available);

  let groupedRows = [...groupedV2, ...groupedV1WithV2Available, ...groupedV1WithUnknownV2Available, ...groupedV1WithNoV2Available];

  let addonsStats = rows.length;
  let addonsStatsUnique = rows.filter((row, index, self) => self.findIndex(r => r.unique_name === row.unique_name) === index).length;
  let v2AddonsStats = v2.length;
  let v2AddonsStatsUnique = v2.filter((row, index, self) => self.findIndex(r => r.unique_name === row.unique_name) === index).length;
  let upgradableV1AddonsStats = v1WithV2Available.length;
  let upgradableV1AddonsStatsUnique = v1WithV2Available.filter((row, index, self) => self.findIndex(r => r.unique_name === row.unique_name) === index).length;
  let v1AddonsStats = [...v1WithNoV2Available, ...v1WithUnknownV2Available].length;
  let v1AddonsStatsUnique = [...v1WithNoV2Available, ...v1WithUnknownV2Available].filter((row, index, self) => self.findIndex(r => r.unique_name === row.unique_name) === index).length;

  const maxWidth = Math.max(
    String(addonsStats).length,
    String(v2AddonsStats).length,
    String(upgradableV1AddonsStats).length,
    String(v1AddonsStats).length
  );

  console.log(chalk.blueBright(pad(addonsStats, maxWidth)), 'Addons (', chalk.blueBright(addonsStatsUnique), 'unique )');
  console.log(chalk.green(pad(v2AddonsStats, maxWidth)), 'V2 addons (', chalk.green(v2AddonsStatsUnique), 'unique )');
  console.log(chalk.yellow(pad(upgradableV1AddonsStats, maxWidth)), 'Upgradable V1 addons (', chalk.yellow(upgradableV1AddonsStatsUnique), 'unique )');
  console.log(chalk.red(pad(v1AddonsStats, maxWidth)), 'V1 addons (', chalk.red(v1AddonsStatsUnique), 'unique )');

  if (!options.expandDuplicates) {
    rows = groupedRows;
  }

  for (const row of rows) {
    p.addRow(row, { color: `${row.addon_version === 2 ? 'green' : (row.v2_available === 'Y' ? 'yellow' : 'red')}` });
  }

  p.printTable();

  console.log(chalk.blueBright(pad(addonsStats, maxWidth)), 'Addons (', chalk.blueBright(addonsStatsUnique), 'unique )');
  console.log(chalk.green(pad(v2AddonsStats, maxWidth)), 'V2 addons (', chalk.green(v2AddonsStatsUnique), 'unique )');
  console.log(chalk.yellow(pad(upgradableV1AddonsStats, maxWidth)), 'Upgradable V1 addons (', chalk.yellow(upgradableV1AddonsStatsUnique), 'unique )');
  console.log(chalk.red(pad(v1AddonsStats, maxWidth)), 'V1 addons (', chalk.red(v1AddonsStatsUnique), 'unique )');
};

function pad(number, width) {
  const numberString = String(number);
  const padding = ' '.repeat(width - numberString.length);
  return padding + numberString;
}

function extract(s) {
  const lastNodeModulesIndex = s.lastIndexOf('node_modules');
  return s.substr(lastNodeModulesIndex + 'node_modules'.length + 1);
}

function groupByAddon(arr) {
  const consolidated = {};

  arr.forEach((item) => {
    const isNested = item.path.includes('node_modules');
    const packageName = isNested ? extract(item.path) : item.path;

    if (!consolidated[packageName]) {
      consolidated[packageName] = {
        ...item,
        path: packageName,
        version: null,
        versions: new Set(),
      };
    }

    if (!isNested) {
      consolidated[packageName].version = item.pkg_version;
    } else {
      consolidated[packageName].versions.add(item.pkg_version);
    }
  });

  let collection = [];

  Object.values(consolidated).forEach((item) => {
    if (item.version) {
      collection.push({ path: item.path, pkg_version: item.version, addon_version: item.addon_version, v2_available: item.v2_available, v2_version: item.v2_version, notes: item.notes, unique_name: item.unique_name });
    }

    if (item.versions.size > 0) {
      if (item.versions.size > 1) {
        collection.push({
          path: `**/${item.path}`,
          pkg_version: Array.from(item.versions).sort().join(', '),
          addon_version: item.addon_version,
          v2_available: item.v2_available,
          v2_version: item.v2_version,
          notes: item.notes,
          unique_name: item.unique_name,
        });
      } else {
        collection.push({
          path: item.path,
          pkg_version: Array.from(item.versions).sort().join(', '),
          addon_version: item.addon_version,
          v2_available: item.v2_available,
          v2_version: item.v2_version,
          notes: item.notes,
          unique_name: item.unique_name,
        });
      }
    }
  });

  return collection;
}
