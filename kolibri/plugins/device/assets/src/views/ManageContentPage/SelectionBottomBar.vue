<template>

  <div>
    <BottomAppBar>
      <span class="message">{{ selectedMessage }}</span>
      <KButton
        :disabled="selectedObjects.length === 0"
        :text="confirmButtonLabel"
        :primary="true"
        @click="$emit('clickconfirm')"
      />
    </BottomAppBar>
  </div>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  // Shows a 'EXPORT', 'IMPORT', or 'DELETE' button next to a message
  // of how many items are selected plus their size.
  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    props: {
      selectedObjects: {
        type: Array,
        default() {
          return [];
        },
      },
      objectType: {
        type: String,
        validator(value) {
          return value === 'channel' || value === 'resource';
        },
      },
      actionType: {
        type: String,
        validator(value) {
          return value === 'import' || value === 'export' || value === 'delete';
        },
      },
    },
    computed: {
      confirmButtonLabel() {
        return {
          import: this.$tr('importAction'),
          export: this.$tr('exportAction'),
          delete: this.$tr('deleteAction'),
        }[this.actionType];
      },
      selectedObjectsFileSize() {
        if (
          this.objectType === 'channel' &&
          (this.actionType === 'export' || this.actionType === 'delete')
        ) {
          return sumBy(this.selectedObjects, 'on_device_file_size');
        }
        return 0;
      },
      bytesText() {
        if (this.selectedObjects.length === 0) {
          return '';
        }
        return bytesForHumans(this.selectedObjectsFileSize);
      },
      selectedMessage() {
        const count = this.selectedObjects.length;
        const forChannels = this.objectType === 'channel';
        if (count === 0) {
          return this.objectType === 'channel'
            ? this.$tr('zeroChannelsSelected')
            : this.$tr('zeroResourcesSelected');
        } else {
          if (forChannels) {
            return this.$tr('someChannelsSelected', {
              count,
              bytesText: this.bytesText,
            });
          } else {
            return this.$tr('someResourcesSelected', { bytesText: '0', count });
          }
        }
      },
    },
    watch: {
      selectedObjectsFileSize(value) {
        this.$emit('update:fileSize', value);
      },
    },
    $trs: {
      importAction: 'Import',
      exportAction: 'Export',
      deleteAction: 'Delete',
      zeroChannelsSelected: '0 channels selected',
      someChannelsSelected:
        '{count} {count, plural, one {channel} other {channels}} selected ({bytesText})',
      zeroResourcesSelected: '0 resources selected',
      someResourcesSelected:
        '{count} {count, plural, one {resource} other {resources}} selected ({bytesText})',
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    margin-right: 32px;
  }

</style>
