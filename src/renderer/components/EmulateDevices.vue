<template>
  <div id="emulate-devices">
    <system-information v-if="showSystemInformation"></system-information>

    <h1>Emulate Devices</h1>

    <label>
      <span># instances</span>
      <input type="number" v-model="numInstances" id="num-instances" min="0" max="20" />
    </label>
    <label>
      <span>application path</span>
      <input type="text" v-model="applicationPath" id="application-path" />
    </label>
    <label>
      <span>command</span>
      <input type="text" v-model="applicationCmd" id="applicationCmd" />
    </label>

    <p>> status: {{ this.status }}</p>
    <button class="btn" @click="start">Start</button>
    <button class="btn" @click="stop">Stop</button>
    <p class="error" v-for="error in errors">{{ error }}</p>
  </div>
</template>

<script>
  // import SystemInformation from './LandingPage/SystemInformation';

  export default {
    name: 'emulate-devices',
    components: {},
    data: function() {
      // create a dedicated store
      return {
        showSystemInformation: false,
        // move this to global state
        numInstances: 1,
        applicationPath: this.$store.getters['commands/applicationPath'],
        applicationCmd: this.$store.getters['commands/applicationCmd'],
        errors: [],
        status: 'idle', // started, stopped
      };
    },
    methods: {
      start() {
        this.saveCommands();
        this.errors = [];
        this.$store.dispatch('clients/clearLogs');

        this.$electron.ipcRenderer.send('start-local:request', this.applicationPath, this.applicationCmd, this.numInstances);
      },
      stop() {
        this.saveCommands();
        this.$electron.ipcRenderer.send('stop-local:request');
      },

      saveCommands() {
        const values = {
          applicationPath: this.applicationPath,
          applicationCmd: this.applicationCmd,
        };

        this.$store.dispatch('commands/update', values);
      },
    },

    created: function() {
      const component = this;

      this.$electron.ipcRenderer.on('start-local:error', (event, errors) => {
        component.errors = errors;
      });

      this.$electron.ipcRenderer.on('start-local:ack', (event) => {
        this.status = 'started';
      });

      this.$electron.ipcRenderer.on('stop-local:ack', event => {
        this.status = 'stopped';
      });
    },

    destroyed() {
      // console.log('destroyed');
      this.$electron.ipcRenderer.removeAllListeners('start-local:error');
      this.$electron.ipcRenderer.removeAllListeners('start-local:ack');
      this.$electron.ipcRenderer.removeAllListeners('stop-local:ack');
    }
  };
</script>

<style scoped>
  #emulate-devices {
    box-sizing: border-box;
  }

  p.error {
    margin-top: 10px;
    font-style: italic;
    color: red;
  }
</style>
