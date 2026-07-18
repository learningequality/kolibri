<template>

  <ol
    v-if="hints.length"
    class="qti-hints"
    aria-live="polite"
  >
    <li
      v-for="(hint, index) in hints"
      :key="index"
      class="qti-hint"
    >
      <div
        class="qti-hint-label"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ hintLabel$({ number: index + 1 }) }}
      </div>
      <SafeHTML :html="hint" />
    </li>
  </ol>

</template>


<script>

  import SafeHTML from 'kolibri-common/components/SafeHTML';
  import { createTranslator } from 'kolibri/utils/i18n';

  const strings = createTranslator('QTIHintsStrings', {
    hintLabel: {
      message: 'Hint {number, number}',
      context: 'Label shown above each revealed hint in a QTI question, e.g. "Hint 1".',
    },
  });

  const { hintLabel$ } = strings;

  export default {
    name: 'QTIHints',
    components: {
      SafeHTML,
    },
    setup() {
      return { hintLabel$ };
    },
    props: {
      hints: {
        type: Array,
        default: () => [],
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qti-hints {
    padding: 0;
    margin: 16px 0 0;
    list-style: none;
  }

  .qti-hint {
    margin-bottom: 16px;
  }

  .qti-hint-label {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: bold;
  }

</style>
