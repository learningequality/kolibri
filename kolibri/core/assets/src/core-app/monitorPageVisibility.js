import store from 'kolibri.coreVue.vuex.store';

document.addEventListener('visibilitychange', function() {
  store.dispatch('setPageVisibility');
});
