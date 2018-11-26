'use strict'

const chalk = require('chalk')
const electron = require('electron')
const path = require('path')
const { say } = require('cfonts')
const { spawn } = require('child_process')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const webpackHotMiddleware = require('webpack-hot-middleware')

const mainConfig = require('./webpack.main.config')
const rendererConfig = require('./webpack.renderer.config')

let electronProcess = null
let manualRestart = false
let hotMiddleware

function logStats(proc, data) {
  let log = ''

  log += chalk.yellow(`${proc} Process\n`)

  if (typeof data === 'object') {
    data.toString({
      colors: true,
      chunks: false
    }).split(/\r?\n/).forEach(line => {
      log += '  ' + line + '\n'
    })
  } else {
    log += `  ${data}\n`
  }

  console.log(log);
}

function startRenderer() {
  return new Promise((resolve, reject) => {
    rendererConfig.entry.renderer = [path.join(__dirname, 'dev-client')].concat(rendererConfig.entry.renderer)

    const compiler = webpack(rendererConfig)
    hotMiddleware = webpackHotMiddleware(compiler, {
      log: false,
      heartbeat: 2500
    });

    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-after-emit', (data, cb) => {
        hotMiddleware.publish({ action: 'reload' })
        cb()
      });
    });

    compiler.plugin('done', stats => {
      logStats('Renderer', stats)
    });

    const server = new WebpackDevServer(
      compiler,
      {
        contentBase: path.join(__dirname, '../'),
        quiet: true,
        before (app, ctx) {
          app.use(hotMiddleware)
          ctx.middleware.waitUntilValid(() => {
            resolve()
          })
        }
      }
    )

    server.listen(9080)
  })
}

function startMain() {
  return new Promise((resolve, reject) => {
    mainConfig.entry.main = [path.join(__dirname, '../src/main/index.dev.js')].concat(mainConfig.entry.main)

    const compiler = webpack(mainConfig)

    compiler.plugin('watch-run', (compilation, done) => {
      logStats('Main', 'compiling...')
      hotMiddleware.publish({ action: 'compiling' })
      done()
    })

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(err);
        return
      }

      logStats('Main', stats);

      if (electronProcess && electronProcess.kill) {
        manualRestart = true;
        process.kill(electronProcess.pid);
        electronProcess = null;
        startElectron();

        setTimeout(() => {
          manualRestart = false
        }, 5000);
      }

      resolve()
    })
  })
}

function startElectron() {
  electronProcess = spawn(electron, ['--inspect=5858', path.join(__dirname, '../dist/electron/main.js')])

  electronProcess.stdout.on('data', data => electronLog(data));
  electronProcess.stderr.on('data', data => electronLog(data, 'red'));

  electronProcess.on('close', () => {
    if (!manualRestart) {
      process.exit();
    }
  });
}

function electronLog(data, color) {
  let log = ''
  log = data.toString().split(/\r?\n/).filter(d => d.trim() !== '').join('\n');

  if (/[0-9A-z]+/.test(log)) {
    if (color) {
      console.log(chalk[color](log));
    } else {
      console.log(log);
    }
  }
}

function init() {
  Promise.all([startRenderer(), startMain()])
    .then(() => {
      startElectron()
    })
    .catch(err => {
      console.error(err)
    })
}

init()
