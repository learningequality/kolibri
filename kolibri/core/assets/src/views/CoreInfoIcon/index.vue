<template>

  <span class="pos-rel">
    <UiIcon
      ref="icon"
      class="info-icon"
      :iconAriaLabel="iconAriaLabel"
    >
      <mat-svg name="info" category="action" />
    </UiIcon>
    <KTooltip
      v-if="ready"
      :reference="$refs.icon.$el"
      :placement="tooltipPlacement"
    >
      {{ tooltipText }}
    </KTooltip>
  </span>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'CoreInfoIcon',
    components: {
      UiIcon,
      KTooltip,
    },
    props: {
      iconAriaLabel: {
        type: String,
        required: true,
      },
      tooltipText: {
        type: String,
        required: true,
      },
      tooltipPlacement: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        ready: false,
      };
    },
    mounted() {
      this.ready = true;
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .info-icon {
    display: inline-block;
    font-size: 1.2em;
    color: $core-accent-color;
    vertical-align: top;
    cursor: pointer;
  }

  .pos-rel {
    position: relative;
  }

</style>
