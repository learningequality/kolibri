<script>

  import get from 'lodash/get';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { computed, h, inject, provide } from 'vue';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';

  function getComponentTag(vnode) {
    return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
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

      const isSelected = identifier => {
        const variable = responses[typedProps.responseIdentifier.value];
        if (!variable.value) {
          return false;
        }
        if (multiSelectable.value) {
          return variable.value.includes(identifier);
        }
        return variable.value === identifier;
      };

      const toggleSelection = identifier => {
        if (!interactive.value) {
          return;
        }
        const currentlySelected = isSelected(identifier);
        const variable = responses[typedProps.responseIdentifier.value];

        if (currentlySelected) {
          variable.value = multiSelectable.value
            ? variable.value.filter(v => v !== identifier)
            : null;
        } else {
          variable.value = multiSelectable.value
            ? [...(variable.value || []), identifier]
            : identifier;
        }

        return true;
      };

      // Provide functions to child components
      provide('isSelected', isSelected);
      provide('toggleSelection', toggleSelection);

      const getShuffledOrder = choices => {
        if (!typedProps.shuffle) {
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
              'aria-multiselectable': multiSelectable.value,
              class: (attrs.class || '') + ' qti-choice-interaction',
            },
          },
          orderedChoices.map(choice => choice.vnode),
        );

        // Create container with non-choice content first, then choices list
        return h('div', [...nonChoiceContent, choicesList]);
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
    // ========================================
    // Choice Labels
    // ========================================
    counter-reset: qti-choice-counter;

    // Base setup - always increment counter and set margin
    &:not(.qti-labels-none) {
      .qti-simple-choice {
        counter-increment: qti-choice-counter;

        &::before {
          margin-right: $choice-label-spacing;
          // Default content - will be overridden by more specific rules below
          content: counter(qti-choice-counter, upper-alpha);
        }
      }
    }

    // Generate counter style overrides (without suffixes)
    @each $name, $style in $qti-counter-styles {
      &.qti-labels-#{$name} {
        .qti-simple-choice::before {
          content: counter(qti-choice-counter, $style);
        }
      }
    }

    // Hide labels when explicitly set to none
    &.qti-labels-none {
      .qti-simple-choice::before {
        display: none;
      }
    }

    // Generate suffix combinations
    @each $suffix-name, $suffix-char in $qti-suffixes {
      &.qti-labels-suffix-#{$suffix-name} {
        // Override for each counter style with this suffix
        @each $style-name, $style in $qti-counter-styles {
          &.qti-labels-#{$style-name} .qti-simple-choice::before {
            content: counter(qti-choice-counter, $style) '#{$suffix-char}';
          }
        }
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
        margin-right: $choice-horizontal-gap;

        &:last-child {
          margin-right: 0;
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
          margin-right: 0;
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
          margin-right: 0;
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
          margin-right: 0;
          margin-bottom: $choice-label-spacing;
        }
      }
    }
  }

</style>
