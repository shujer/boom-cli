#!/usr/bin/env node

const cli = require("commander");
const createAction = require("./commands/create");
const packageJSON = require("../package.json");

cli.version(packageJSON.version);
cli.command("create").action(() => createAction(process.argv[3]));
cli.parse(process.argv);
