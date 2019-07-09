<template>

  <li
    class="vjs-menu-item vjs-captions-menu-item"
    role="menuitem"
    :aria-checked="selected.toString()"
    tabindex="-1"
  >
    <KRadioButton
      name="captions-menu-item"
      :label="label"
      :value="1"
      :currentValue="selected ? 1 : 0"
      @change="$emit('change', $event)"
    />
  </li>

</template>


<script>

  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';

  export default {
    name: 'CaptionsMenuItem',

    components: { KRadioButton },

    props: {
      label: {
        type: String,
        required: true,
      },
      selected: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  li {
    text-align: left !important;
  }

</style>
