import { ipcMain } from 'electron';
import fs from 'fs';
import { spawn } from 'child_process';

const instances = new Set();
const MAX_INSTANCES = 40;

const emulateDevices = {
  initialize() {
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    ipcMain.on('start-local:request', this.start);
    ipcMain.on('stop-local:request', this.stop);
  },

  start(event, appPath, cmdLine, numInstances) {
    this.stop(event);

    const errors = [];

    if (appPath === '' || !fs.existsSync(appPath))
      errors.push('Invalid Application Path');

    if (numInstances <= 0 || numInstances > MAX_INSTANCES)
      errors.push('Invalid Application Number');

    if (errors.length === 0) {
      for (let i = 0; i < numInstances; i++)
        this.createInstance(event, appPath, cmdLine, i);

      event.sender.send('start-local:ack');
    } else {
      event.sender.send('start-local:error', errors);
    }
  },

  stop(event) {
    instances.forEach(mock => mock.kill('SIGINT'));
    instances.clear();
    event.sender.send('stop-local:ack');
  },

  createInstance(event, appPath, cmdLine, id) {
    const parts = cmdLine.split(' ');
    const cmd = parts.shift();
    const argv = parts;
    const instance = spawn(cmd, argv, { cwd: appPath });

    // @todo - see if we prefer to launch a "pseudo" device instead
    // maybe just add an option with a checkbox...
    // if (!emulateDevice) {
      instance.stdout.on('data', data => {
        event.sender.send('device:stdout', id, data.toString());
      });

      instance.stderr.on('data', data => {
        event.sender.send('device:stderr', id, data.toString());
      });

      instance.on('close', (code, signal) => {
        event.sender.send('device:close', id, code, signal);
        instances.delete(instance);
      });

      instance.on('error', err => {
        event.sender.send('device:error', id, err);
        instances.delete(instance);
      });

    // }

    instances.add(instance);
  },
}

export default emulateDevices;
