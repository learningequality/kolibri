<template>

  <section>
    <div class="counters">
      <div class="choose-message">
        <span v-if="isInImportMode">
          {{ $tr('chooseContentToImport') }}
        </span>
        <span v-else>
          {{ $tr('chooseContentToExport') }}
        </span>
      </div>

      <div class="table-row">
        <span class="remaining-space">
          {{ $tr('remainingSpace', { space: bytesForHumans(remainingSpaceAfterTransfer) }) }}
        </span>

        <div class="resources-selected">
          <span class="resources-selected-message">
            {{ fileSizeText }}
          </span>

          <k-button
            class="confirm-button"
            :text="buttonText"
            :primary="true"
            :disabled="buttonIsDisabled"
            @click="$emit('clickconfirm')"
          />
        </div>
      </div>
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

  import KButton from 'kolibri.coreVue.components.KButton';
  import uiAlert from 'keen-ui/src/UiAlert.vue';
  import bytesForHumans from '../ManageContentPage/bytesForHumans';

  const RequiredNumber = { type: Number, required: true };

  export default {
    name: 'SelectedResourcesSize',
    components: {
      KButton,
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
      fileSizeText() {
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
      remainingSpace: 'Your remaining space: {space}',
      resourcesSelected: 'Resources selected: {resources, number, integer} ({fileSize})',
    },
  };

</script>


<style lang="scss" scoped>

  .counters {
    // using table to separate element by alignment while keeping them on the same line
    // avoids magic numbers, keeps text lined up.
    display: table;
    width: 100%;
    line-height: 1em;
  }

  .choose-message {
    display: table-row;
    padding: 8px 0;
    font-weight: bold;
  }

  .remaining-space {
    display: table-cell;
    text-align: left;
  }

  .resources-selected {
    display: table-cell;
    text-align: right;
  }

  .table-row {
    display: table-row;
  }

  .confirm-button {
    margin-right: 0;
  }

</style>
