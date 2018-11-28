import { app, BrowserWindow } from 'electron' // eslint-disable-line
import terminate from 'terminate';
import { DiscoveryServer } from '@ircam/node-discovery';

import emulateDevices from './controllers/emulate-devices';
import manageDevices from './controllers/manage-devices';
import net from 'net';

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\') // eslint-disable-line
}

let mainWindow;
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`;


// instanciate discovery server
const TCP_PORT = 8091;
const discoveryServer = new DiscoveryServer({ verbose: false });
const tcpServer = net.createServer().on('error', err => console.error(err.stack));

// start servers once everything ready
function startServers(mainWindow) {
  tcpServer.listen(TCP_PORT, () => {
    discoveryServer.start();
    console.log('> Discovery server started');
    console.log('> TCP server started', tcpServer.address());
  });
}


function createWindow() {
  // Initial window options
  mainWindow = new BrowserWindow({ useContentSize: true });
  mainWindow.maximize();
  mainWindow.loadURL(winURL);

  mainWindow.on('closed', () => {
    app.quit();
    mainWindow = null;
  });

  mainWindow.once('show', () => {
    console.log('> Window show');
    // everything ready on the windows side, start the servers
    // @note - looks still not completely reliable when the app chashed...
    // @note - poorman fix, sometime the socket seems properly opened but but
    // broadcasted to the main window
    setTimeout(() => {
      startServers();
    }, 2000);
  });

  // init services
  emulateDevices.initialize();
  manageDevices.initialize(mainWindow, tcpServer);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') app.quit();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

const exitHandler = () => {
  try {
    discoveryServer.stop();
    tcpServer.close();
    terminate(process.pid);
  } catch (error) {
    // do not throw any more
    // console.log('exit catch: ', error);
  }
};

app.on('before-quit', () => exitHandler() );

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
*/
