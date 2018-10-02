<template>
  <div id="console">
    <!-- <p class="filters">filters: {{ filters }}</p> -->
    <p class="filter-all" @click="filterAll">filter all</p>
    <p class="clear-logs" @click="clearLogs">clear</p>

    <div class="filter-controls">
      <label v-for="filter of logFilters">
        <input type="checkbox" :value="filter.id" v-model="filters">
          {{ filter.id }}
          <span v-if="filter.errors > 0">({{ filter.errors }})</span>
      </label>
    </div>

    <div class="log-control">Font size:
      <button class="log-size" @click="logFontSizeGrow">+</button>
      <button class="log-size" @click="logFontSizeShrink">-</button>
    </div>

    <pre class="logs">{{ logStr }}</pre>
  </div>
</template>

<script>
export default {
  name: 'console',
  data: function() {
    return {
      filters: [],
      logs: this.$store.getters['clients/logs'],
    };
  },
  computed: {
    logFilters() {
      const logFilters = [];

      this.$store.getters['clients/logs'].forEach(log => {
        let filter = logFilters.find(f => f.id === log.id);

        if (!filter) {
          filter = { id: log.id, errors: 0 };
          logFilters.push(filter);
        }

        if (log.type === 'error')
          filter.errors += 1;
      });
      // keep filters in the same order...
      logFilters.sort((a, b) => a.id > b.id);

      return logFilters;
    },
    logStr() {
      return this.$store.getters['clients/logs']
        .filter(log => this.filters.indexOf(log.id) === -1)
        .map(log => `[${log.id}]\t${log.msg}`)
        .join('');
    },
  },

  mounted() {
    this._updateSize();
  },

  updated() {
    this._updateSize();
  },

  methods: {
    _updateSize() {
      // @todo - rename elements classes

      const windowSize = this.$store.getters['app/getComponentSize']('window');
      const menuSize = this.$store.getters['app/getComponentSize']('main-menu');

      // const $filters = this.$el.querySelector('.filters');
      const $filterControls = this.$el.querySelector('.filter-controls');
      const $logs = this.$el.querySelector('.logs');

      const height = windowSize.height - menuSize.height;
      // const filtersHeight = $filters.getBoundingClientRect().height;
      const filterControlsHeight = $filterControls.getBoundingClientRect().height;
      // const logsHeight = height - filtersHeight - filterControlsHeight - 40 // 40 is padding
      const logsHeight = height - filterControlsHeight - 40 // 40 is padding
      const logsFontSize = this.$store.getters['app/getGuiState']('logsFontSize');
      $logs.style.height = `${logsHeight}px`;
      $logs.style.fontSize = `${logsFontSize}%`;

      $logs.scrollTop = $logs.scrollHeight;
    },

    clearLogs() {
      this.$store.dispatch('clients/clearLogs');
      this.filters.length = 0;
    },

    filterAll() {
      const ids = this.logFilters.map(filter => filter.id);

      ids.forEach(id => {
        if (this.filters.indexOf(id) === -1)
          this.filters.push(id);
      });
    },

    logFontSizeGrow() {
      let logsFontSize = this.$store.getters['app/getGuiState']('logsFontSize');
      logsFontSize *= 1.1; // grow by 10%
      if(logsFontSize > 200) {
        logsFontSize = 200;
      }

      this.$store.dispatch('app/setGuiState', {
        key: 'logsFontSize',
        value: logsFontSize,
      });
      this._updateSize();
    },

    logFontSizeShrink() {
      let logsFontSize = this.$store.getters['app/getGuiState']('logsFontSize');
      logsFontSize /= 1.1; // shrink by 10%
      if(logsFontSize < 50) {
        logsFontSize = 50;
      }

      this.$store.dispatch('app/setGuiState', {
        key: 'logsFontSize',
        value: logsFontSize,
      });
      this._updateSize();
    },
  },
};
</script>

<style scoped>
  #console {
    position: absolute;
    top: 0;
    right: 0;
    width: 48%;
    background-color: #efefef;
    border-left: 1px solid #ababab;
    padding: 20px;
    box-sizing: border-box;
    font-size: 1.2rem;
  }

  .clear-logs {
    display: inline;
    position: absolute;
    top: 20px;
    right: 20px;
    text-decoration: underline;
    margin: 0;
    color: #d9534f;
    cursor: pointer;
  }

  .filter-all {
    display: inline;
    position: absolute;
    top: 20px;
    right: 70px;
    text-decoration: underline;
    margin: 0;
    color: #d9534f;
    cursor: pointer;
  }

  .filters, .controls, .logs {
    margin: 0;
  }

  /* .filters {
    margin-right: 130px;
    padding-right: 20px;
    border-right: 1px solid #cdcdcd;
  } */

  .filter-controls {
    padding-top: 24px;
    padding-bottom: 8px;
  }

  .filter-controls input[type=checkbox] {
    margin-right: 6px;
  }

  .filter-controls label {
    width: 25%;
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0px;
  }

  .filter-controls label span {
    color: #d9534f;
  }

  pre.logs {
    background-color: #ffffff;
    border: 1px solid #ababab;
    padding: 10px;
    box-sizing: border-box;
    min-height: 94%;
    max-height: 94%;
    overflow-y: auto;
  }
</style>
