<template>

  <div>
    <KGrid>
      <KGridItem sizes="100, 75, 75" percentage>
        <h1>Scalfolding page</h1>
      </KGridItem>
      <KGridItem v-if="!isSubsetOfUsersDevice" sizes="100, 25, 25" percentage alignment="right">
        Route name: {{ currentRoute }}
      </KGridItem>
      <KGridItem v-if="!isSubsetOfUsersDevice" sizes="100, 25, 25" percentage alignment="right">
        Machine state: {{ changeFacilityService.state.value }}
      </KGridItem>
      <KGridItem v-if="!isSubsetOfUsersDevice" sizes="100, 25, 25" percentage alignment="right">
        Machine context: {{ state.value }}
      </KGridItem>
    </KGrid>

    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>

          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            @click="to_continue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>

  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import plugin_data from 'plugin_data';

  export default {
    name: 'ToBeDone',

    components: { BottomAppBar },
    inject: ['changeFacilityService', 'state'],
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const { isSubsetOfUsersDevice } = plugin_data;
      return {
        isSubsetOfUsersDevice,
      };
    },
    data() {
      return {
        currentRoute: this.$router.currentRoute.name,
      };
    },

    methods: {
      to_continue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
        });
      },
    },
  };

</script>
