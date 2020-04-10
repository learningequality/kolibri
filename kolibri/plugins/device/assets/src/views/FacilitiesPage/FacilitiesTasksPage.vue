<template>

  <div>
    <p>
      <KRouterLink
        :to="{ name: 'FACILITIES_PAGE' }"
        :text="$tr('backToFacilitiesLabel')"
      />
    </p>

    <HeaderWithOptions
      :headerText="coreString('facilitiesLabel')"
    >
      <template #options>
        <KButton
          :text="coreString('clearCompletedAction')"
          @click="handleClickClearAll"
        />
      </template>
    </HeaderWithOptions>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import HeaderWithOptions from '../HeaderWithOptions';

  export default {
    name: 'FacilitiesTasksPage',
    components: {
      HeaderWithOptions,
    },
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {};
    },
    computed: {},
    methods: {
      handleClickClearAll() {},
    },
    $trs: {
      backToFacilitiesLabel: 'Back to facilities',
    },
  };

</script>


<style lang="scss" scoped>

  .buttons {
    margin: auto;
  }

</style>
