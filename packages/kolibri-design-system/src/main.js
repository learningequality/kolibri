import Vue from 'vue';
import KThemePlugin from 'kolibri-components/src/KThemePlugin';
import App from './App.vue';

Vue.config.productionTip = false;
Vue.use(KThemePlugin);

new Vue({
  render: h => h(App),
}).$mount('#app');
