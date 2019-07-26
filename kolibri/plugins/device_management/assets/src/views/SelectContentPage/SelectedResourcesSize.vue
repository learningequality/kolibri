<template>

  <KGrid>
    <KGridItem sizes="100, 75, 75" percentage>
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
    </KGridItem>
    <KGridItem sizes="100, 25, 25" percentage alignments="left, right, right">
      <KButton
        class="confirm-button"
        :text="buttonText"
        :primary="true"
        :disabled="buttonIsDisabled"
        :style="{ top: buttonOffset }"
        @click="$emit('clickconfirm')"
      />
    </KGridItem>
    <KGridItem size="100" percentage>
      <UiAlert
        v-if="remainingSpaceAfterTransfer <= 0"
        type="error"
        :dismissible="false"
      >
        {{ $tr('notEnoughSpace') }}
      </UiAlert>
    </KGridItem>
  </KGrid>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import UiAlert from 'keen-ui/src/UiAlert';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  const RequiredNumber = { type: Number, required: true };

  export default {
    name: 'SelectedResourcesSize',
    components: {
      KButton,
      KGrid,
      KGridItem,
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
        return this.resourceCount === 0 || this.remainingSpaceAfterTransfer <= 0;
      },
      remainingSpaceAfterTransfer() {
        return Math.max(this.spaceOnDrive - this.fileSize, 0);
      },
      fileSizeText() {
        return this.$tr('resourcesSelected', {
          fileSize: bytesForHumans(this.fileSize),
          resources: this.resourceCount,
        });
      },
      buttonOffset() {
        if (this.windowIsSmall) {
          return '0';
        }
        return '72px';
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
    },
  };

</script>


<style lang="scss" scoped>

  .confirm-button {
    position: relative;
    margin: 0;
  }

</style>
