const fs = require("fs");
const path = require("path");
const util = require("util");
const { upperFirst } = require("lodash");

const fsreadFile = util.promisify(fs.readFile);

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
  return str.split("-").map(upperFirst).join("");
}

/**
 * 将驼峰字符串转化为普通字符串
 * @param {String} str
 */
function toNormal(str = "") {
  return str.length
    ? str[0].toLowerCase().concat(str.slice(1)).replace("-", "")
    : "";
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
    obj.responses && obj.responses["200"] && obj.responses["200"].schema
      ? obj.responses["200"].schema
      : {};
  let request = getTsObject(request_raw);
  let response = getTsObject(response_raw);
  let requestStr = transferTsObj(request, true);
  let responseStr = transferTsObj(response.data.data);
  return `export type ${typeName}Request = ${requestStr};\n\nexport type ${typeName}Response = ${responseStr}\n\n`;
}

/**
 * 生成请求文件
 * @param {String} path
 * @param {String} method
 * @param {String} typeName
 */
function generateService(path, method, typeName) {
  let requestName = toNormal(typeName);
  return `\n${requestName}: (params: types.${typeName}Request) => {
    return request.${method}<types.${typeName}Response>(
      '${path}',
      params
    );
  },`;
}

/**
 * 开始解析
 * @param {Object} paths
 * @param {Array<String>} apis
 * @param {String} name
 */
function parseSwagger(paths, apis) {
  let tsTypeResult = "";
  let repoResult = "";
  apis.forEach((path) => {
    if (!paths[path]) {
      console.warn(`can not find api: ${path}`);
      return;
    }
    let method = Object.keys(paths[path])[0];
    let typeName = generateTypeName(path);
    tsTypeResult = tsTypeResult.concat(
      generateType(paths, path, method, typeName)
    );
    repoResult = repoResult.concat(generateService(path, method, typeName));
  });
  return {
    types: tsTypeResult,
    service: `{\n${repoResult}\n}`,
  };
}

const defaultResult = { types: "", repo: `{\n\n}` };

/**
 * 输入模块名，驼峰写法
 * @param {string} moduleName
 */
async function start(moduleName) {
  // 运行命令的工作目录
  const entryPath = process.cwd();
  const sourcePath = path.resolve(entryPath, "./yapi_config.json");
  const swaggerApiPath = path.resolve(entryPath, "./swaggerApi.json");
  const existSource = fs.existsSync(sourcePath);
  const existData = fs.existsSync(swaggerApiPath);

  if (!existSource) {
    console.warn(
      `请初始化 api 配置文件到路径（内容：{ apis: Array<string> }）：${sourcePath}`
    );
  }
  if (!existData) {
    console.warn(`请导出 yapi 数据文件到路径：${swaggerApiPath}`);
  }
  if (existSource && existData) {
    // 配置文件
    const source = await fsreadFile(sourcePath);
    const config = JSON.parse(source);
    // 数据文件
    const data = await fsreadFile(swaggerApiPath, "utf-8");
    const paths = JSON.parse(data).paths;
    const result = parseSwagger(paths, config.apis);
    return result;
  }
  return defaultResult;
}

module.exports = start;
