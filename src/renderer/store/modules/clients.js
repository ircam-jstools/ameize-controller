const state = {
  clients: [],
  logs: [],
  tokens: [], // allow to track state of remote cmd or interactions
};

const mutations = {
  ADD_CLIENT(state, client) {
    // id is the hostname, that has to be unique anyway
    const id = client.id;
    const targetClient = state.clients.find(client => client.id === id);

    if (targetClient) {
      targetClient.connected = true;
    } else {
      client.connected = true;
      state.clients.push(client);
    }
  },
  REMOVE_CLIENT(state, client) {
    // id is the hostname, that has to be unique anyway
    const id = client.id;
    const targetClient = state.clients.find(client => client.id === id);

    if (targetClient) {
      // remove all tokens related to the client
      // @todo - needs to be tested properly
      for (let index = state.tokens.length - 1; index >= 0; index--) {
        const token = state.tokens[index];

        if (token.client.id === targetClient.id) {
          state.tokens.splice(index, 1);
        }
      }

      // but keep its logs has it might be usefull
      // and tag as disconnected
      targetClient.connected = false;
    }
  },
  // DELETE_CLIENT(client) {},

  CREATE_LOG(state, log) {
    if (state.logs.length > 100)
      state.logs.shift();

    state.logs.push(log);
  },

  CLEAR_LOGS(state) {
    state.logs = [];
  },

  ADD_TOKENS(state, tokens) {
    state.tokens = state.tokens.concat(tokens);
  },
  CLEAR_TOKEN(state, tokenUuid) {
    const index = state.tokens.findIndex(t => t.uuid === tokenUuid);
    state.tokens.splice(index, 1);
  },
  SET_TOKEN_STATUS(state, payload) {
    const { uuid, status } = payload;
    const token = state.tokens.find(t => t.uuid === uuid);
    token.status = status;
  },
};

const actions = {
  add({ state, commit, rootState }, client) {
    commit('ADD_CLIENT', client);
  },
  remove({ state, commit, rootState }, client) {
    commit('REMOVE_CLIENT', client);
  },
  // deleteClient({ commit }, client);

  createLog({ commit }, log) {
    commit('CREATE_LOG', log);
  },
  clearLogs({ commit }) {
    commit('CLEAR_LOGS');
  },

  addTokens({ commit }, tokens) {
    commit('ADD_TOKENS', tokens);
  },
  clearToken({ commit }, tokenUuid) {
    commit('CLEAR_TOKEN', tokenUuid);
  },
  setTokenStatus({ commit }, payload) {
    commit('SET_TOKEN_STATUS', payload);
  },
};

const getters = {
  all(state, getters, rootState) {
    return state.clients;
  },
  connected(state) {
    return state.clients.filter(client => client.connected === true);
  },
  idByRinfo: (state) => (rinfo) => {
    const client = state.clients.find(c => {
      return c.rinfo.port === rinfo.port && c.rinfo.address === rinfo.address;
    });

    if (client)
      return client.id;
    else
      return null;
  },

  logs(state) {
    return state.logs;
  },
  tokens(state) {
    return state.tokens;
  }
};

export default {
  namespaced: true, // @todo - explore that
  state,
  mutations,
  actions,
  getters,
};
