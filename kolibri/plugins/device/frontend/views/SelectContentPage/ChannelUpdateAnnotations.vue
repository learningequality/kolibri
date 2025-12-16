<template>

  <span :class="[styleClass, $computedClass(style)]">
    {{ label }}
  </span>

</template>


<script>

  import commonDeviceStrings from '../commonDeviceStrings';

  export default {
    name: 'ChannelUpdateAnnotations',
    mixins: [commonDeviceStrings],
    props: {
      newResources: {
        type: Number,
        default: 0,
      },
      isTopic: {
        type: Boolean,
        default: false,
      },
      importing: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      new() {
        return this.newResources > 0;
      },
      styleClass() {
        if (this.new) {
          // Doing this separately from the dynamic styling below
          // to ensure things get properly RTL transpiled in CSS
          return ['new-label'];
        }
        return [];
      },
      style() {
        if (this.new) {
          return {
            color: this.$themeTokens.textInverted,
            backgroundColor: this.$themeTokens.success,
            '::selection': {
              color: this.$themeTokens.text,
            },
          };
        }
        return {};
      },
      label() {
        if (this.new && this.isTopic === false) {
          return this.deviceString('newResourceLabel');
        } else if (this.new && this.isTopic === true) {
          return this.$tr('newResourcesInTopic', { count: this.newResources });
        } else if (this.importing) {
          return this.$tr('inQueueForImport');
        }
        return '';
      },
    },
    $trs: {
      newResourcesInTopic: {
        message: '{count} {count, plural, one {new} other {new}}',
        context:
          "Refers to 'resources'; will appear as a label displayed on topics with new resources that were added after upgrading the channel",
      },
      inQueueForImport: {
        message: 'In queue for import',
        context:
          'Label that is with resources that are not selectable for import since they are being re-downloaded after upgrading the channel',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .new-label {
    top: 2px;
    display: inline-block;
    padding: 2px 8px;
    margin-left: 8px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 2px;
  }

</style>
