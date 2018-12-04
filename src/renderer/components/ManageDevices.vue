<template>
  <div id="manage-devices">
    <div class="commands">
      <h1>Manage Devices</h1>

      <h3>Execute Command</h3>
      <label>
        <span>cmd</span>
        <input type="text" v-model="execCmd" @blur="saveCommands" />
      </label>
      <label>
        <span>cwd</span>
        <input type="text" v-model="execCwd" @blur="saveCommands" />
      </label>
      <button class="btn" @click="executeCmd">execute</button>

      <h3>Fork Process</h3>
      <label>
        <span>cwd</span>
        <input type="text" v-model="processCwd" @blur="saveCommands" />
      </label>
      <label>
        <span>cmd</span>
        <input type="text" v-model="processCmd" @blur="saveCommands" />
      </label>
      <button class="btn blue" v-if="!processForked" @click="forkProcess">fork</button>
      <button class="btn red" v-if="processForked" @click="killProcess">kill</button>

      <h3>Sync Directory</h3>

      <label>
        <span>local</span>
        <input type="text" v-model="syncLocal" />
      </label>
      <label>
        <span>remote<br />(/home/pi/apps)</span>
        <input type="text" v-model="syncRemote" @blur="saveCommands" />
      </label>
      <button class="btn" @click="syncDirectory">sync</button>
      <button class="btn blue" v-if="!directoryWatched" @click="startWatchingDirectory">watch</button>
      <button class="btn red" v-if="directoryWatched" @click="stopWatchingDirectory">stop</button>
    </div>

    <div class="client-list" :style="clientListStyles">
      <h3>client list</h3>
      <ul>
        <li class="client" v-for="status in clientStatuses">
          <div class="connection" v-bind:class="{ active : status.connected }">&nbsp;</div>
          <p>{{ status.hostname }} ({{ status.address }}:{{ status.port }})
            {{ status.syncing ? 'syncing' : '' }}
            {{ status.watching ? 'watching' : '' }}
            {{ status.forked ? 'forked' : '' }}
            {{ status.executing ? 'executing' : '' }}
          </p>
        </li>
      </ul>
    </div>

  </div>
</template>

<script>
  import uuid from 'uuid/v4';

  function createToken(type, client) {
    return {
      uuid: uuid(),
      type: type,
      client: client,
      status: '',
    };
  }

  export default {
    name: 'manage-devices',
    components: {},
    data: function() {
      return {
        execCmd: this.$store.getters['commands/execCmd'],
        execCwd: this.$store.getters['commands/execCwd'],
        processCwd: this.$store.getters['commands/processCwd'],
        processCmd: this.$store.getters['commands/processCmd'],
        syncLocal: this.$store.getters['commands/syncLocal'],
        syncRemote: this.$store.getters['commands/syncRemote'],

        clients: this.$store.getters['clients/all'],
        tokens: this.$store.getters['clients/tokens'],

        commandsHeight: 0,
        containerHeight: 0,
      };
    },

    computed: {
      processForked() {
        const tokens = this.$store.getters['clients/tokens'];
        const t = tokens.find(token => token.type === 'fork-process' && token.status === 'running');

        return !!t;
      },
      directoryWatched() {
        const tokens = this.$store.getters['clients/tokens'];
        const t = tokens.find(token => token.type === 'watch-directory' && token.status === 'watching');

        return !!t;
      },
      clientListStyles() {
        const windowSize = this.$store.getters['app/getComponentSize']('window');
        const menuSize = this.$store.getters['app/getComponentSize']('main-menu');
        let menuHeight = 0;
        // menu size is defined when menu is mounted later
        if (menuSize)
          menuHeight = menuSize.height;

        const clientListHeight = windowSize.height - menuHeight - this.commandsHeight;
        return `height: ${clientListHeight}px;`;
      },
      clientStatuses() {
        const clients = this.$store.getters['clients/all'];
        const tokens = this.$store.getters['clients/tokens'];
        const statuses = clients.map( (client) => {
          const status = Object.assign({}, client);

          status.syncing = (undefined !== tokens.find(token => {
            return (token.client.hostname === client.hostname
                    && token.type === 'sync-directory')
                    // empty status
          }));

          status.watching = (undefined !== tokens.find(token => {
            return (token.client.hostname === client.hostname
                    && token.type === 'watch-directory'
                    && token.status === 'watching')
          }));

          status.forked = (undefined !== tokens.find(token => {
            return (token.client.hostname === client.hostname
                    && token.type === 'fork-process'
                    && token.status === 'running')
          }));

          status.executing = (undefined !== tokens.find(token => {
            return (token.client.hostname === client.hostname
                    && token.type === 'execute-cmd')
                    // empty status
          }));

          return status;
        }); // clients

        return statuses;
      }
    },

    mounted() {
      const $commands = this.$el.querySelector('.commands');
      this.commandsHeight = $commands.getBoundingClientRect().height;
    },

    updated() {
      const $commands = this.$el.querySelector('.commands');
      this.commandsHeight = $commands.getBoundingClientRect().height;
    },

    methods: {
      executeCmd() {
        this.saveCommands();

        const connectedClients = this.$store.getters['clients/connected'];

        const tokens = connectedClients.map(client => createToken('execute-cmd', client));
        this.$store.dispatch('clients/addTokens', tokens);

        this.$electron.ipcRenderer.send('devices:execute-cmd', this.execCwd, this.execCmd, tokens);
      },

      forkProcess() {
        this.saveCommands();
        const connectedClients = this.$store.getters['clients/connected'];

        const tokens = connectedClients.map(client => createToken('fork-process', client));
        this.$store.dispatch('clients/addTokens', tokens);

        this.$electron.ipcRenderer.send('devices:fork-process', this.processCwd, this.processCmd, tokens);
      },
      killProcess() {
        this.saveCommands();
        const connectedClients = this.$store.getters['clients/connected'];

        const tokens = connectedClients.map(client => createToken('fork-process', client));
        this.$store.dispatch('clients/addTokens', tokens);

        this.$electron.ipcRenderer.send('devices:kill-process', tokens);
      },
      syncDirectory() {
        this.saveCommands();
        const connectedClients = this.$store.getters['clients/connected'];

        const tokens = connectedClients.map(client => createToken('sync-directory', client));
        this.$store.dispatch('clients/addTokens', tokens);

        this.$electron.ipcRenderer.send('devices:sync-directory', this.syncLocal, this.syncRemote, tokens);
      },
      startWatchingDirectory() {
        this.saveCommands();
        const connectedClients = this.$store.getters['clients/connected'];

        const tokens = connectedClients.map(client => createToken('watch-directory', client));
        this.$store.dispatch('clients/addTokens', tokens);

        this.$electron.ipcRenderer.send('devices:start-watching-directory', this.syncLocal, this.syncRemote, tokens);
      },
      stopWatchingDirectory() {
        this.saveCommands();
        this.$electron.ipcRenderer.send('devices:stop-watching-directory');
      },

      saveCommands() {
        const values = {
          execCwd: this.execCwd,
          execCmd: this.execCmd,
          processCwd: this.processCwd,
          processCmd: this.processCmd,
          syncLocal: this.syncLocal,
          syncRemote: this.syncRemote,
        };

        this.$store.dispatch('commands/update', values);
      }
    }
  };
</script>

<style scoped>
  /* @todo - use fork and sync in presentation/icons directory */

  ul {
    list-style-type: none;
    padding: 0;
  }

  li.client {
    margin-bottom: 8px;
    vertical-align: middle;
  }

  .client .connection {
    display: inline-block;
    width: 20px;
    height: 20px;
    background-color: #d9534f;
    text-content: " ";
    position: relative;
    top: -2px;
    border-radius: 50%;
  }

  .client .connection.active {
    background-color: #5cb85c;
  }

  .client p {
    display: inline-block;
    height: 20px;
    margin: 0;
  }
</style>






























