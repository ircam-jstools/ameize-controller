import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: require('@/components/ManageDevices').default,
      // component: require('@/components/EmulateDevices').default,
    },
    {
      path: '/manage-devices',
      name: 'manage-devices',
      component: require('@/components/ManageDevices').default,
    },
    {
      path: '/emulate-devices',
      name: 'emulate-devices',
      component: require('@/components/EmulateDevices').default,
    },
    {
      path: '*',
      redirect: '/',
    },
  ],
});
