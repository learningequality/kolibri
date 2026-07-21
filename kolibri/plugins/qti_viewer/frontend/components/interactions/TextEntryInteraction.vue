<template>

  <div class="qti-text-entry-interaction-wrapper">
    <AnswerGuide :text="answerGuideText" />
    <input
      v-if="interactive"
      ref="inputEl"
      v-bind="inputAttrs"
      :value="rawValue"
      :class="['qti-text-entry-interaction', attrsClass, $computedClass({ ':focus': coreOutline })]"
      :aria-label="textEntryLabel$()"
      :placeholder="placeholder"
      :inputmode="inputMode"
      :style="{ ...widthStyle, border: `1px solid ${$themeTokens.fineLine}` }"
      type="text"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    >
    <div
      v-else
      :class="['qti-text-entry-interaction', 'qti-text-entry-interaction-report', attrsClass]"
      :style="widthStyle"
    >
      {{ reportDisplayValue || placeholder }}
    </div>
  </div>

</template>


<script>

  import { computed, inject, nextTick, onBeforeUnmount, ref, unref, watch } from 'vue';
  import { themeTokens, themeOutlineStyle } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import { injectKeypad } from 'kolibri-common/composables/useKeypad';
  import { normalizeNumerals, localizeNumerals } from 'kolibri-common/utils/numeralNormalization';
  import useTypedProps from '../../composables/useTypedProps';
  import {
    NumberProp,
    QTIIdentifierProp,
    NonNegativeIntProp,
    StringProp,
    FormatProp,
  } from '../../utils/props';
  import { BASE_TYPE } from '../../constants';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';

  const $themeTokens = themeTokens();

  const strings = createTranslator('TextEntryInteractionStrings', {
    textEntryLabel: {
      message: 'Your answer',
      context: 'Accessible label for a text input field in an assessment question',
    },
  });

  const { textEntryLabel$ } = strings;

  // prevent keys that are not valid for the baseType from being added to the input field
  const SIMPLE_KEY_CHARS = {
    DECIMAL: '.',
    PERCENT: '%',
    PI: 'π',
    FRAC: '⁄',
  };
  const ALWAYS_EXCLUDED_KEYS = ['PERCENT', 'PI', 'FRAC'];

  const INPUT_WIDTH_CLASS = /(?:^|\s)qti-input-width-(\d+)(?=\s|$)/;
  // Horizontal padding and border of .qti-text-entry-interaction, which is border-box sized.
  const INPUT_HORIZONTAL_CHROME = '18px';
  const DEFAULT_WIDTH_CHARS = 20;

  export default {
    name: 'TextEntryInteraction',
    tag: 'qti-text-entry-interaction',
    components: {
      AnswerGuide,
    },
    inheritAttrs: false,

    setup(props, context) {
      const responses = inject('responses', {});
      const typedProps = useTypedProps(props);
      const interactive = inject('interactive', true);
      const keypad = injectKeypad();
      const lang = inject('lang', ref(null));

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

      // `qti-input-width-N`
      const inputWidthChars = computed(() => {
        const match = INPUT_WIDTH_CLASS.exec(attrsClass.value || '');
        return match ? Number(match[1]) : null;
      });

      const widthStyle = computed(() => {
        if (inputWidthChars.value === null) {
          // expected-length is only a hint at the answer's size, so it just sets a floor
          const expected =
            props.expectedLength == null ? DEFAULT_WIDTH_CHARS : typedProps.expectedLength.value;
          return { minWidth: `${Math.min(expected, DEFAULT_WIDTH_CHARS)}ch` };
        }
        // The character count is the room for the text, so the box-sizing chrome sits outside it.
        return {
          width: `calc(${inputWidthChars.value}ch + ${INPUT_HORIZONTAL_CHROME})`,
          maxWidth: '100%',
        };
      });

      const inputDeclaration = computed(() => {
        return responses.value[typedProps.responseIdentifier.value];
      });

      const baseType = computed(() => inputDeclaration.value?.baseType);

      const isNumeric = computed(() => {
        return baseType.value === BASE_TYPE.INTEGER || baseType.value === BASE_TYPE.FLOAT;
      });

      const rawValue = ref(
        inputDeclaration.value?.value == null ? '' : String(inputDeclaration.value.value),
      );
      const lastCommittedRaw = ref(rawValue.value);

      // To keep rawValue in sync with the underlying response variable
      watch(
        () => inputDeclaration.value?.value,
        newVal => {
          const v = newVal == null ? '' : String(newVal);
          if (v !== lastCommittedRaw.value) {
            rawValue.value = v;
            lastCommittedRaw.value = v;
          }
        },
      );

      function commit(newRaw) {
        if (!inputDeclaration.value) {
          return false;
        }
        const candidate = isNumeric.value ? normalizeNumerals(newRaw) : newRaw;
        try {
          inputDeclaration.value.value = candidate;
          lastCommittedRaw.value = candidate;
          return true;
        } catch (e) {
          return false;
        }
      }

      function onInput(event) {
        rawValue.value = event.target.value;
        commit(rawValue.value);
      }

      // Report-mode display only
      const reportDisplayValue = computed(() => {
        if (!isNumeric.value) {
          return lastCommittedRaw.value;
        }
        const langId = unref(lang)?.id ?? unref(lang);
        return localizeNumerals(lastCommittedRaw.value, langId);
      });

      const inputMode = computed(() => (isNumeric.value ? 'decimal' : undefined));

      // --- Keypad wiring
      // Caret is a plain index into the flat string here — not Perseus's
      // expression-tree cursor. The returned value feeds the composable's
      // opaque cursor ref; this component doesn't read it back.

      const inputEl = ref(null);

      const excludeKeys = computed(() => {
        const keys = [...ALWAYS_EXCLUDED_KEYS];
        if (baseType.value === BASE_TYPE.INTEGER) {
          // A decimal point isn't a valid integer literal character.
          keys.push('DECIMAL');
        }
        return keys;
      });

      function setCaret(pos) {
        nextTick(() => {
          if (inputEl.value) {
            inputEl.value.setSelectionRange(pos, pos);
          }
        });
      }

      function handleKey(keyId) {
        const el = inputEl.value;
        if (!el) {
          return null;
        }
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        let value = rawValue.value;
        let caret = start;

        if (keyId === 'BACKSPACE') {
          if (start !== end) {
            value = value.slice(0, start) + value.slice(end);
          } else if (start > 0) {
            value = value.slice(0, start - 1) + value.slice(start);
            caret = start - 1;
          }
        } else if (keyId === 'LEFT') {
          caret = Math.max(0, start - 1);
          setCaret(caret);
          return caret;
        } else if (keyId === 'RIGHT') {
          caret = Math.min(value.length, start + 1);
          setCaret(caret);
          return caret;
        } else if (keyId === 'UP' || keyId === 'DOWN') {
          return start;
        } else if (keyId === 'NEGATIVE') {
          if (value.startsWith('-')) {
            value = value.slice(1);
            caret = Math.max(0, start - 1);
          } else {
            value = '-' + value;
            caret = start + 1;
          }
        } else {
          const char = keyId.startsWith('NUM_') ? keyId.slice(4) : SIMPLE_KEY_CHARS[keyId];
          if (!char) {
            return start;
          }
          value = value.slice(0, start) + char + value.slice(end);
          caret = start + char.length;
        }

        rawValue.value = value;
        commit(value);
        setCaret(caret);
        return caret;
      }

      function onFocus() {
        if (!unref(interactive) || !isNumeric.value || !keypad) {
          return;
        }
        keypad.setKeyHandler(handleKey);
        keypad.configure({
          keypadType: 'FRACTION',
          showVerticalNav: false,
          excludeKeys: excludeKeys.value,
        });
        keypad.activate();
      }

      function onBlur() {
        if (!commit(rawValue.value)) {
          // fallback
          rawValue.value = lastCommittedRaw.value;
        }
        if (keypad) {
          keypad.dismiss();
        }
      }

      onBeforeUnmount(() => {
        if (keypad) {
          keypad.dismiss();
        }
      });

      return {
        $themeTokens,
        textEntryLabel$,
        answerGuideText: answerGuideStrings.shortAnswer$(),
        rawValue,
        reportDisplayValue,
        placeholder: typedProps.placeholderText,
        interactive,
        inputMode,
        coreOutline: themeOutlineStyle(),
        inputAttrs,
        attrsClass,
        widthStyle,
        inputEl,
        onInput,
        onFocus,
        onBlur,
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
    box-sizing: border-box;
    display: inline-block;
    width: 100%;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .qti-text-entry-interaction-report {
    width: 100%;
    min-height: 1.5em;
    padding: 8px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    border-radius: 4px;
  }

</style>
