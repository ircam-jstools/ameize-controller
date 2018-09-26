import { ipcMain } from 'electron';
import { exec, execSync } from 'child_process';
import watch from 'watch';
import debounce from 'lodash.debounce';

const USER_NAME = 'pi';

const manageDevices = {
  // reuse udpServer connection from discoveryServer to send commands to clients
  initialize(mainWindow, udpServer) {
    this.mainWindow = mainWindow;
    this.udpServer = udpServer;

    this.watchInfos = {
      monitor: null,
      tokens: null,
    };

    this.dispatch = this.dispatch.bind(this);
    this.executeCmd = this.executeCmd.bind(this);
    this.forkProcess = this.forkProcess.bind(this);
    this.killProcess = this.killProcess.bind(this);
    this.syncDirectory = this.syncDirectory.bind(this);
    this.startWatchingDirectory = this.startWatchingDirectory.bind(this);
    this.stopWatchingDirectory = this.stopWatchingDirectory.bind(this);

    ipcMain.on('devices:execute-cmd', this.executeCmd);
    ipcMain.on('devices:fork-process', this.forkProcess);
    ipcMain.on('devices:kill-process', this.killProcess);
    ipcMain.on('devices:sync-directory', this.syncDirectory);
    ipcMain.on('devices:start-watching-directory', this.startWatchingDirectory);
    ipcMain.on('devices:stop-watching-directory', this.stopWatchingDirectory);

    // receive only message that do not match the discovery protocol
    this.udpServer.addListener('message', this.dispatch);
  },

  dispatch(buffer, rinfo) {
    const msg = buffer.toString().split(' ');
    const protocol = msg.shift();

    switch (protocol) {
      // console stuff
      case 'STDOUT': {
        const log = msg.join(' ');

        if (log.trim() !== '')
          this.mainWindow.webContents.send('device:stdout', rinfo, log);

        break;
      }
      case 'STDERR': {
        const log = msg.join(' ');

        if (log.trim() !== '')
          this.mainWindow.webContents.send('device:stderr', rinfo, log);

        break;
      }

      // commands
      case 'EXEC_ACK': {
        const tokenUuid = msg.shift();
        this.mainWindow.webContents.send('device:clear-token', tokenUuid);
        break;
      }
      case 'FORK_ACK': {
        const forkTokenUuid = msg.shift();

        this.mainWindow.webContents.send('device:set-token-status', forkTokenUuid, 'running');
        break;
      }
      case 'KILL_ACK': {
        const killTokenUuid = msg.shift();
        const forkTokenUuid = msg.shift();

        this.mainWindow.webContents.send('device:clear-token', killTokenUuid);
        this.mainWindow.webContents.send('device:clear-token', forkTokenUuid);
        break;
      }
    }

  },

  sendLog(type, log) {
    this.mainWindow.webContents.send('device:log', type, log);
  },

  executeCmd(event, cwd, cmd, tokens) {
    cwd = cwd.trim() === '' ? '~/' : cwd; // default to user $HOME

    tokens.forEach(token => {
      const { port, address } = token.client.rinfo;
      const msg = `EXEC ${token.uuid} ${cwd} ${cmd}`;

      this.udpServer.send(msg, port, address);
    });
  },

  forkProcess(event, cwd, cmd, tokens) {
    cwd = cwd.trim() === '' ? '~/' : cwd; // default to user $HOME

    tokens.forEach(token => {
      const { port, address } = token.client.rinfo;
      const msg = `FORK ${token.uuid} ${cwd} ${cmd}`;

      this.udpServer.send(msg, port, address);
    });
  },

  killProcess(event, tokens) {
    tokens.forEach(token => {
      const { port, address } = token.client.rinfo;
      const msg = `KILL ${token.uuid}`;

      this.udpServer.send(msg, port, address);
    });
  },

  // @todo - use tokens to retrieve feedback to the front-end
  syncDirectory(event, localDirectory, remoteDirectory, tokens, clearTokens = true) {
    tokens.forEach(token => {
      const { hostname } = token.client.payload;
      let cmd = '';

      if (/debug/.test(hostname)) { // we are in debug mode
        cmd = `rsync --archive --exclude="node_modules" --delete-after ${localDirectory}/ ${remoteDirectory}`;
      } else {
        // rsync -e ssh -avz --delete-after "/home/source\ avec\ espace/" user@ip_du_serveur:"/dossier/destination\ avec\ espace/"
        cmd = `rsync --archive --exclude="node_modules" --delete-after ${localDirectory}/ pi@${hostname}.local:${remoteDirectory}`;
      }

      exec(cmd, (err, stdout, stderr) => {
        if (err)
          return console.error(err);

        console.log(stdout.toString());
        console.log(stderr.toString());

        // token has { address, port } has rinfo does
        const msg = `"${remoteDirectory}" successfully synchronized\n`;
        this.mainWindow.webContents.send('device:stdout', token.client.rinfo, msg);

        if (clearTokens)
          this.mainWindow.webContents.send('device:clear-token', token.uuid);
      });
    });
  },

  startWatchingDirectory(event, localDirectory, remoteDirectory, tokens) {
    const watchOptions = {
      ignoreDotFiles: true,
      ignoreUnreadableDir: true,
      ignoreNotPermitted: true,
      ignoreDirectoryPattern: /node_modules/,
      interval: 1,
    };

    watch.createMonitor(localDirectory, Object.assign({}, watchOptions), monitor => {
      this.watchInfos.monitor = monitor;
      this.watchInfos.tokens = tokens;

      // @note - try to delay to account for transpile time
      // this doesn't work because transpile is itself delayed by watch...
      // see if it creates problems in real situations
      const sync = debounce(() => {
        this.syncDirectory(event, localDirectory, remoteDirectory, tokens, false);
      }, 100);

      monitor.on('created', sync);
      monitor.on('changed', sync);
      monitor.on('removed', sync);

      tokens.forEach(token => {
        this.mainWindow.webContents.send('device:set-token-status', token.uuid, 'watching');
      });
    });
  },

  stopWatchingDirectory(event) {
    this.watchInfos.monitor.stop();

    this.watchInfos.tokens.forEach(token => {
      this.mainWindow.webContents.send('device:clear-token', token.uuid);
    });

    this.watchInfos.monitor = null;
    this.watchInfos.tokens = null;
  },
};

export default manageDevices;
