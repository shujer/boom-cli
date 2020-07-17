const Webpack = require("webpack");
const baseWebpackConfig = require("../../config/webpack.common");
const prodWebpackConfig = require("../../config/webpack.prod");
const merge = require("webpack-merge");
const webpackConfig = merge(baseWebpackConfig, prodWebpackConfig);
const compiler = Webpack(webpackConfig);
const run = () => {
  compiler.run((err, stats) => {
    if (err) {
      throw err;
    }
    if (stats.hasErrors()) {
      console.log("[boom-cli]", stats.toString());
    }
    process.stdout.write(
      stats.toString({
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
      }) + "\n\n"
    );
  });
};

module.exports = run;
