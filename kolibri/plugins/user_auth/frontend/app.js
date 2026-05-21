import { watch } from 'vue';
import { useWindowFocus } from '@vueuse/core';
import router from 'kolibri/router';
import KolibriApp from 'kolibri-app';
import RootVue from './views/UserAuthIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import useAuthFlow from './composables/useAuthFlow';

class UserAuthModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
  async ready() {
    const { initializeFlow } = useAuthFlow();
    const windowFocused = useWindowFocus();

    // Add a route hook to initialize just before the first route load, the pages then handles
    // updates as facility is changed, and the watcher below on focus changes. putting
    // `initialzeFlow` above `super.ready()` causes a delay, showing a white page. putting it after
    // causes the state not to be ready for components
    router.beforeEach(async (to, from, next) => {
      await initializeFlow();
      next();
    });

    await super.ready();

    // Since inactivity will lead to users being logged out, these auth pages could site idle in
    // a browser tab for a long while. So when the user re-focuses on the window, we'll refetch
    // facilities and settings to ensure the state is up-to-date
    watch(windowFocused, (isFocused, wasFocused) => {
      if (isFocused && !wasFocused) {
        initializeFlow(true);
      }
    });
  }
}

export default new UserAuthModule();
