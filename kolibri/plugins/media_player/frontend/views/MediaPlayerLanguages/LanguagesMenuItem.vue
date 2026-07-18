<template>

  <li class="vjs-languages-menu-item vjs-menu-item">
    <KRadioButton
      ref="kRadioButton"
      name="languages-menu-item"
      :label="label"
      :buttonValue="1"
      :currentValue="selected ? 1 : 0"
      @change="setLanguage(value)"
      @keydown.enter="(setLanguage(value), $emit('hide'))"
    />
  </li>

</template>


<script>

  import { computed } from 'vue';
  import { injectMediaPlayer } from '../../composables/useMediaPlayer';

  export default {
    name: 'LanguagesMenuItem',
    setup(props) {
      const { language, setLanguage } = injectMediaPlayer();

      const selected = computed(() => language.value === props.value);

      return {
        selected,
        setLanguage,
      };
    },
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
    methods: {
      /**
       * Accessible via parent component refs.
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
