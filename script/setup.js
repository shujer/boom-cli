#!/usr/bin/env node

const cli = require("commander");
const { prompt } = require("enquirer");
const createChoices = require("./commands/create");
const packageJSON = require("../package.json");

cli.version(packageJSON.version);
cli.command("create [type] [name]").action(async () => {
  let name = process.argv[3];
  const { choice } = await prompt({
    type: "select",
    name: "choice",
    message: "[create] select init type",
    choices: Object.keys(createChoices),
  });
  fn = createChoices[choice];
  await fn(name);
});
cli.parse(process.argv);
