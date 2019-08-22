import store from 'kolibri.coreVue.vuex.store';

export default function monitorPageVisibility() {
  document.addEventListener('visibilitychange', function() {
    store.dispatch('setPageVisibility');
  });
}
