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
  import { mapGetters, mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
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
    mixins: [commonCoreStrings, responsiveWindowMixin],
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
      ...mapGetters(['isAppContext']),
      ...mapState(['loading', 'error']),
    },
    created() {
      /*
       * The interpreted wizardMachine is an object that lets you move between states.
       * It's current state value has no side effects or dependencies - so we can store it
       * as data - then when we initialize the machine each time, we can pass it the previous
       * state.
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

      function synchronizeRouteAndMachine(state) {
        const { meta } = state;
        if (meta && meta.route) {
          this.$router.replace(meta.route);
        }
      }

      const savedState = Lockr.get('savedState', 'initializeContext');

      // Either the string 'initializeContext' or a valid state object
      this.service.start(savedState);

      if (savedState !== 'initializeContext') {
        // Update the route if there is a saved state
        synchronizeRouteAndMachine(savedState);
      } else {
        // Or set the app context state on the machine and proceed to the first state
        this.service.send({ type: 'CONTINUE', value: this.isAppContext });
      }

      this.service.onTransition(state => {
        const stateID = Object.keys(state.meta)[0];
        let newRoute = state.meta[stateID].route;

        if (newRoute != this.$router.currentRoute.name) {
          if ('path' in state.meta[stateID])
            this.$router.push({ name: newRoute, path: state.meta[stateID].path });
          else this.$router.push(newRoute);
        }

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
