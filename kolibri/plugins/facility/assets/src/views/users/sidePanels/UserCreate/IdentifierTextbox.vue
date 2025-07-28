<template>

  <div class="pos-rel">
    <KTextbox
      class="identifier-textbox"
      :value="value"
      :label="$tr('label')"
      :maxlength="64"
      v-bind="$attrs"
      @input="$emit('update:value', $event)"
    />
    <CoreInfoIcon
      class="info-icon"
      :tooltipText="coreString('identifierInputTooltip')"
      :tooltipPlacement="tooltipPlacement"
      :iconAriaLabel="coreString('identifierAriaLabel')"
    />
  </div>

</template>


<script>

  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'IdentifierTextbox',
    components: {
      CoreInfoIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return { windowIsSmall };
    },
    props: {
      value: {
        type: String,
        default: null,
      },
    },
    computed: {
      tooltipPlacement() {
        if (this.windowIsSmall) {
          return 'left';
        }
        return 'bottom';
      },
    },
    $trs: {
      label: {
        message: 'Identifier (Optional)',
        context: 'Optional type of data that can be used on an imported spreadsheet.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  // Copied from BirthYearSelect
  .pos-rel {
    position: relative;
  }

  .identifier-textbox {
    width: calc(100% - 32px);
  }

  .info-icon {
    position: absolute;
    top: 27px;
    right: 0;
  }

  /deep/ .k-tooltip {
    max-width: 300px;
  }

</style>
