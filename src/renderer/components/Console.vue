<template>
  <div id="console" :style="consoleStyles">
    <div class="resize-bar" @mousedown="resizeStart"></div>

    <!-- <p class="filters">filters: {{ filters }}</p> -->
    <p class="filter-all" @click="filterAll">filter all</p>
    <p class="clear-logs" @click="clearLogs">clear</p>

    <div class="controls">
      <label v-for="deviceFilter of deviceFiltersFromLogs">
        <input type="checkbox" :value="deviceFilter.id" v-model="deviceFilters">
          {{ deviceFilter.id }}
          <span v-if="deviceFilter.errors > 0">({{ deviceFilter.errors }})</span>
      </label>

      <div class="log-controls">

        <div>
          <span>Font size:</span>
          <button class="btn log-size" @click="logFontSizeGrow">+</button>
          <button class="btn log-size" @click="logFontSizeShrink">-</button>
        </div>

        <div>
          <span>Regexp filter:</span>
          <input type="text" v-model="regexpFilter">
        </div>
      </div>
    </div>

    <pre class="logs" :style="logStyles">{{ logStr }}</pre>
  </div>
</template>

<script>
export default {
  name: 'console',
  data: function() {
    return {
      controlsHeight: 0,
      consoleWidth: 700,
      minConsoleWidth: 550,
      resizeConsoleWidthStart: null,
      resizePositionStart: null,
      regexpFilter: '',
      deviceFilters: [],
      logs: this.$store.getters['clients/logs'],
    };
  },
  computed: {
    consoleStyle() {
      return `width: ${this.$store.getters['app/getComponentSize']('console')}px`;
    },
    deviceFiltersFromLogs() {
      const deviceFilters = [];

      this.$store.getters['clients/logs'].forEach(log => {
        let filter = deviceFilters.find(f => f.id === log.id);

        if (!filter) {
          filter = { id: log.id, errors: 0 };
          deviceFilters.push(filter);
        }

        if (log.type === 'error')
          filter.errors += 1;
      });
      // keep filters in the same order...
      deviceFilters.sort((a, b) => a.id > b.id);

      return deviceFilters;
    },
    logStr() {
      return `abc\ndef`;

      const regexpFilter = (this.regexpFilter === '' ? '.*' : this.regexpFilter);
      const regexp = new RegExp(regexpFilter, 'i'); // case-insensitive

      return this.$store.getters['clients/logs']
        .filter(log => this.deviceFilters.indexOf(log.id) === -1)
        .map(log => `[${log.id}]\t${log.msg}`)
        .join('')
        .split('\n')
        .filter(log => regexp.test(log))
        .join('\n');
    },
    logStyles() {
      const windowSize = this.$store.getters['app/getComponentSize']('window');
      const menuSize = this.$store.getters['app/getComponentSize']('main-menu');
      const logsFontSize = this.$store.getters['app/getGuiState']('logsFontSize');
      let menuHeight = 0;
      // menu size is defined when menu is mounted later
      if (menuSize)
        menuHeight = menuSize.height;

      const $controls = this._$controls;
      const contentHeight = windowSize.height - menuHeight;
      const logsHeight = contentHeight - this.controlsHeight - 40 // 40 is padding

      return `height: ${logsHeight}px; font-size: ${logsFontSize}%`;
    },
    consoleStyles() {
      return `width: ${this.consoleWidth}px`;
    }
  },

  mounted() {
    const $controls = this.$el.querySelector('.controls');
    this.controlsHeight = $controls.getBoundingClientRect().height;
  },

  updated() {
    const $controls = this.$el.querySelector('.controls');
    this.controlsHeight = $controls.getBoundingClientRect().height;
  },

  methods: {
    clearLogs() {
      this.$store.dispatch('clients/clearLogs');
      this.deviceFilters.length = 0;
    },

    filterAll() {
      const ids = this.deviceFiltersFromLogs.map(filter => filter.id);

      ids.forEach(id => {
        if (this.deviceFilters.indexOf(id) === -1)
          this.deviceFilters.push(id);
      });
    },

    logFontSizeGrow() {
      let logsFontSize = this.$store.getters['app/getGuiState']('logsFontSize');
      logsFontSize *= 1.1; // grow by 10%

      if (logsFontSize > 200) {
        logsFontSize = 200;
      }

      this.$store.dispatch('app/setGuiState', {
        key: 'logsFontSize',
        value: logsFontSize,
      });
    },

    logFontSizeShrink() {
      let logsFontSize = this.$store.getters['app/getGuiState']('logsFontSize');
      logsFontSize /= 1.1; // shrink by 10%

      if (logsFontSize < 50) {
        logsFontSize = 50;
      }

      this.$store.dispatch('app/setGuiState', {
        key: 'logsFontSize',
        value: logsFontSize,
      });
    },

    resizeStart(e) {
      e.preventDefault();

      this.resizePositionStart = e.clientX;
      this.resizeConsoleWidthStart = this.consoleWidth;

      window.addEventListener('mousemove', this.resize);
      window.addEventListener('mouseup', this.resizeStop);
    },

    resizeStop(e) {
      e.preventDefault();

      window.removeEventListener('mousemove', this.resize);
      window.removeEventListener('mouseup', this.resizeStop);

      this.resizePositionStart = null;
      this.resizeConsoleWidthStart = null;
    },

    resize(e) {
      e.preventDefault();

      const currentPosition = e.clientX;
      const dx = this.resizePositionStart - currentPosition;

      this.consoleWidth = Math.max(this.minConsoleWidth, this.resizeConsoleWidthStart + dx);
    }

  },
};
</script>

<style scoped>
  #console {
    position: absolute;
    top: 0;
    right: 0;
    background-color: #efefef;
    /*border-left: 1px solid #ababab;*/
    padding: 20px;
    box-sizing: border-box;
    font-size: 1.2rem;
  }

  .resize-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    background-color: #ababab;
    cursor: col-resize;
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

  .controls {
    padding-top: 24px;
    padding-bottom: 8px;
  }

  .controls input[type=checkbox] {
    margin-right: 6px;
  }

  .controls label {
    width: 25%;
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0px;
  }

  .controls label span {
    color: #d9534f;
  }

  .log-controls {
    margin-top: 12px;
    height: 20px;
    display: flex;
    justify-content: space-between;
  }

  .log-controls > div:first-child {
    padding-right: 20px;
  }

  .log-controls > div {
    display: inline-block;
  }

  .log-controls input {
    display: inline;
    width: 250px;
  }

  .log-controls .btn.log-size {
    width: 20px;
    height: 20px;
    font-size: 16px;
    line-height: 20px;
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
