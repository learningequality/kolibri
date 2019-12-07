<template>

  <li class="vjs-menu-item vjs-languages-menu-item">
    <KRadioButton
      ref="kRadioButton"
      name="languages-menu-item"
      :label="label"
      :value="1"
      :currentValue="selected ? 1 : 0"
      @change="setLanguage(value)"
      @keydown.enter="setLanguage(value), $emit('hide')"
    />
  </li>

</template>


<script>

  import { mapActions, mapState } from 'vuex';

  export default {
    name: 'LanguagesMenuItem',
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
      /**
       * @public
       */
      focus() {
        // When focused, radio button should activate
        this.setLanguage(this.value);
        this.$nextTick(() => this.$refs.kRadioButton.focus());
      },
    },
  };

</script>


<style lang="scss" scoped>

  li {
    text-align: left !important;
  }

</style>
