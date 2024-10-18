<template>

  <BottomAppBar>
    <template v-if="actionType === 'manage'">
      <KButtonGroup>
        <span class="message">{{ selectedMessage }}</span>
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
      </KButtonGroup>
    </template>

    <template v-else>
      <span class="message">{{ selectedMessage }}</span>
      <KButton
        :disabled="$attrs.disabled || buttonsDisabled"
        :text="confirmButtonLabel"
        :primary="true"
        @click="$emit('clickconfirm')"
      />
    </template>
  </BottomAppBar>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import isEmpty from 'lodash/isEmpty';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import BottomAppBar from 'kolibri/components/BottomAppBar';

  // Shows a 'EXPORT', 'IMPORT', or 'DELETE' button next to a message
  // of how many items are selected plus their size.
  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    mixins: [commonCoreStrings],
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
        default: () => ({}),
        validator(value) {
          if (isEmpty(value)) {
            return true;
          }
          return typeof value.count === 'number' && typeof value.fileSize === 'number';
        },
      },
      objectType: {
        type: String,
        default: null,
        validator(value) {
          return value === 'channel' || value === 'resource';
        },
      },
      actionType: {
        type: String,
        default: null,
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
      importAction: {
        message: 'Import',
        context: 'Refers to a button the user uses to import resources.',
      },
      exportAction: {
        message: 'Export',
        context: 'Refers to a button the user uses to export resources.',
      },
      deleteAction: {
        message: 'Delete',
        context: 'Refers to a button the user uses to delete resources.',
      },
      channelsSelectedNoFileSize: {
        message:
          '{count, number} {count, plural, one {channel selected} other {channels selected}}',
        context:
          "Indicates the amount of channels selected to import. For example:\n\n'7 channels selected'",
      },
      channelsSelectedWithFileSize: {
        message:
          '{count} {count, plural, one {channel selected} other {channels selected}} ({bytesText})',
        context:
          "Indicates the amount of channels selected to import along with the file size. For example:\n\n'7 channels (22 GB)'",
      },
      zeroResourcesSelected: {
        message: 'No resources selected',
        context: 'Indicates that the user has selected no resources.',
      },
      someResourcesSelected: {
        message:
          '{count} {count, plural, one {resource selected} other {resources selected}} ({bytesText})',

        context:
          "Indicates the amount of resources selected to import along with the file size. For example:\n\n'727 resources selected (22 GB)'",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    display: inline-block;
    margin-right: 16px;
  }

</style>
