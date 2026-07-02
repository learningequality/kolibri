<script>

  import get from 'lodash/get';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { computed, h, inject, provide } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';

  const strings = createTranslator('ChoiceInteractionStrings', {
    choiceListLabel: {
      message: 'Answer choices',
      context: 'Accessible label for the list of answer choices in an assessment question',
    },
  });

  const { choiceListLabel$ } = strings;

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();

  // Exposed as CSS custom properties to use KDS theme colors
  const choiceInteractionCSSVars = {
    '--qti-choice-color-annotation': $themePalette.grey.v_400,
    '--qti-choice-color-primary': $themeTokens.primary,
  };

  function getComponentTag(vnode) {
    return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
  }

  /**
   * Safely normalizes a response value to an array.
   * Handles null, undefined, scalars, and arrays uniformly.
   * @param {string|number|Array<string|number>|null|undefined} value - The QTI response
   * value, which may be a single identifier, an array of identifiers, or empty.
   * @returns {Array<string|number>} An array of selected identifiers (empty when value is empty).
   */
  function getSelectionsArray(value) {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  }

  export default {
    name: 'QtiChoiceInteraction',
    tag: 'qti-choice-interaction',

    setup(props, { slots, attrs }) {
      const responses = inject('responses');

      const QTI_CONTEXT = inject('QTI_CONTEXT');

      const interactive = inject('interactive');

      const typedProps = useTypedProps(props);

      const multiSelectable = computed(() => {
        return typedProps.maxChoices.value !== 1;
      });

      const answerGuideText = computed(() =>
        multiSelectable.value ? answerGuideStrings.chooseAny$() : answerGuideStrings.chooseOne$(),
      );

      const isSelected = identifier => {
        const variable = responses[typedProps.responseIdentifier.value];
        if (!variable) {
          return false;
        }
        return getSelectionsArray(variable.value).includes(identifier);
      };

      const toggleSelection = identifier => {
        if (!interactive.value) {
          return;
        }
        const currentlySelected = isSelected(identifier);
        const variable = responses[typedProps.responseIdentifier.value];
        if (!variable) {
          return false;
        }

        if (currentlySelected) {
          if (multiSelectable.value) {
            variable.value = getSelectionsArray(variable.value).filter(v => v !== identifier);
          } else {
            variable.value = null;
          }
        } else {
          if (multiSelectable.value) {
            const maxChoices = typedProps.maxChoices.value;
            const currentSelections = getSelectionsArray(variable.value);
            if (maxChoices > 0 && currentSelections.length >= maxChoices) {
              return false;
            }
            variable.value = [...currentSelections, identifier];
          } else {
            variable.value = identifier;
          }
        }

        return true;
      };

      // Provide functions to child components
      provide('isSelected', isSelected);
      provide('toggleSelection', toggleSelection);

      const getShuffledOrder = choices => {
        if (!typedProps.shuffle.value) {
          return choices;
        }

        const shuffleable = choices.filter(choice => !choice.fixed);

        const shuffledChoices = shuffled([...shuffleable], QTI_CONTEXT.value.candidateIdentifier);

        // Merge back maintaining fixed positions
        const result = [];

        for (const choice of choices) {
          if (choice.fixed) {
            result.push(choice);
          } else {
            result.push(shuffledChoices.shift());
          }
        }

        return result;
      };

      // Return render function
      return () => {
        const allContent = slots.default();
        const nonChoiceContent = allContent.filter(
          vnode => getComponentTag(vnode) !== 'qti-simple-choice',
        );
        const choiceVNodes = allContent.filter(
          vnode => getComponentTag(vnode) === 'qti-simple-choice',
        );
        if (choiceVNodes.length === 0) {
          return;
        }
        // Extract choice data for shuffling
        const choices = choiceVNodes.map(vnode => ({
          vnode,
          identifier: vnode.componentOptions.propsData.identifier,
          fixed:
            vnode.componentOptions.propsData.fixed === 'true' ||
            vnode.componentOptions.propsData.fixed === true,
        }));

        // Get shuffled order (or original if shuffle=false)
        const orderedChoices = getShuffledOrder(choices);

        const choicesList = h(
          'ul',
          {
            attrs: {
              role: 'listbox',
              'aria-label': choiceListLabel$(),
              'aria-multiselectable': String(multiSelectable.value),
            },
            class: [
              attrs.class || '',
              'qti-choice-interaction',
              multiSelectable.value ? 'qti-multiple' : '',
            ],
            style: choiceInteractionCSSVars,
          },
          orderedChoices.map(choice => choice.vnode),
        );

        const answerGuideVNode = h(AnswerGuide, {
          props: { text: answerGuideText.value },
        });
        // Create container with non-choice content first, then choices list
        return h('div', [...nonChoiceContent, answerGuideVNode, choicesList]);
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      maxChoices: NonNegativeIntProp(false, 1),
      minChoices: NonNegativeIntProp(false, 0),
      shuffle: BooleanProp(false, false),
      responseIdentifier: QTIIdentifierProp(true),
      dataMinSelectionsMessage: {
        type: String,
        default: null,
      },
      /* eslint-enable */
    },
  };

</script>


<style lang="scss">

  // QTI V3 Choice Interaction Styles
  // Component-specific styles for choice interactions

  // ========================================
  // Module Variables
  // ========================================

  $choice-item-spacing: 0.5rem;
  $choice-horizontal-gap: 1rem;
  $choice-label-spacing: 0.5rem;

  // Control geometry
  $control-inset-start: 1rem;
  $control-size-plain: 1.5rem;
  $label-gap: 0.5rem;

  // Define the counter styles map
  $qti-counter-styles: (
    'decimal': decimal,
    'lower-alpha': lower-alpha,
    'upper-alpha': upper-alpha,
    'cjk-ideographic': cjk-ideographic,
  );

  // Define the suffix styles map
  $qti-suffixes: (
    'period': '.',
    'parenthesis': ')',
  );

  .qti-choice-interaction {
    padding: 0;
    margin: 0;
    // The counter always advances: even for qti-labels-none or suffix
    // modes: since multiple rules below depend on its current value.
    counter-reset: qti-choice-counter;

    .qti-simple-choice {
      counter-increment: qti-choice-counter;
    }

    &.qti-multiple .qti-simple-choice::before {
      border-radius: 6px;
    }

    // ========================================
    // Choice Labels
    // ========================================

    // --- "Letter inside the control" mode: the default ---
    &:not(.qti-labels-suffix-period, .qti-labels-suffix-parenthesis) {
      .qti-simple-choice::before {
        content: counter(qti-choice-counter, upper-alpha);
      }
      @each $name, $style in $qti-counter-styles {
        &.qti-labels-#{$name} .qti-simple-choice::before {
          content: counter(qti-choice-counter, $style);
        }
      }
    }

    // qti-labels-none never shows a letter. The control stays a blank
    // circle until selected, when it shows a checkmark instead.
    &.qti-labels-none .qti-simple-choice::before {
      content: '';
    }

    &.qti-labels-none .qti-simple-choice[aria-selected='true']::before {
      content: '\2714';
    }

    // --- "Letter beside the control" mode: qti-labels-suffix-period /
    // qti-labels-suffix-parenthesis. The control becomes a plain, smaller
    // indicator (blank, or a checkmark once selected) and the counter +
    // suffix is rendered as its own text next to it. ---
    @each $suffix-name, $suffix-char in $qti-suffixes {
      &.qti-labels-suffix-#{$suffix-name} {
        .qti-simple-choice {
          padding-inline-start: 80px;
        }

        .qti-simple-choice::before {
          width: $control-size-plain;
          height: $control-size-plain;
          font-size: 14px;
          content: '';
          border-width: 2px;
        }

        .qti-simple-choice[aria-selected='true']::before {
          content: '\2714';
        }

        .qti-simple-choice::after {
          position: absolute;
          inset-inline-start: $control-inset-start + $control-size-plain + $label-gap;
          top: 50%;
          font-weight: 500;
          color: var(--qti-choice-color-annotation, #999999);
          transform: translateY(-50%);
        }

        .qti-simple-choice[aria-selected='true']::after {
          font-weight: 700;
          color: var(--qti-choice-color-primary, #4368f3);
        }

        @each $style-name, $style in $qti-counter-styles {
          &.qti-labels-#{$style-name} .qti-simple-choice::after {
            content: counter(qti-choice-counter, $style) '#{$suffix-char}';
          }
        }
      }
    }

    // ========================================
    // Hidden Input Control
    // ========================================
    &.qti-input-control-hidden {
      .qti-simple-choice {
        min-height: auto;
        padding: 10px 16px;
      }

      .qti-simple-choice::before {
        position: static;
        display: inline;
        content: none;
      }

      .qti-simple-choice[aria-selected='true']::before {
        margin-inline-end: 8px;
        color: var(--qti-choice-color-primary, #4368f3) !important;
        content: '\2714';
        background: transparent !important;
        border: 0 !important;
      }
    }

    // ========================================
    // Choice Orientation
    // ========================================
    &.qti-orientation-vertical {
      .qti-simple-choice {
        display: block;
        margin-bottom: $choice-item-spacing;

        &:last-child {
          margin-bottom: 0;
        }
      }

      &.qti-choices-stacking-2,
      &.qti-choices-stacking-3,
      &.qti-choices-stacking-4,
      &.qti-choices-stacking-5 {
        grid-auto-flow: column;
      }
    }

    &.qti-orientation-horizontal {
      .qti-simple-choice {
        display: inline-block;
        margin-inline-end: $choice-horizontal-gap;

        &:last-child {
          margin-inline-end: 0;
        }
      }

      &.qti-choices-stacking-2,
      &.qti-choices-stacking-3,
      &.qti-choices-stacking-4,
      &.qti-choices-stacking-5 {
        grid-auto-flow: row;
      }
    }

    // ========================================
    // Choice Stacking
    // ========================================

    @mixin choice-stacking($columns) {
      display: grid;
      grid-template-columns: repeat($columns, 1fr);
      gap: $choice-item-spacing $choice-horizontal-gap;
    }

    &.qti-choices-stacking-1 {
      @include choice-stacking(1);
    }

    &.qti-choices-stacking-2 {
      @include choice-stacking(2);
    }

    &.qti-choices-stacking-3 {
      @include choice-stacking(3);
    }

    &.qti-choices-stacking-4 {
      @include choice-stacking(4);
    }

    &.qti-choices-stacking-5 {
      @include choice-stacking(5);
    }

    // ========================================
    // Vertical Writing Mode
    // ========================================

    &.qti-writing-orientation-vertical-rl {
      writing-mode: vertical-rl;

      .qti-simple-choice {
        writing-mode: vertical-rl;

        // Labels rendered upright
        &::before {
          display: inline-block;
          margin-inline-end: 0;
          margin-bottom: $choice-label-spacing;
          writing-mode: horizontal-tb;
          text-orientation: upright;
        }
      }

      // Adjust stacking for vertical writing
      &.qti-choices-stacking-2,
      &.qti-choices-stacking-3,
      &.qti-choices-stacking-4,
      &.qti-choices-stacking-5 {
        grid-auto-flow: column;

        .qti-simple-choice {
          width: max-content;
          height: auto;
        }
      }
    }

    &.qti-writing-orientation-vertical-lr {
      writing-mode: vertical-lr;

      .qti-simple-choice {
        writing-mode: vertical-lr;

        &::before {
          display: inline-block;
          margin-inline-end: 0;
          margin-bottom: $choice-label-spacing;
          writing-mode: horizontal-tb;
          text-orientation: upright;
        }
      }
    }

    // In vertical writing mode, adjust label positioning for CJK
    &.qti-labels-cjk-ideographic {
      &.qti-writing-orientation-vertical-rl,
      &.qti-writing-orientation-vertical-lr {
        .qti-simple-choice::before {
          margin-inline-end: 0;
          margin-bottom: $choice-label-spacing;
        }
      }
    }
  }

</style>
