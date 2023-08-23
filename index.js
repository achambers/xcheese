#!/usr/bin/env node

const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));
const { Command } = require('commander');
const figlet = require('figlet');
const chalk = require('chalk');
const defaultCommand = require('./commands/default');

console.log(chalk.yellowBright(figlet.textSync(pkg.name)));

const program = new Command();

program
  .name(pkg.name)
  .version(pkg.version)
  .description(pkg.description)
  .option('-c, --clean-cache', 'Delete the cache, forcing a recrawl of node_modules and refetch of package.json files from GitHub')
  .option('-e, --expand-duplicates', 'Expand duplicate usages of an addon')
  .option('-t, --token [value]', 'Github token for API auth. Need of a larger API rate limit')
  .option('-v, --verbose', 'Print verbose output')
  .action(defaultCommand);

program.parseAsync(process.argv);
