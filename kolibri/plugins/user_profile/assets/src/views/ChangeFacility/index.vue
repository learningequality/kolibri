<template>

  <NotificationsRoot>
    <div :style="wrapperStyles">
      <ImmersiveToolbar
        ref="appBar"
        :appBarTitle="coreString('changeLearningFacility')"
        :route="$router.getRoute('PROFILE')"
      />
      <KPageContainer>

        <router-view />

      </KPageContainer>
    </div>
  </NotificationsRoot>

</template>


<script>

  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import ImmersiveToolbar from 'kolibri.coreVue.components.ImmersiveToolbar';
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
    components: { NotificationsRoot, ImmersiveToolbar },

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
      wrapperStyles() {
        return {
          width: '100%',
          display: 'inline-block',
          backgroundColor: this.$themePalette.grey.v_100,
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingBottom: '72px',
          paddingTop: this.appBarHeight + 16 + 'px',
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
      this.appBarHeight = this.$refs.appBar.$el.clientHeight;

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
