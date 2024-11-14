<template>

  <KModal
    :title="$tr('syncAllFacilityDataHeader')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>
      {{ $tr('syncExplanation') }}
    </p>
    <p v-if="!isConnected">
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
            primary
            type="submit"
            :disabled="!isConnected"
          />
        </span>
      </KButtonGroup>
    </template>
  </KModal>

</template>


<script>

  import TaskResource from 'kolibri/apiResources/TaskResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';

  export default {
    name: 'SyncAllFacilitiesModal',
    mixins: [commonCoreStrings],
    props: {
      facilities: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        isConnected: true,
      };
    },
    mounted() {
      this.setConnectionStatus();
    },
    methods: {
      handleSubmit() {
        this.setConnectionStatus();
        if (this.isConnected) {
          this.startSyncAllTask();
        }
      },
      setConnectionStatus() {
        this.isConnected = window.navigator.onLine;
      },
      startSyncAllTask() {
        return TaskResource.startTasks(
          this.facilities.map(f => ({ type: TaskTypes.SYNCDATAPORTAL, facility: f.id })),
        )
          .then(() => {
            this.$emit('success');
          })
          .catch(error => {
            // TODO handle failure gracefully
            this.$store.dispatch('handleApiError', { error });
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
      /* eslint-disable kolibri/vue-no-unused-translations */
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
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped></style>
