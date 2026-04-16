<template>

  <input
    v-if="interactive"
    v-model="variable"
    v-bind="inputAttrs"
    :class="['qti-text-entry-interaction', attrsClass, $computedClass({ ':focus': coreOutline })]"
    :aria-label="textEntryLabel$()"
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
    :class="['qti-text-entry-interaction', 'qti-text-entry-interaction-report', attrsClass]"
  >
    {{ variable || placeholder }}
  </div>

</template>


<script>

  import { computed, inject } from 'vue';
  import { themeTokens, themeOutlineStyle } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import useTypedProps from '../../composables/useTypedProps';
  import {
    NumberProp,
    QTIIdentifierProp,
    NonNegativeIntProp,
    StringProp,
    FormatProp,
  } from '../../utils/props';
  import { BASE_TYPE } from '../../constants';

  const $themeTokens = themeTokens();

  const strings = createTranslator('TextEntryInteractionStrings', {
    textEntryLabel: {
      message: 'Your answer',
      context: 'Accessible label for a text input field in an assessment question',
    },
  });

  const { textEntryLabel$ } = strings;

  export default {
    name: 'TextEntryInteraction',
    tag: 'qti-text-entry-interaction',
    inheritAttrs: false,

    setup(props, context) {
      const responses = inject('responses', {});
      const typedProps = useTypedProps(props);
      const interactive = inject('interactive', true);

      const getContextAttrs = () => {
        if (!context || !context.attrs) {
          return {};
        }
        return context.attrs;
      };

      const ALLOWED_INPUT_ATTRS = new Set([
        'id',
        'name',
        'value',
        'disabled',
        'readonly',
        'required',
        'min',
        'max',
        'step',
        'minlength',
        'maxlength',
        'inputmode',
        'spellcheck',
        'autocapitalize',
        'autocorrect',
        'enterkeyhint',
        'tabindex',
        'title',
        'lang',
        'dir',
        'autofocus',
        'list',
      ]);

      const isPrimitiveAttrValue = value => {
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
      };

      const isAriaOrDataAttr = name => {
        return name.startsWith('aria-') || name.startsWith('data-');
      };

      const inputAttrs = computed(() => {
        return Object.entries(getContextAttrs()).reduce((forwardedAttrs, [name, value]) => {
          if (name === 'class') {
            return forwardedAttrs;
          }
          if (name === 'style') {
            forwardedAttrs[name] = value;
            return forwardedAttrs;
          }
          if (name === 'placeholder-text') {
            return forwardedAttrs;
          }
          if (name === 'placeholder' || name === 'type' || name === 'aria-label') {
            return forwardedAttrs;
          }
          if (!isPrimitiveAttrValue(value)) {
            return forwardedAttrs;
          }
          if (ALLOWED_INPUT_ATTRS.has(name) || isAriaOrDataAttr(name)) {
            forwardedAttrs[name] = value;
          }
          return forwardedAttrs;
        }, {});
      });

      const attrsClass = computed(() => getContextAttrs().class);

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
        $themeTokens,
        textEntryLabel$,
        variable,
        placeholder: typedProps.placeholderText,
        interactive,
        inputType,
        coreOutline: themeOutlineStyle(),
        inputAttrs,
        attrsClass,
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
