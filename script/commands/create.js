const path = require("path");
const util = require("util");
const fs = require("fs");
const fse = require("fs-extra");
const colors = require("colors");
const { prompt } = require("enquirer");
const { upperFirst, each } = require("lodash");
const parserer = require("../utils/transfer");
const fsreaddir = util.promisify(fs.readdir);
const fsreadFile = util.promisify(fs.readFile);
const fswriteFile = util.promisify(fs.writeFile);

const createComponent = async (name) => {
  if (!name) {
    const { input } = await prompt({
      type: "input",
      name: "input",
      message: "React 组件库的名称(小写加-分隔)",
    });
    name = input;
  }
  const templateName = name.split("-").map(upperFirst).join("");
  const templatePath = path.resolve(__dirname, "../../template/component");
  const outputPath = path.resolve(process.cwd(), name);
  if (fs.existsSync(outputPath)) {
    console.log(`${templateName.bold}已经存在, 创建失败`.yellow);
    return;
  }
  await fse.copy(templatePath, outputPath);
  const templateFiles = await fsreaddir(outputPath);
  each(templateFiles, async function (file) {
    const filePath = path.resolve(outputPath, file);
    let fileContent = "";
    try {
      fileContent = await fsreadFile(filePath, "utf-8");
    } catch (err) {
      console.error(err, filePath);
    }
    const newFileContent = fileContent
      .replace(/\<%template%\>/gm, name)
      .replace(/\<%template-name%\>/gm, templateName);
    await fswriteFile(filePath, newFileContent);
  });
  const srcPath = path.resolve(outputPath, `src`);
  const entryPath = path.resolve(outputPath, `src/${name}.ts`);
  await fse.mkdirSync(srcPath);
  await fswriteFile(entryPath, "");
  console.log(`创建成功 [${templateName.bold}]`.green);
  return;
};

const createService = async function (name) {
  if (!name) {
    const { input } = await prompt({
      type: "input",
      name: "input",
      message: "创建的请求服务模块名称(小写加-分隔)",
    });
    name = input;
  }
  const templateName = name.split("-").map(upperFirst).join("");
  const templatePath = path.resolve(__dirname, "../../template/service");
  const outputPath = path.resolve(process.cwd(), name);
  if (fs.existsSync(outputPath)) {
    console.log(`${templateName.bold}已经存在, 创建失败`.yellow);
    return;
  }
  await fse.copy(templatePath, outputPath);
  const templateFiles = await fsreaddir(outputPath);

  const { service, types } = await parserer(templateName);

  each(templateFiles, function (file) {
    const filePath = path.resolve(outputPath, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const newFileContent = fileContent
      .replace(/\<%name%\>/gm, templateName)
      .replace(/\<%service%\>/gm, service)
      .replace(/\<%types%\>/gm, types);
    fs.writeFileSync(filePath, newFileContent);
  });
  console.log(`创建成功 [${templateName.bold}]`.green);
  return;
};

module.exports = {
  [`创建 React 组件库`]: createComponent,
  [`创建请求服务`]: createService,
};
