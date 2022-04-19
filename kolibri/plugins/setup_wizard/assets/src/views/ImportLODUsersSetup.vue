<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="removeNavIcon"
      :title="currentTitle"
      @click_back="previousStep"
    />
    <div class="main">
      <KPageContainer>
        <component
          :is="currentComponent"
        />
      </KPageContainer>
    </div>

    <BottomAppBar v-if="service.state.matches('selectUsers')">
      <KButton
        primary
        :text="coreString('finishAction')"
        :disabled="users.length === 0"
        @click="redirectToChannels"
      />
    </BottomAppBar>
  </div>

</template>


<script>

  import { computed } from 'kolibri.lib.vueCompositionApi';
  import { interpret } from 'xstate';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import { lodImportMachine } from '../machines/lodImportMachine';
  import { FinishSoUDSyncingResource } from '../api';
  import ProgressToolbar from './ProgressToolbar';

  export default {
    name: 'ImportLODUsersSetup',
    components: {
      BottomAppBar,
      ProgressToolbar,
    },
    mixins: [commonSyncElements, commonCoreStrings],

    data() {
      // Global state for the import process
      return {
        service: interpret(lodImportMachine),
        state: lodImportMachine.initialState,
        total_steps: 4,
        stateID: null,
      };
    },
    provide() {
      return {
        lodService: this.service,
        state: computed(() => this.state.context),
      };
    },
    inject: ['wizardService'],
    computed: {
      currentComponent() {
        return this.state.meta[this.stateID].component;
      },
      currentStep() {
        return Number(this.state.meta[this.stateID].step);
      },
      currentTitle() {
        return this.$tr('stepTitle', {
          step: this.currentStep,
          total: this.total_steps,
        });
      },
      removeNavIcon() {
        // TODO disable backwards navigation at the router level
        return this.currentStep > 2 || this.state.context.users.length > 0;
      },
      users() {
        return this.state.context.users;
      },
    },

    beforeRouteUpdate(to, from, next) {
      // If trying to go backwards, prevent navigation and move the history back
      // to previous location
      if (Number(from.params.step) >= 2 && Number(to.params.step <= 2)) {
        window.history.forward();
        return;
      } else {
        next();
      }
    },

    beforeMount() {
      this.fetchNetworkLocationFacilities(this.$route.query.device_id)
        .then(data => {
          if (data.facilities.length === 1)
            this.service.send({
              type: 'CONTINUE',
              value: { device: data, facility: data.facilities[0] },
            });
          else if (data.facilities.length > 1)
            this.service.send({ type: 'DEVICE_DATA', value: data });
          else if (data.facilities.length === 0)
            //unprovisioned server, can't sync from it
            this.wizardService.send({ type: 'BACK' });
        })
        .catch(error => {
          // TODO handle disconnected peers error more gracefully
          this.$store.dispatch('showError', error);
        });
    },
    created() {
      this.service.start();
      this.service.onTransition(state => {
        this.state = state;
        this.total_steps = this.state.context.steps;
        this.stateID = Object.keys(this.state.meta)[0];
      });
    },
    destroyed() {
      this.service.stop();
    },
    methods: {
      previousStep() {
        if (this.state.matches('selectFacility') || this.state.matches('userCredentials'))
          this.wizardService.send('BACK');
        else this.service.send('BACK');
      },
      redirectToChannels() {
        FinishSoUDSyncingResource.finish();
      },
    },
    $trs: {
      stepTitle: {
        message: 'Import individual user accounts - {step, number} of {total, number}',
        context: 'Title that goes on top of the screen to indicate the current step.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .main {
    margin: 16px;
  }

</style>
