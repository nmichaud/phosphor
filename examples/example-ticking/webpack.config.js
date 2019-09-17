var path = require('path');

module.exports = {
  entry: './build/index.js',
  output: {
    path: __dirname + '/dist/',
    filename: 'bundle.example.js',
    publicPath: './dist/'
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(svg)$/, use: 'url-loader?limit=100000' },
      { test: /\.png$/, use: 'file-loader' }
    ]
  }
};
