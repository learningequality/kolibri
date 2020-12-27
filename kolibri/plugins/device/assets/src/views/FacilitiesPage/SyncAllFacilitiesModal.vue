<template>

  <KModal
    :title="$tr('syncAllFacilityDataHeader')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>
      {{ $tr('syncExplanation') }}
    </p>
    <p>
      {{ $tr('mustBeConnectedToInternet') }}
    </p>


    <template #actions>
      <KButtonGroup>
        <KButton
          :text="coreString('cancelAction')"
          @click="$emit('cancel')"
        />
        <!--
          Wrap the KButton in a span w/ a ref so we listen for mouseovers even when
          the underlying button is disabled - disabled elements don't fire events
        -->
        <span ref="syncbutton">
          <KButton
            :text="coreString('syncAction')"
            :disabled="submitDisabled"
            primary
            type="submit"
          />
        </span>
        <KTooltip
          v-if="submitDisabled"
          reference="syncbutton"
          :refs="$refs"
        >
          <span v-if="noRegisteredFacilities">
            {{ $tr('noFacilitiesTooltip') }}
          </span>
          <span v-else>
            {{ $tr('currentlyOfflineTooltip') }}
          </span>
        </KTooltip>
      </KButtonGroup>
    </template>
  </KModal>

</template>


<script>

  import some from 'lodash/some';
  import { FacilityTaskResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'SyncAllFacilitiesModal',
    mixins: [commonCoreStrings],
    props: {
      facilities: {
        type: Array,
        required: true,
      },
    },
    computed: {
      submitDisabled() {
        // TODO implement a check for KDP being offline
        return this.noRegisteredFacilities;
      },
      noRegisteredFacilities() {
        return !some(this.facilities, fac => fac.dataset.registered);
      },
    },
    methods: {
      handleSubmit() {
        // NOTE the button will not be visibly disabled, but does nothing
        // when clicked
        if (!this.submitDisabled) {
          return this.startSyncAllTask();
        }
      },
      startSyncAllTask() {
        return FacilityTaskResource.dataportalbulksync()
          .then(() => {
            this.$emit('success');
          })
          .catch(error => {
            // TODO handle failure gracefully
            this.$store.dispatch('handleApiError', error);
          });
      },
    },
    $trs: {
      syncAllFacilityDataHeader: {
        message: 'Sync all facility data',
        context: 'Title of the modal window',
      },
      syncExplanation: {
        message: 'This will sync all registered facilities on this device to Kolibri Data Portal.',
        context: 'Modal description text',
      },
      mustBeConnectedToInternet: {
        message: 'You must be connected to the internet.',
        context: 'Modal description text',
      },
      currentlyOfflineTooltip: {
        message: 'You are currently offline',
        context:
          "Floating notification message that appears over the 'Sync' button and indicates why is it not active",
      },
      noFacilitiesTooltip: {
        message: 'There are no registered facilities on this device',
        context:
          "Floating notification message that appears over the 'Sync' button and indicates why is it not active",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
