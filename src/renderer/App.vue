<template>
  <div id="app">
    <main-menu></main-menu>
    <div class="content">
      <router-view></router-view>
      <console v-if="showConsole"></console>
    </div>
  </div>
</template>

<script>
  import MainMenu from './components/MainMenu';
  import Console from './components/Console';

  export default {
    name: 'app',
    components: { MainMenu, Console },
    computed: {
      showConsole() { return this.$store.getters['app/getGuiState']('showConsole'); },
    },

    created: function() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.$store.dispatch('app/setComponentSize', { id: 'window', width, height });
      // handle clients connections
      this.$electron.ipcRenderer.on('client:connect', (event, client, clients) => {
        this.$store.dispatch('clients/add', client);
      });
      this.$electron.ipcRenderer.on('client:disconnect', (event, client, clients) => {
        this.$store.dispatch('clients/remove', client);
      });


      this.$electron.ipcRenderer.on('device:stdout', (event, rinfo, msg) => {
        // handle regular applications and ameize-clients
        const id = this.$store.getters['clients/idByRinfo'](rinfo) || rinfo;
        this.$store.dispatch('clients/createLog', { id, msg, type: 'log' });
      });

      this.$electron.ipcRenderer.on('device:stderr', (event, rinfo, msg) => {
        // handle regular applications and ameize-clients
        const id = this.$store.getters['clients/idByRinfo'](rinfo) || rinfo;
        this.$store.dispatch('clients/createLog', { id, msg, type: 'error' });
      });

      // this.$electron.ipcRenderer.on('device:close', (event, instanceIndex, code, signal) => {
      //   // @todo - something
      // });

      // this.$electron.ipcRenderer.on('device:error', (event, instanceIndex, err) => {
      //   // c@todo - something
      // });

      this.$electron.ipcRenderer.on('device:clear-token', (event, tokenUuid) => {
        this.$store.dispatch('clients/clearToken', tokenUuid);
      });

      this.$electron.ipcRenderer.on('device:set-token-status', (event, tokenUuid, status) => {
        this.$store.dispatch('clients/setTokenStatus', { uuid: tokenUuid, status });
      });
    },

    mounted() {
      const windowSize = this.$store.getters['app/getComponentSize']('window');
      const menuSize = this.$store.getters['app/getComponentSize']('main-menu');

      const $content = this.$el.querySelector('.content');
      const height = windowSize.height - menuSize.height;
      $content.style.height = `${height}px`;
    }
  };
</script>

<style>
  body, html {
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 62.5%;
  }

  #app {
    box-sizing: border-box;
    margin: 0;
    font-family: consolas, monospace;
    font-size: 1.4rem;
    height: 100vh;
    width: 100vw;
  }

  .content {
    padding: 20px;
    box-sizing: border-box;
    position: relative;
  }

  label {
    display: block;
    margin-bottom: 10px;
  }

  label span {
    display: inline-block;
    width: 160px;
  }

  input {
    padding: 4px 5px 2px 5px;
    border-radius: 2px;
    border: 1px solid #cdcdcd;
    font-family: consolas, monospace;
    font-size: 1.2rem;
  }

  input[type="text"] {
    width: 600px;
  }

  .btn {
    width: 120px;
    height: 30px;
    line-height: 30px;
    background-color: #242424;
    border-radius: 2px;
    border: none;
    color: white;
    font-family: consolas, monospace;
    font-size: 1.4rem;
  }

  .btn > * {
    color: white;
    display: block;
    text-align: center;
    text-decoration: none;
  }

  .btn.blue {
    background-color: #007bff;
  }

  .btn.red {
    background-color: #dc3545;
  }
</style>
