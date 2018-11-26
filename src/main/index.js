import { app, BrowserWindow } from 'electron' // eslint-disable-line
import terminate from 'terminate';
import { DiscoveryServer } from '@ircam/node-discovery';

import emulateDevices from './controllers/emulate-devices';
import manageDevices from './controllers/manage-devices';

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


const discoveryServer = new DiscoveryServer({ verbose: false });

function monitorClients(mainWindow) {
  discoveryServer.addListener('connection', (client, clients) => {
    client.id = client.payload.hostname;
    console.log('connected', client);
    mainWindow.webContents.send('client:connect', client);
  });

  discoveryServer.addListener('close', (client, clients) => {
    client.id = client.payload.hostname;
    console.log('disconnected')
    mainWindow.webContents.send('client:disconnect', client);
  });

  discoveryServer.start();
}



function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    useContentSize: true,
  });

  mainWindow.maximize();
  mainWindow.loadURL(winURL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  monitorClients(mainWindow);
  emulateDevices.initialize();
  manageDevices.initialize(mainWindow, discoveryServer);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null)
    createWindow();
});

app.on('will-quit', () => {
  console.log('quitting app...');
  discoveryServer.stop();
  terminate(process.pid);
});

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
