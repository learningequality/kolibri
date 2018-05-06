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

    <span class="remaining-space">
      {{ $tr('remainingSpace', { space: bytesForHumans(remainingSpaceAfterTransfer) }) }}
    </span>

    <div class="resources-selected">
      <span class="resources-selected-message">
        {{
          $tr('resourcesSelected', { fileSize: bytesForHumans(fileSize), resources: resourceCount })
        }}
      </span>

      <k-button
        :text="buttonText"
        :primary="true"
        :disabled="buttonIsDisabled"
        @click="$emit('clickconfirm')"
      />
    </div>


    <ui-alert
      v-if="remainingSpaceAfterTransfer<=0"
      type="error"
      :dismissible="false"
    >
      {{ $tr('notEnoughSpace') }}
    </ui-alert>
  </section>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert.vue';
  import bytesForHumans from '../manage-content-page/bytesForHumans';

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

  .selected-resources-size
    // using table to separate element by alignment while keeping them on the same line
    // avoids magic numbers, keeps text lined up.
    display: table
    line-height: 1em
    width: 100%


  .choose-message
    display: table-row
    padding: 8px 0
    font-weight: bold

  .remaining-space
    text-align: left
    display: table-cell

  .resources-selected
    text-align: right
    display: table-cell

</style>
