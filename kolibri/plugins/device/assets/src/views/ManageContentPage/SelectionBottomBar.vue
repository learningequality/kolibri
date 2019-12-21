<template>

  <BottomAppBar>
    <span class="message">{{ selectedMessage }}</span>
    <template v-if="actionType === 'manage'">
      <KButton
        :disabled="$attrs.disabled || buttonsDisabled"
        :text="coreString('deleteAction')"
        :primary="false"
        @click="$emit('selectoption', 'DELETE')"
      />
      <KButton
        :disabled="$attrs.disabled || buttonsDisabled"
        :text="$tr('exportAction')"
        :primary="true"
        @click="$emit('selectoption', 'EXPORT')"
      />
    </template>

    <KButton
      v-else
      :disabled="$attrs.disabled || buttonsDisabled"
      :text="confirmButtonLabel"
      :primary="true"
      @click="$emit('clickconfirm')"
    />
  </BottomAppBar>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  // Shows a 'EXPORT', 'IMPORT', or 'DELETE' button next to a message
  // of how many items are selected plus their size.
  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      // TODO remove this and only pass in resourceCounts object
      selectedObjects: {
        type: Array,
        default() {
          return [];
        },
      },
      resourceCounts: {
        type: Object,
        required: false,
        validator(value) {
          return typeof value.count === 'number' && typeof value.fileSize === 'number';
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
          return (
            value === 'import' || value === 'export' || value === 'delete' || value === 'manage'
          );
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
      buttonsDisabled() {
        if (this.objectType === 'resource') {
          return this.resourceCounts.count === 0;
        } else {
          return this.selectedObjects === 0;
        }
      },
      selectedObjectsFileSize() {
        if (
          this.objectType === 'channel' &&
          (this.actionType === 'export' || this.actionType === 'delete')
        ) {
          return sumBy(this.selectedObjects, 'on_device_file_size');
        } else if (this.objectType === 'channel' && this.actionType === 'import') {
          return sumBy(this.selectedObjects, 'total_file_size');
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
        const forChannels = this.objectType === 'channel';
        if (forChannels) {
          const count = this.selectedObjects.length;
          if (count === 0) {
            return this.$tr('channelsSelectedNoFileSize', { count: 0 });
          } else if (!this.selectedObjectsFileSize) {
            // NOTE: when importing from drive, file sizes aren't known for whole channels
            return this.$tr('channelsSelectedNoFileSize', { count });
          } else {
            return this.$tr('channelsSelectedWithFileSize', {
              count,
              bytesText: this.bytesText,
            });
          }
        } else {
          const { count, fileSize } = this.resourceCounts;
          if (count === 0) {
            return this.$tr('zeroResourcesSelected');
          } else {
            return this.$tr('someResourcesSelected', {
              bytesText: bytesForHumans(fileSize),
              count,
            });
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
      channelsSelectedNoFileSize:
        '{count, number} {count, plural, one {channel} other {channels}} selected',
      channelsSelectedWithFileSize:
        '{count} {count, plural, one {channel} other {channels}} selected ({bytesText})',
      zeroResourcesSelected: '0 resources selected',
      someResourcesSelected:
        '{count} {count, plural, one {resource} other {resources}} selected ({bytesText})',
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    display: inline-block;
    margin-right: 16px;
  }

</style>
