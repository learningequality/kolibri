<template>

  <p
    v-if="text"
    class="qti-selection-instructions"
    :style="instructionStyles"
  >
    {{ text }}
  </p>

</template>


<script>

  import { computed } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();

  export default {
    name: 'AnswerGuide',
    setup() {
      const instructionStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
        color: $themeTokens.text,
      }));

      return {
        instructionStyles,
      };
    },
    props: {
      text: {
        type: String,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qti-selection-instructions {
    padding: 0.75rem 1.125rem;
    margin: 0 0 0.5rem;
    font-weight: 700;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

</style>
