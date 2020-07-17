#!/usr/bin/env node

const cli = require("commander");
const initAction = require("../commands/init");
const createAction = require("../commands/create");
const buildAction = require("../commands/build");
const devAction = require("../commands/dev");
const packageJSON = require("../package.json");

cli.version(packageJSON.version);
cli.command("dev").action(devAction);
cli.command("build").action(buildAction);
cli.command("create").action(() => createAction(process.argv[3]));
cli.parse(process.argv);
