#!/usr/bin/env node

const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));
const { Command } = require('commander');
const figlet = require('figlet');
const fs = require('fs');
const chalk = require('chalk');
const inspectVersions = require('./commands/inspect');
const fetchAddons = require('./commands/fetch');
const analyzeAddons = require('./commands/analyze');

console.log(chalk.yellowBright(figlet.textSync(pkg.name)));

const program = new Command();

let inspectCommand = program.command('inspect');

inspectCommand
  .description('Inspect installed ember addons')
  .option('-r, --refresh-cache', 'Recrawl node_modules for package.json files regardless of cache')
  .action(inspectVersions);

let fetchCommand = program.command('fetch');

fetchCommand
  .description('Fetch package.json for latest version of all addons from Github')
  .option('-r, --refresh-cache', 'Refetch package.json files from Github regardless of cache')
  .option('-t, --token [value]', 'Github token for API auth. Need of a larger API rate limit')
  .action(fetchAddons)

let analyzeCommand = program.command('analyze');

analyzeCommand
  .description('Analyze and addons and print v1 vs v2 status')
  .option('-e, --expand-duplicates', 'Expand duplicate usages of an addon')
  .action(analyzeAddons);

program
  .version(pkg.version)
  .description(pkg.description)
  .option('-c, --clean-cache', 'Delete the cache directory')
  .parseAsync(process.argv);
