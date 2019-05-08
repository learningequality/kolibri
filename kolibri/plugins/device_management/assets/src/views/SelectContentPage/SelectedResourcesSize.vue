<template>

  <div>
    <h3 v-if="isInImportMode" class="choose-message">
      {{ $tr('chooseContentToImport') }}
    </h3>
    <h3 v-else class="choose-message">
      {{ $tr('chooseContentToExport') }}
    </h3>
    <p class="available-space">
      {{ $tr('availableSpace', { space: bytesForHumans(spaceOnDrive) }) }}
    </p>
    <p class="resources-selected-message">
      {{ fileSizeText }}
    </p>
    <KButton
      class="confirm-button"
      :text="buttonText"
      :primary="true"
      :disabled="buttonIsDisabled"
      @click="$emit('clickconfirm')"
    />
    <KCircularLoader
      v-if="loading"
      class="loader"
    />
    <UiAlert
      v-if="!estimatedQuantities && remainingSpaceAfterTransfer <= 0"
      type="error"
      :dismissible="false"
    >
      {{ $tr('notEnoughSpace') }}
    </UiAlert>
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import UiAlert from 'keen-ui/src/UiAlert';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  const RequiredNumber = { type: Number, required: true };

  export default {
    name: 'SelectedResourcesSize',
    components: {
      KButton,
      KCircularLoader,
      UiAlert,
    },
    mixins: [responsiveWindow],
    props: {
      mode: {
        type: String,
        required: true,
        validator(val) {
          return val === 'import' || val === 'export';
        },
      },
      estimatedQuantities: {
        type: Boolean,
        default: false,
      },
      loading: {
        type: Boolean,
        default: false,
      },
      fileSize: RequiredNumber,
      resourceCount: RequiredNumber,
      spaceOnDrive: RequiredNumber,
    },
    computed: {
      isInImportMode() {
        return this.mode === 'import';
      },
      buttonText() {
        return this.isInImportMode ? this.$tr('import') : this.$tr('export');
      },
      buttonIsDisabled() {
        return (
          this.loading ||
          this.resourceCount === 0 ||
          (!this.estimatedQuantities && this.remainingSpaceAfterTransfer <= 0)
        );
      },
      remainingSpaceAfterTransfer() {
        return Math.max(this.spaceOnDrive - this.fileSize, 0);
      },
      fileSizeText() {
        if (this.estimatedQuantities) {
          return this.$tr('estimatedResourcesSelected', {
            fileSize: bytesForHumans(this.fileSize),
            resources: this.resourceCount,
          });
        }
        return this.$tr('resourcesSelected', {
          fileSize: bytesForHumans(this.fileSize),
          resources: this.resourceCount,
        });
      },
    },
    methods: {
      bytesForHumans,
    },
    $trs: {
      chooseContentToExport: 'Choose content to export',
      chooseContentToImport: 'Choose content to import',
      export: 'export',
      import: 'import',
      notEnoughSpace: 'Not enough space on your device. Select less content to make more space.',
      availableSpace: 'Drive space available: {space}',
      resourcesSelected:
        'Content selected: {fileSize} ({resources, number, integer} {resources, plural, one {resource} other {resources}})',
      estimatedResourcesSelected:
        'Estimated content selected: {fileSize} ({resources, number, integer} {resources, plural, one {resource} other {resources}})',
    },
  };

</script>


<style lang="scss" scoped>

  .confirm-button {
    margin-top: 0;
    margin-left: 0;
  }

  .loader {
    display: inline-block;
    vertical-align: middle;
  }

</style>
