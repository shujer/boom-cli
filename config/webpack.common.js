"use strict";
const path = require("path");

const config = {
  entry: path.resolve(__dirname, "../src/entry.js"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    publicPath: "/dist/",
    filename: "main.js",
  },
};

module.exports = config;
