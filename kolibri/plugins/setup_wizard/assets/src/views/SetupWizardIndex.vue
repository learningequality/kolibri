<template>

  <div class="onboarding">
    <ErrorPage
      v-if="error"
      class="body"
      :class="!windowIsLarge ? 'mobile' : ''"
    />

    <LoadingPage
      v-else-if="loading"
      class="body"
      :class="!windowIsLarge ? 'mobile' : ''"
    />

    <template v-else>
      <router-view />
    </template>
  </div>

</template>


<script>

  import { interpret } from 'xstate';
  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { checkCapability } from 'kolibri/utils/appCapabilities';
  import Lockr from 'lockr';
  import { wizardMachine } from '../machines/wizardMachine';
  import LoadingPage from './submission-states/LoadingPage';
  import ErrorPage from './submission-states/ErrorPage';

  export default {
    name: 'SetupWizardIndex',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      LoadingPage,
      ErrorPage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge } = useKResponsiveWindow();
      return { windowIsLarge };
    },
    data() {
      return {
        service: interpret(wizardMachine),
      };
    },
    provide() {
      return {
        wizardService: this.service,
      };
    },
    computed: {
      ...mapState(['loading', 'error']),
    },
    created() {
      /*
       * The interpreted wizardMachine is an object that lets you move between states.
       * It's current state value has no side effects or dependencies - so we can store it
       * as data - then when we initialize the machine each time, we can pass it that data
       * to resume the machine as we had saved it.
       *
       * A key part of this is that we synchronize our router with the machine on every
       * transition as each state entry has a `meta` property with a route name that maps
       * to a route definition which maps to a specific component.
       *
       * So - when we load the initial state, the user resumes where they left off if they
       * are on the same browser (although we could persist it to the backend if needed too).
       *
       * NOTE: There may be times when we want to reset to the beginning, unsetting the value
       * using Lockr and redirecting to '/' should do the trick.
       */

      const synchronizeRouteAndMachine = state => {
        if (!state) return;

        const { meta } = state;

        // Dump out of here if there is nothing to resume from
        if (!Object.keys(meta).length) {
          this.$router.replace('/');
          return;
        }

        const route = meta[Object.keys(meta)[0]].route;
        if (route) {
          // Avoid redundant navigation
          if (this.$route.name !== route.name) {
            this.$router.replace(route);
          }
        } else {
          this.$router.replace('/');
        }
      };

      // Note the second arg to Lockr.get is a fallback if the first arg is not found
      const savedState = Lockr.get('savedState', 'initializeContext');

      // Either the string 'initializeContext' or a valid state object returned from Lockr

      if (savedState !== 'initializeContext') {
        // Update the route if there is a saved state
        synchronizeRouteAndMachine(savedState);
      } else {
        // Or set the app context state on the machine and proceed to the first state
        this.service.send({ type: 'CONTINUE', value: checkCapability('get_os_user') });
      }

      this.service.start(savedState);

      this.service.onTransition(state => {
        synchronizeRouteAndMachine(state);
        Lockr.set('savedState', this.service._state);
      });
    },
    destroyed() {
      Lockr.set('savedState', null);
      this.service.stop();
    },

    $trs: {
      documentTitle: {
        message: 'Setup Wizard',
        context:
          "The Kolibri set up wizard helps the admin through the process of creating their facility. The text 'Setup Wizard' is the title of the wizard and this can been seen the in the browser tab when the admin is setting up their facility.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // from http://nicolasgallagher.com/micro-clearfix-hack/
  @mixin clearfix() {
    zoom: 1;

    &::after,
    &::before {
      display: table;
      content: '';
    }

    &::after {
      clear: both;
    }
  }

  .onboarding {
    @include clearfix(); // child margin leaks up into otherwise empty parent

    width: 100%;
  }

  .body {
    width: 90%;
    max-width: 550px;
    margin-top: 64px;
    margin-right: auto;
    margin-bottom: 32px;
    margin-left: auto;
  }

  .page-wrapper {
    padding: 8px;
  }

  // Override KPageContainer styles
  /deep/ .page-container {
    overflow: visible;

    &.small {
      padding: 16px;
    }
  }

  /deep/ .mobile {
    margin-top: 40px;
    margin-bottom: 24px;
  }

</style>
