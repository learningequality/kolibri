<template>

  <NotificationsRoot>
    <ImmersivePage
      :appBarTitle="coreString('changeLearningFacility')"
      :route="$router.getRoute('PROFILE')"
      :appearanceOverrides="wrapperStyles"
    >
      <KPageContainer>
        <router-view />
      </KPageContainer>
    </ImmersivePage>
  </NotificationsRoot>

</template>


<script>

  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { computed } from 'vue';
  import { interpret } from 'xstate';
  import useUser from 'kolibri/composables/useUser';
  import { changeFacilityMachine } from '../../machines/changeFacilityMachine';

  export default {
    name: 'ChangeFacility',
    metaInfo() {
      return {
        title: this.coreString('changeLearningFacility'),
      };
    },
    components: { NotificationsRoot, ImmersivePage },
    mixins: [commonCoreStrings],
    setup() {
      const { session, getUserKind } = useUser();
      return { session, getUserKind };
    },
    data() {
      return {
        service: interpret(changeFacilityMachine),
        previousMachineStateName: '',
        state: changeFacilityMachine.initialState,
        currentRoute: this.$router.currentRoute.name,
        appBarHeight: 0,
        internalNavigation: false,
      };
    },
    provide() {
      return {
        changeFacilityService: this.service,
        state: computed(() => this.state.context),
      };
    },

    computed: {
      wrapperStyles() {
        return {
          maxWidth: '1064px',
          margin: '0px auto auto',
          padding: '96px 32px 72px',
          backgroundColor: this.$themePalette.grey.v_100,
        };
      },
    },

    beforeRouteUpdate(to, from, next) {
      if (!this.internalNavigation) this.service.send('BACK');
      next();
    },
    created() {
      this.service.start();
      this.service.onTransition(state => {
        if (state.value === 'error') {
          this.onMachineError(state);
          return;
        }
        const stateID = Object.keys(state.meta)[0];
        if (state.meta[stateID] !== undefined) {
          const newRoute = state.meta[stateID].route;
          if (newRoute != this.$router.currentRoute.name) {
            if ('path' in state.meta[stateID]) {
              this.internalNavigation = true;
              this.$router.push(
                { name: newRoute, path: state.meta[stateID].path },
                function () {
                  this.internalNavigation = false;
                }.bind(this),
              );
            } else this.$router.push(newRoute);
          }
          this.currentRoute = newRoute;
        }
        this.state = state;
      });
    },
    destroyed() {
      this.service.stop();
    },
    mounted() {
      this.$nextTick(() => {
        if (this.$refs.appBar) {
          this.appBarHeight = this.$refs.appBar.$el.clientHeight;
        }
      });

      const ctx = this.service.state.context;
      if (ctx.username === '') {
        // machine initialized with its default context
        this.service.send({
          type: 'SETCONTEXT',
          value: {
            facility: this.session.facility_id,
            username: this.session.username,
            fullname: this.session.full_name,
            userId: this.session.user_id,
            role: this.getUserKind,
          },
        });
      }
    },
    methods: {
      onMachineError(machineState) {
        this.$store.commit(
          'CORE_SET_ERROR',
          `An error occured in the '${this.previousMachineStateName}' state of the change facility machine`,
        );
        this.service.send('RESET');
        this.previousMachineStateName = machineState.value;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import 'kolibri-common/styles/definitions';

  .container {
    max-width: $page-container-max-width;
    margin-right: auto;
    margin-left: auto;
  }

  .narrow-container {
    max-width: 500px;
    margin: auto;
    overflow: visible;
  }

</style>
