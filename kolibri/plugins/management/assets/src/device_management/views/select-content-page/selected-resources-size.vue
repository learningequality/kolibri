<template>

  <section class="selected-resources-size">
    <div class="choose-message">
      <span v-if="isInImportMode">
        {{ $tr('chooseContentToImport') }}
      </span>
      <span v-else>
        {{ $tr('chooseContentToExport') }}
      </span>
    </div>
    <div class="resources-selected">
      <div class="resources-selected-message">
        {{ $tr('resourcesSelected', { fileSize: bytesForHumans(fileSize), resources: resourceCount }) }}
      </div>

      <k-button
        :text="buttonText"
        :disabled="buttonIsDisabled"
        @click="$emit('clickconfirm')"
      />
    </div>

    <div class="remaining-space">
      {{ $tr('remainingSpace', { space: bytesForHumans(remainingSpaceAfterTransfer) }) }}
    </div>

    <ui-alert
      v-if="remainingSpaceAfterTransfer<=0"
      type="error"
      :dismissable="false"
    >
      {{ $tr('notEnoughSpace') }}
    </ui-alert>
  </section>

</template>


<script>

  import bytesForHumans from '../manage-content-page/bytesForHumans';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert.vue';

  const RequiredNumber = { type: Number, required: true };

  export default {
    name: 'selectedResourcesSize',
    components: {
      kButton,
      uiAlert,
    },
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
      remainingSpace: 'Your remaining space: {space}',
      resourcesSelected: 'Resources selected: {resources, number, integer} ({fileSize})',
    },
  };

</script>


<style lang="stylus" scoped>

  .choose-message
    padding: 8px 0
    font-weight: bold

  .resources-selected
    margin: 8px 0
    &-message
      display: inline
    button
      display: inline


  .remaining-space
    text-align: right
    margin-top: -24px
    margin-bottom: 8px

</style>
