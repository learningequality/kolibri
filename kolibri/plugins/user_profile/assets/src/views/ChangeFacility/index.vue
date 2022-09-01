<template>

  <NotificationsRoot>
    <ImmersivePage
      :appBarTitle="coreString('changeLearningFacility')"
      :route="$router.getRoute('PROFILE')"
    >
      <KPageContainer style="width: 1000px; margin: 32px auto 0;">
        <router-view />
      </KPageContainer>
    </ImmersivePage>
  </NotificationsRoot>

</template>


<script>

  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import { interpret } from 'xstate';
  import { mapGetters } from 'vuex';
  import { changeFacilityMachine } from '../../machines/changeFacilityMachine';
  import plugin_data from 'plugin_data';

  export default {
    name: 'ChangeFacility',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { NotificationsRoot, ImmersivePage },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const { isSubsetOfUsersDevice } = plugin_data;
      return {
        isSubsetOfUsersDevice,
      };
    },

    data() {
      return {
        service: interpret(changeFacilityMachine),
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
      ...mapGetters(['session', 'getUserKind']),
    },

    beforeRouteUpdate(to, from, next) {
      if (!this.internalNavigation) this.service.send('BACK');
      next();
    },
    created() {
      this.service.start();
      this.service.onTransition(state => {
        const stateID = Object.keys(state.meta)[0];
        if (state.meta[stateID] !== undefined) {
          let newRoute = state.meta[stateID].route;
          if (newRoute != this.$router.currentRoute.name) {
            if ('path' in state.meta[stateID]) {
              this.internalNavigation = true;
              this.$router.push(
                { name: newRoute, path: state.meta[stateID].path },
                function() {
                  this.internalNavigation = false;
                }.bind(this)
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
            role: this.getUserKind,
          },
        });
      }
    },
    $trs: {
      documentTitle: {
        message: 'Change Facility',
        context: 'Title of the change facility page.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../../../../../core/assets/src/styles/definitions';

  .container {
    max-width: $page-container-max-width;
    margin-right: auto;
    margin-left: auto;
  }

</style>
