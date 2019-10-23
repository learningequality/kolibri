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
      @change="setLanguage(value)"
    />
  </li>

</template>


<script>

  import { mapActions, mapState } from 'vuex';

  export default {
    name: 'CaptionsMenuItem',

    props: {
      label: {
        type: String,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },

    computed: {
      ...mapState('mediaPlayer/captions', ['language']),
      selected() {
        return this.language === this.value;
      },
    },

    methods: {
      ...mapActions('mediaPlayer/captions', ['setLanguage']),
    },
  };

</script>


<style lang="scss" scoped>

  li {
    text-align: left !important;
  }

</style>
