const Webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const baseWebpackConfig = require("../../config/webpack.common");
const devWebpackConfig = require("../../config/webpack.dev");
const merge = require("webpack-merge");
// merge plugin

const webpackConfig = merge(baseWebpackConfig, devWebpackConfig);

const run = () => {
  const compiler = Webpack(webpackConfig);
  const devServer = new WebpackDevServer(compiler, baseWebpackConfig.devServer);
  devServer.listen(8080, "localhost", () => {
    console.log("[boom-cli] Starting server on http://localhost:8080");
  });
};

module.exports = run;
