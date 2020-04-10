<template>

  <KModal
    :title="$tr('syncAllFacilityDataHeader')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>
      {{ $tr('syncExplanation') }}
    </p>
    <p>
      {{ $tr('mustBeConnectedToInternet') }}
    </p>
    <template v-slot:actions>
      <KButton :text="coreString('cancelAction')" @click="$emit('cancel')" />
      <KButton
        :text="coreString('syncAction')"
        :disabled="submitDisabled"
        primary
        type="submit"
      />
      <KTooltip v-if="submitDisabled">
        {{ $tr('currentlyOfflineTooltip') }}
        {{ $tr('noFacilitiesTooltip') }}
      </KTooltip>
    </template>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'SyncFacilityDataModal',
    components: {},
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {};
    },
    computed: {
      submitDisabled() {
        return false;
      },
    },
    methods: {},
    $trs: {
      syncAllFacilityDataHeader: 'Sync all facility data',
      syncExplanation:
        'This will sync all registered facilities on this device to Kolibri Data Portal.',
      mustBeConnectedToInternet: 'You must be connected to the internet.',
      currentlyOfflineTooltip: 'You are currently offline',
      noFacilitiesTooltip: 'There are no registered facilities on this device',
    },
  };

</script>


<style lang="scss" scoped></style>
