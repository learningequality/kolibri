<template>

  <input
    v-if="interactive"
    v-model="variable"
    :class="['qti-text-entry-interaction', $computedClass({ ':focus': coreOutline })]"
    :aria-label="`${$tr('textEntryLabel')} ${responseIdentifier}`"
    :placeholder="placeholder"
    :style="{
      minWidth: `${Math.min(expectedLength ?? 20, 20)}ch`,
      maxWidth: '90%',
      border: `1px solid ${$themeTokens.fineLine}`,
    }"
    :type="inputType"
    autocomplete="off"
  >
  <div
    v-else
    class="qti-text-entry-interaction qti-text-entry-interaction-report"
  >
    {{ variable || placeholder }}
  </div>

</template>


<script>

  import { computed, getCurrentInstance, inject } from 'vue';
  import useTypedProps from '../../composables/useTypedProps';
  import {
    NumberProp,
    QTIIdentifierProp,
    NonNegativeIntProp,
    StringProp,
    FormatProp,
  } from '../../utils/props';
  import { BASE_TYPE } from '../../constants';

  export default {
    name: 'TextEntryInteraction',
    tag: 'qti-text-entry-interaction',

    setup(props) {
      const { proxy } = getCurrentInstance();
      const responses = inject('responses');
      const typedProps = useTypedProps(props);
      const interactive = inject('interactive');

      const inputDeclaration = computed(() => {
        return responses[typedProps.responseIdentifier.value];
      });

      const variable = computed({
        get() {
          return inputDeclaration.value.value || '';
        },
        set(newValue) {
          inputDeclaration.value.value = newValue;
        },
      });

      const inputType = computed(() => {
        const baseType = inputDeclaration.value?.baseType;
        if (baseType === BASE_TYPE.INTEGER || baseType === BASE_TYPE.FLOAT) {
          return 'number';
        }
        return 'text';
      });

      return {
        variable,
        placeholder: typedProps.placeholderText,
        interactive,
        inputType,
        coreOutline: proxy.$coreOutline,
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
    $trs: {
      textEntryLabel: {
        message: 'Text entry',
        context: 'Accessible label for a text input field in an assessment question',
      },
    },
  };

</script>


<style scoped>

  .qti-text-entry-interaction {
    padding: 4px 8px;
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
