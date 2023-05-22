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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { checkCapability } from 'kolibri.utils.appCapabilities';
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
      ...mapState(['loading', 'error']),
    },
    // this is not getting hit
    // beforeRouteUpdate(to, from) {
    //   console.log('HIT beforeRouteEnter', to, from);
    //   this.service.send({ type: 'PUSH_HISTORY', value: to });
    // },
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

      // desired behavior:
      // if the app is moved backwards in navigation,
      const synchronizeRouteAndMachine = state => {
        if (!state) return;

        const { meta } = state;

        // Dump out of here if there is nothing to resume from
        if (!Object.keys(meta).length) {
          this.$router.push('/');
          return;
        }

        // // if this.$route.meta.noBackAction
        // send action updating state, not route
        // can this be retrieved from history?

        const route = meta[Object.keys(meta)[0]].route;
        if (route) {
          // Avoid redundant navigation
          if (this.$route.name !== route.name) {
            // const routeMetaInfo = this.$route?.meta;
            // const routeBackAction = routeMetaInfo?.backActionAllowed;
            //
            // const backActionAllowed =
            //   routeBackAction === 'never'
            //     ? false
            //     : routeBackAction === 'checkImportedUsers'
            //       ? this.wizardService.state.context.importedUsers.length > 0
            //       : true
            //
            // if (
            //   backActionAllowed &&
            //   this.wizardService.state.history.historyValue.current &&
            //   this.$route.name === this.wizardService.state.history.historyValue.current
            // ) {
            //
            //   // this.service.send({ type: 'BACK' });
            //
            //   // this.service.send({ type: '', value: checkCapability('get_os_user') });
            // }

            // const backActionAllowed =
            // if (this.$route?.meta?.backActionAllowed) {

            // }
            this.$router.push(route);
          } // // else if savedState doesn't match step of wizard (from assessing savedstate expectations for that route)
          // // remove everything in savedState beyond
        } else {
          this.$router.push('/');
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

      // + if browser back event, call synchronizeroute&machine

      // wizard.history.historyValue.current = previous page
      // wizard.historyValue.current = current page

      // watch nextStep info
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

  // elephant graveyard

  // if the route updates, we need to run synchronizeRouteAndMachine
  // does synchronizeRouteAndMachine set the url to whatever the savedState represents?
  // if we open up setup wizard after closing it, should go to location the state represents
  // but if we go back through wizard OR browser button, we need to set state to what url represents
  // how does this work on refresh/update-e.g. if we do the latter, won't the former stop working?


  // how to fix setup wizard behavior of not resetting next step if we go backwards?

      // beforeRouteUpdate(to, from, next) {
    //   // let backActionAllowed;
    //   const routeMetaInfo = from?.meta;
    //   const routeBackAction = routeMetaInfo?.backActionAllowed;
    //   const nextNavigationAllowed = routeMetaInfo?.nextNavigationAllowed;
    //
    //   const backActionAllowed =
    //     routeBackAction === 'never'
    //       ? false
    //       : routeBackAction === 'checkImportedUsers'
    //         ? this.wizardService.state.context.importedUsers.length > 0
    //         : true
    //
    //   // if we're moving, but we're not allowed to go back and we're not moving forward,
    //   // cancel navigation
    //   if (!backActionAllowed && !nextNavigationAllowed.includes(to.name)) {
    //     next(false)
    //   } else {
    //     next();
    //   }
    // },

    // need to account for both backwards and forwards movement --
    // if we're going back AND we're allowed to go back:
    // send BACK through wizard like
    //   // this.wizardService.send({
    //   //   type: 'BACK',
    //   //   value: true,
    //   // });
    // // if we're going back and we're NOT allowed to go back:
    // // next(false) to cancel navigation
    // // if we're going forward,
    // // either next() or send CONTINUE

    // so need to send in meta
    // - list of allowed previousRoutes
    // - list of allowed nextRoutes



    // beforeRouteUpdate(to, from, next) {
    // // check if back action is allowed:
    // // // check for from.meta.checkBackAction --> check value
    // // // if from.meta.backActionAllowed === 'never' ==>
    // // //
    // // 1 if backAction is not allowed and to.pageName !== from.meta.nextPageName:
    // //  ==> cancel navigation (but DO send appropriate "Continue"s for going forward)
    // // 2
    // // if back action is allowed, go to next() + apply savedState
    // const backActionAllowed =
    // // cases:
    // // don't allow backAction if from.meta.noBackAction
    // },

    // let backActionAllowed; // or let backActionAllowed = null; ?
    // if from?.meta?.backActionAllowed === 'never' {
    // backActionAllowed = false } else if ()
    //
    // let backActionAllowed;
    // const routeMetaInfo = from?.meta
    // const routeBackAction = routeMetaInfo?.backActionAllowed
    //
    // if (routeBackAction === 'never') {
    //  backActionAllowed = false
    // } else if (routeBackAction === 'checkImportedUsers') {
    // backActionAllowed = this.wizardService.state.context.importedUsers.length > 0
  // }
    //
    //
    //


    // beforeRouteUpdate(to, from) {
    //   // IF user selects browser "back"
    //   // // IF they're allowed to go back
    //   // // // send BACK event to interpreted state machine
    //
    //   // access state machine
    // },


    // // notes from jacob
    // I believe that the issue w/ the back button comes down to things not re-initializing
    // whenever the user "goes back" using the browser. Meaning, rather than reloading the whole
    // page and reading the savedState and then determining what page to show the user
    // from that -- it just changes the route within the application so it sort of forces the
    // user to the previous route without updating the state machine accordingly.

    // So in the case where a user wants to "go back" but is in a position where they're not
    // allowed to, then we could probably work out a way to use a VueRouter beforeEach to identify
    // if the user is even allowed to go back using the "back button" at all.

    // Then, separately, if the user is allowed to go back, we need to be sure to send the
    // BACK event to the interpreted state machine. Getting a reference to this in Vue Router
    // beforeEach might not be particularly easy, though, as it's provided in SetupWizardIndex
    // and then injected everywhere else. Might work better to instead use a beforeRouteUpdate
    // in-component guard in SetupWizardIndex where you have this available to access the state
    // machine then can avoid trying to work out how to get it in scope of the router's definition.


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
