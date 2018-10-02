const state = {
  components: {},
  guiState: {
    showConsole: true,
    logsFontSize: 100, // %
  },
};

const mutations = {
  SET_COMPONENT_SIZE(state, payload) {
    const { width, height } = payload;
    state.components[payload.id] = { width, height };
  },
  SET_GUI_STATE(state, payload) {

    const { key, value } = payload;
    state.guiState[key] = value;

  }
};

const actions = {
  setComponentSize({ commit }, payload) {
    commit('SET_COMPONENT_SIZE', payload);
  },
  setGuiState({ commit }, payload) {
    commit('SET_GUI_STATE', payload);
  },
};

const getters = {
  getComponentSize: (state) => (id) => {
    return state.components[id];
  },
  getGuiState: (state) => (key) => {
    return state.guiState[key];
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
