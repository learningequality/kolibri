<template>

  <input
    v-if="interactive"
    v-model="variable"
    class="qti-text-entry-interaction qti-text-entry-interaction-interactive"
    :placeholder="placeholder"
    :style="{
      minWidth: `${Math.min(expectedLength ?? 20, 20)}ch`,
      maxWidth: '90%',
    }"
  >
  <div
    v-else
    class="qti-text-entry-interaction qti-text-entry-interaction-report"
  >
    {{ variable || placeholder }}
  </div>

</template>


<script>

  import { computed, inject } from 'vue';
  import useTypedProps from '../../composables/useTypedProps';
  import {
    NumberProp,
    QTIIdentifierProp,
    NonNegativeIntProp,
    StringProp,
    FormatProp,
  } from '../../utils/props';

  export default {
    name: 'TextEntryInteraction',
    tag: 'qti-text-entry-interaction',

    setup(props) {
      const responses = inject('responses');
      const typedProps = useTypedProps(props);
      const interactive = inject('interactive');

      const variable = computed({
        get() {
          const v = responses[typedProps.responseIdentifier.value];
          return v.value || '';
        },
        set(newValue) {
          const v = responses[typedProps.responseIdentifier.value];
          v.value = newValue;
        },
      });

      return {
        variable,
        placeholder: typedProps.placeholderText,
        interactive,
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      responseIdentifier: QTIIdentifierProp(true),
      base: NumberProp(false),
      stringIdentifier: QTIIdentifierProp(false),
      expectedLength: NonNegativeIntProp(false),
      patternMask: StringProp(false),
      placeholderText: StringProp(false),
      format: FormatProp(false),
      /* eslint-enable */
    },
  };

</script>


<style scoped>

  .qti-text-entry-interaction-interactive {
    padding: 8px;
    font-family: inherit;
    font-size: inherit;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  .qti-text-entry-interaction-report {
    box-sizing: border-box;
    width: 100%;
    min-height: 1.5em;
    padding: 8px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    background-color: #f8f9fa;
    border-radius: 4px;
  }

</style>
