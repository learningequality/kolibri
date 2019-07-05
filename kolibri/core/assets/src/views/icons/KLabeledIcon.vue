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
        <slot></slot>
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
