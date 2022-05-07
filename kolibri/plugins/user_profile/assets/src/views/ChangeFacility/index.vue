<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coreString('profileLabel')"
    :immersivePagePrimary="true"
  >
    <KPageContainer>

      <KGrid>
        <KGridItem sizes="100, 75, 75" percentage>
          <h1>Change Facility</h1>
        </KGridItem>
        <!-- Users cannot edit their profile if on a SoUD -->
        <KGridItem v-if="!isSubsetOfUsersDevice" sizes="100, 25, 25" percentage alignment="right">
          Route name: {{ currentRoute }}
        </KGridItem>
        <KGridItem v-if="!isSubsetOfUsersDevice" sizes="100, 25, 25" percentage alignment="right">
          Machine state: {{ state.value }}
        </KGridItem>
        <KGridItem v-if="!isSubsetOfUsersDevice" sizes="100, 25, 25" percentage alignment="right">
          Machine context: {{ state.context }}
        </KGridItem>
      </KGrid>

      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            @click="to_continue"
          />

          <KButton
            :primary="true"
            :text="coreString('goBackAction')"
            @click="goBack"
          />
          <KButton
            :primary="true"
            text="select Facility"
            @click="selectFacility"
          />
        </KButtonGroup>
      </slot>


    </KPageContainer>
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
    components: {
      CoreBase,
    },

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
    created() {
      this.service.start();
      this.service.onTransition(state => {
        const stateID = Object.keys(state.meta)[0];
        if (state.meta[stateID] !== undefined) {
          let newRoute = state.meta[stateID].route;
          if (newRoute != this.$router.currentRoute.name) {
            if ('path' in state.meta[stateID]) {
              this.backRoute = this.currentRoute;
              this.$router.push({ name: newRoute, path: state.meta[stateID].path });
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
    methods: {
      selectFacility() {
        this.service.send({
          type: 'SELECTFACILITY',
          value: {
            name: 'fac2',
            url: 'http...',
            id: 'ca88..',
          },
        });
      },
      goBack() {
        this.service.send({ type: 'BACK' });
      },
      to_continue() {
        this.service.send({
          type: 'CONTINUE',
        });
      },
    },
    $trs: {
      documentTitle: {
        message: 'Change Facility',
        context: 'Title of the change facility page.',
      },
    },
  };

</script>
