#!/usr/bin/env node

const pkg = require('./package.json');
const { Command } = require('commander');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const inspectVersions = require('./commands/inspect');
const fetchAddons = require('./commands/fetch');

console.log(figlet.textSync(pkg.name));

const program = new Command();

let inspectCommand = program.command('inspect');

inspectCommand
  .description('Inspect installed ember addons')
  .option('-r, --refresh-cache', 'Recrawl node_modules for package.json files regardless of cache')
  .action((options, command) => {
    inspectVersions(command);
  });

let fetchCommand = program.command('fetch');

fetchCommand
  .description('Fetch package.json for latest version of all addons from Github')
  .option('-r, --refresh-cache', 'Refetch package.json files from Github regardless of cache')
  .option('-t, --token [value]', 'Github token for API auth. Need of a larger API rate limit')
  .action(fetchAddons)

program
  .version(pkg.version)
  .description(pkg.description)
  .option('-c, --clean-cache', 'Delete the cache directory')
  .parseAsync(process.argv);
