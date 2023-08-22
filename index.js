#!/usr/bin/env node

const pkg = require('./package.json');
const { Command } = require('commander');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const inspectVersions = require('./commands/inspect');

console.log(figlet.textSync(pkg.name));

const program = new Command();

let inspectCommand = program.command('inspect');

inspectCommand
  .description('Inspect installed ember addons')
  .option('-r, --refresh-cache', 'Recrawl node_modules for package.json files regardless of cache')
  .action((options, command) => {
    inspectVersions(command);
  });

program
  .version(pkg.version)
  .description(pkg.description)
//  .command('inspect', 'Inspect installed ember addons')
//  .option('-i, --inspect-versions', 'Compile list of installed ember addons')
  .option('-t, --token [value]', 'Github token for API auth')
//  .option('-r, --refresh-cache', 'Fetch new versions of package.json files from Github regardless of cache')
  .parse(process.argv);
