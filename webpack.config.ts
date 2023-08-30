import * as path from 'path'
import * as fs from 'fs'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import * as webpack from 'webpack'

// get all view entrypoints
const views = fs.readdirSync(path.resolve(__dirname, 'source/views'))

const config: webpack.Configuration = {
  mode: 'production',
  entry: {
    app: path.resolve(__dirname, 'source/app.ts'),
    // reduce view entry points
    ...views.reduce(
      (output, viewFileName) =>
        viewFileName.split('.')[1] === 'ts'
          ? {
              ...output,
              [viewFileName.split('.')[0]]: path.resolve(__dirname, 'source/views', viewFileName),
            }
          : output,
      {}
    ),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(ttf)(\?[\s\S]+)?$/,
        loader: 'file-loader',
        options: { name: '[name].[ext]' },
      },
    ],
  },
}

export default config
