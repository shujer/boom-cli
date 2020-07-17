/**
 * 解析 swaggerApi.json 文件
 * 用于培优Boss项目，在当前目录下生成 domain 文件
 */
const fs = require("fs");
const path = require("path");

const TypeMap = {
  String: "string",
  int: "number",
  Integer: "number",
  Date: "string",
  Long: "string",
  object: "object",
  boolean: "boolean",
  array: "Array<T>",
  Response: "object",
  Boolean: "boolean",
};

const fsreadFile = fs.readFileSync;
const fswriteFile = function (path, data, flag = "w") {
  const fsOpen = fs.openSync(path, flag);
  fs.writeSync(fsOpen, data);
};
const fsmkdir = function (_path, callback) {
  if (fs.existsSync(_path)) {
    console.error("当前目录下已有同名文件夹！");
  } else {
    fs.mkdirSync(_path);
    callback();
  }
};

/**
 * 递归地解析对象文件
 * @param {Object} obj
 * @returns {{type: String; description: String; data?: any}} obj
 */
function getTsObject(json) {
  const type = TypeMap[json.type];
  const description = json.description;
  if (json.type === "array") {
    if (!json.items) {
      return { type: "array", description };
    } else {
      return { type: "array", description, data: getTsObject(json.items) };
    }
  } else if (json.type === "object") {
    if (!json.properties) {
      return { type: "object", description };
    } else {
      let data = Object.keys(json.properties).reduce((prev, cur) => {
        return {
          ...prev,
          [cur]: getTsObject(json.properties[cur]),
        };
      }, {});
      return { type, description, data };
    }
  } else {
    return { type, description };
  }
}

/**
 * 将 上一步 得到的对象解析为 ts 文件
 * @param {Object} obj
 * @returns {String} str
 */
function transferTsObj(obj, option) {
  if (!obj) return "";
  const { type, data } = obj;
  if (type === "object") {
    if (!data) return TypeMap[type];
    return `{${Object.keys(data).reduce((prev, key) => {
      let desc = data[key].description
        ? `\/* ${data[key].description} */\n`
        : "";
      return `${prev}\n${desc}${key}${option ? "?" : ""}: ${transferTsObj(
        data[key],
        option
      )};`;
    }, "")}}`;
  } else if (type === "array") {
    if (!data) return TypeMap[type];
    return `${transferTsObj(data, option)}[]`;
  } else {
    return type;
  }
}

/**
 * 将字符串转化为驼峰
 * @param {String} str
 */
function toHump(str = "") {
  return str.length ? str[0].toUpperCase().concat(str.slice(1)) : "";
}

/**
 * 将驼峰字符串转化为普通字符串
 * @param {String} str
 */
function toNormal(str = "") {
  return str.length ? str[0].toLowerCase().concat(str.slice(1)) : "";
}

/**
 * 根据路径生成名字
 * @param {String} path
 */
function generateTypeName(path) {
  let arr = path.split("/").filter((v) => !!v);
  return arr
    .slice(Math.max(0, arr.length - 2), arr.length)
    .map((str) => toHump(str))
    .join("");
}

/**
 * 生成 ts 类型文件
 */
function generateType(paths, path, method, typeName) {
  let obj = paths[path][method];
  let request_raw =
    obj.parameters[0] && obj.parameters[0].schema && obj.parameters[0].schema
      ? obj.parameters[0].schema
      : {};
  let response_raw =
    obj.responses &&
    obj.responses["200"] &&
    obj.responses["200"].schema &&
    obj.responses["200"].schema
      ? obj.responses["200"].schema
      : {};
  let request = getTsObject(request_raw);
  let response = getTsObject(response_raw);
  let requestStr = transferTsObj(request, true);
  let responseStr = transferTsObj(response.data.data);
  return `export type ${typeName}Request = ${requestStr};\n\nexport type ${typeName}Response = ${responseStr}\n\n`;
}

/**
 * 生成用例文件
 * @param {String} typeName
 * @param {String} moduleName
 */
function generateUseCase(typeName, moduleName) {
  let requestName = toNormal(typeName);
  return `\n${requestName}: (params: types.${typeName}Request) => {
    return ${moduleName}Repo.${requestName}(params);
  },`;
}

/**
 * 生成请求文件
 * @param {String} path
 * @param {String} method
 * @param {String} typeName
 */
function generateRepo(path, method, typeName) {
  let requestName = toNormal(typeName);
  return `\n${requestName}: (params: types.${typeName}Request) => {
    return request.${method}<types.${typeName}Response>(
      '${path}',
      params
    );
  },`;
}

/**
 * 生成表格 Columns
 */
function generateColumns() {}

/**
 * 开始解析
 * @param {Object} paths
 * @param {Array<String>} apis
 * @param {String} name
 */
function generate(paths, apis, name = "") {
  let tsTypeResult = "";
  let repoResult = "";
  let usecaseResult = "";
  let moduleName = toHump(name);
  apis.forEach((path) => {
    if (!paths[path]) {
      new Error(`can not find api: ${path}`);
    }
    let method = Object.keys(paths[path])[0];
    let typeName = generateTypeName(path);
    tsTypeResult = tsTypeResult.concat(
      generateType(paths, path, method, typeName)
    );
    repoResult = repoResult.concat(generateRepo(path, method, typeName));
    usecaseResult = usecaseResult.concat(generateUseCase(typeName, moduleName));
  });
  return {
    index: `import { ${moduleName}Usecase } from './usecase';\nexport { ${moduleName}Usecase };`,
    type: tsTypeResult,
    repo: `import * as types from "./types";\nexport const ${moduleName}Repo = {${repoResult}};`,
    usecase: `import { ${moduleName}Repo } from "./repo";\nimport * as types from "./types";\nexport const ${moduleName}Usecase = {${usecaseResult}};`,
  };
}

/**
 * 入口，解析文件并写入
 */
function create(moduleName, inputPath) {
  const source = fsreadFile(path.resolve(__dirname, "./config.json"), "utf-8");
  const config = JSON.parse(source);
  const outputPath = moduleName || config.output.path;
  const data = inputPath
    ? fsreadFile(inputPath, "utf-8")
    : fsreadFile(path.resolve(__dirname, config.input.path), "utf-8");
  const paths = JSON.parse(data).paths;
  const result = generate(paths, config.apis, moduleName || config.output.name);
  fsmkdir(outputPath, function () {
    fswriteFile(path.resolve(outputPath, "types.ts"), result.type);
    fswriteFile(path.resolve(outputPath, "usecase.ts"), result.usecase);
    fswriteFile(path.resolve(outputPath, "repo.ts"), result.repo);
    fswriteFile(path.resolve(outputPath, "index.ts"), result.index);
  });
}

module.exports = create;
