import { ipcMain } from 'electron';
import { exec, execSync } from 'child_process';
import watch from 'watch';
import debounce from 'lodash.debounce';
import split from 'split';

const clientInfosMap = new Map();
const hostnameClientMap = new Map();

const MSG_DELIMITER = 'AMEIZE_MSG_DELIMITER_$352NS0lAZL&';

const manageDevices = {
  initialize(mainWindow, tcpServer) {
    this.mainWindow = mainWindow;
    this.tcpServer = tcpServer;

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

    // handle communications with remote clients
    this.tcpServer.on('connection', (client) => {
      client.pipe(split(MSG_DELIMITER, null, { trailing: false })).on('data', data => {
        if (data) {
          // console.log(`"--------------------------------------"`);
          // console.log(`"${data}"`);
          // console.log(`"--------------------------------------"`);
          let type;
          let payload;

          try {
            const json = JSON.parse(data);
            type = json.type;
            payload = json.payload;
          } catch(err) {
            console.log(err);
            console.log(data.toString());
            return;
          }

          if (type === 'HANDSHAKE') {
            const infos = {
              address: client.remoteAddress,
              port: client.remotePort,
              family: client.remoteFamily,
              hostname: payload.hostname,
            };

            clientInfosMap.set(client, infos);
            hostnameClientMap.set(infos.hostname, client);

            mainWindow.webContents.send('client:connect', infos);
          } else {
            this.dispatch(client, type, payload);
          }
        }
      });

      client.on('close', () => { /* console.log('socket close'); */ });
      client.on('error', () => { /* console.log('socket error'); */ });
      client.on('end', () => { /* console.log('socket end'); */ });
      client.on('timeout', () => { /* console.log('socket timeout'); */ });

      // delete client and notify main window
      // @note - if the client disconnect abruptely, this will only get after
      // after the server tries to send new message and fails
      client.on('close', () => {
        const infos = clientInfosMap.get(client);
        mainWindow.webContents.send('client:disconnect', infos);

        clientInfosMap.delete(client);
        hostnameClientMap.delete(infos.hostname);
      });
    });

  },

  dispatch(client, type, payload) {
    const infos = clientInfosMap.get(client);

    switch (type) {
      // console stuff
      case 'STDOUT': {
        const { msg } = payload;
        this.mainWindow.webContents.send('device:stdout', infos, msg);
        break;
      }
      case 'STDERR': {
        const { msg } = payload;
        this.mainWindow.webContents.send('device:stderr', infos, msg);
        break;
      }
      // commands
      case 'EXEC_ACK': {
        const { tokenUuid } = payload;
        this.mainWindow.webContents.send('device:clear-token', tokenUuid);
        break;
      }
      case 'FORK_ACK': {
        const { forkTokenUuid } = payload;
        this.mainWindow.webContents.send('device:set-token-status', forkTokenUuid, 'running');
        break;
      }
      case 'KILL_ACK': {
        const { killTokenUuid, forkTokenUuid } = payload;
        this.mainWindow.webContents.send('device:clear-token', killTokenUuid);
        this.mainWindow.webContents.send('device:clear-token', forkTokenUuid);
        break;
      }
    }

  },

  executeCmd(event, cwd, cmd, tokens) {
    // @note - review that, probably does not work
    cwd = cwd.trim() === '' ? '~/' : cwd; // default to user $HOME

    tokens.forEach(token => {
      const client = hostnameClientMap.get(token.client.hostname);
      const req = {
        type: 'EXEC',
        payload: {
          cwd: cwd,
          cmd: cmd,
          tokenUuid: token.uuid,
        },
      };

      client.write(JSON.stringify(req) + MSG_DELIMITER);
    });
  },

  forkProcess(event, cwd, cmd, tokens) {
    cwd = cwd.trim() === '' ? '~/' : cwd; // default to user $HOME

    tokens.forEach(token => {
      const client = hostnameClientMap.get(token.client.hostname);
      const req = {
        type: 'FORK',
        payload: {
          cwd: cwd,
          cmd: cmd,
          tokenUuid: token.uuid,
        },
      };

      client.write(JSON.stringify(req) + MSG_DELIMITER);
    });
  },

  killProcess(event, tokens) {
    tokens.forEach(token => {
      const client = hostnameClientMap.get(token.client.hostname);
      const req = {
        type: 'KILL',
        payload: {
          tokenUuid: token.uuid,
        },
      };

      client.write(JSON.stringify(req) + MSG_DELIMITER);
    });
  },

  // @todo - use tokens to retrieve feedback to the front-end
  syncDirectory(event, localDirectory, remoteDirectory, tokens, clearTokens = true) {
    tokens.forEach(token => {
      const { hostname } = token.client;

      let destinationDirectory = '';
      // we are in debug mode with locally emulated devices
      if (/debug/.test(hostname)) {
        destinationDirectory = remoteDirectory;
      } else {
        destinationDirectory = `pi@${hostname}.local:${remoteDirectory}`;
      }

      const cmd = `rsync --rsync-path='mkdir -p "${remoteDirectory}" && rsync'`
            + ` --archive --exclude="node_modules" --delete-after`
            + ` "${localDirectory}/" "${destinationDirectory}"`;

      // console.log('cmd: ', cmd);

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          return console.error('Error: ', err);
        }

        // console.log('stdout: ', stdout.toString());
        // console.log('stderr; ', stderr.toString());

        // token has { address, port } has rinfo does
        const msg = `"${remoteDirectory}" successfully synchronized\n`;
        this.mainWindow.webContents.send('device:stdout', token.client, msg);

        if (clearTokens) {
          this.mainWindow.webContents.send('device:clear-token', token.uuid);
        }
      });
    });
  },

  // token system is absurd here
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
