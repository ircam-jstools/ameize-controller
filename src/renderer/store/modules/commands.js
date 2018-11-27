// const fs = require('fs')
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const dbDirectory = path.join(cwd, 'db');

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory);
}

const state = {
  // emulate devices
  applicationPath: '/Users/some-user/dev/lib/ameize-client',
  applicationCmd: './dist/index.js start --debug',
  // manage devices
  execCmd: 'ls -al',
  execCwd: '/home/pi',

  processCwd: '/home/pi/apps/some-directory',
  processCmd: 'npm run watch:execute',

  syncLocal: '/Users/some-user/dev/some-directory/',
  syncRemote: '/home/pi/apps/some-directory/',
};

const db = path.join(dbDirectory, 'commands.json');
// init state from db file
if (fs.existsSync(db)) {
  const data = fs.readFileSync(db);
  const values = JSON.parse(data.toString());

  for (let name in values) {
    if (state[name]) {
      state[name] = values[name];
    }
  }
}

const mutations = {
  UPDATE(state, values) {
    for (let name in values) {
      if (name in state) {
        state[name] = values[name];
      }
    }

    fs.writeFileSync(db, JSON.stringify(state, null, 2));
  },
};


const actions =  {
  update({ state, commit }, values) {
    commit('UPDATE', values);
  }
};

const getters = {
  applicationPath(state) { return state.applicationPath; },
  applicationCmd(state) { return state.applicationCmd; },
  execCmd(state) { return state.execCmd; },
  execCwd(state) { return state.execCwd; },
  processCwd(state) { return state.processCwd; },
  processCmd(state) { return state.processCmd; },
  syncLocal(state) { return state.syncLocal; },
  syncRemote(state) { return state.syncRemote; },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
