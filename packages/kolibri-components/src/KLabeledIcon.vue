<template>

  <span class="labeled-icon-wrapper">
    <div class="icon">
      <slot name="icon">
        <KIcon v-if="icon" :icon="icon" />
      </slot>
    </div>
    <div class="label">
      <!-- nest slot inside span to get alignment and flow correct for mixed RLT/LTR -->
      <span dir="auto">
        <!-- Use zero-width space when empty -->
        <slot v-if="!labelEmpty">{{ label }}</slot>
        <template v-else>&#8203;</template>
      </span>
    </div>
  </span>

</template>


<script>

  import KIcon from './KIcon';

  export default {
    name: 'KLabeledIcon',
    components: {
      KIcon,
    },
    props: {
      // If provided, will render a KIcon with the same 'icon' prop
      icon: {
        type: String,
        required: false,
      },
      // If provided, will place this text in the default slot
      label: {
        type: String,
        required: false,
      },
    },
    computed: {
      labelEmpty() {
        const defaultSlot =
          'default' in this.$slots && this.$slots.default.length
            ? this.$slots.default[0].text
            : null;

        return !defaultSlot && !this.label;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .labeled-icon-wrapper {
    position: relative;
    display: inline-block;
  }

  .icon {
    position: absolute;
    left: 0;
  }

  .label {
    display: block;
    margin-left: 1.925em;
  }

  .label svg {
    // if you see this, you need to pass the icon into the slot
    border: 1px solid red;
  }

</style>
