<template>
  <div id="menu">
    <ul>
      <li class="btn"><router-link to="/manage-devices">Manage devices</router-link></li>
      <li class="btn"><router-link to="/emulate-devices">Emulate devices</router-link></li>
    </ul>

    <button class="btn show-console" @click="toggleConsole">Console</button>
  </div>
</template>

<script>
  const id = 'main-menu';

  export default {
    name: id,

    methods: {
      toggleConsole() {
        const showConsole = this.$store.getters['app/getGuiState']('showConsole');
        this.$store.dispatch('app/setGuiState', { key: 'showConsole', value: !showConsole });
      },
    },

    mounted() {
      const { width, height } = this.$el.getBoundingClientRect();
      this.$store.dispatch('app/setComponentSize', { id, width, height });
    },
  };
</script>

<style scoped>
  #menu {
    background-color: #cdcdcd;
    border-bottom: 1px solid #ababab;
    padding: 20px;
    position: relative;
    z-index: 1;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }

  li {
    padding: 0;
    display: inline-block;
  }

  .btn {
    width: 300px;
  }

  .btn.show-console {
    background-color: orange;
    position: absolute;
    top: 20px;
    right: 20px;
    width: 80px;
  }
</style>
