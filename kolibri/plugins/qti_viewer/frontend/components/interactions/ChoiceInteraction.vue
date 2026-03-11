<script>

  import get from 'lodash/get';
  import isArray from 'lodash/isArray';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { computed, getCurrentInstance, h, inject, nextTick, provide, ref, shallowRef, watch } from 'vue';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';

  function getComponentTag(vnode) {
    return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
  }

  /**
   * Safely normalizes a response value to an array.
   * Handles null, undefined, scalars, and arrays uniformly.
   */
  function getSelectionsArray(value) {
    if (value === null || value === undefined) {
      return [];
    }
    if (isArray(value)) {
      return value;
    }
    return [value];
  }

  export default {
    name: 'QtiChoiceInteraction',
    tag: 'qti-choice-interaction',

    setup(props, { slots, attrs }) {
      const { proxy } = getCurrentInstance();
      const responses = inject('responses');

      const QTI_CONTEXT = inject('QTI_CONTEXT');

      const interactive = inject('interactive');

      const typedProps = useTypedProps(props);

      const multiSelectable = computed(() => {
        return typedProps.maxChoices.value !== 1;
      });

      // shallowRef wrapper so computeds re-evaluate when the underlying
      // QTIVariable is replaced (responses object is not reactive).
      const trackedVariable = shallowRef(null);
      const selectionVersion = ref(0);

      function syncTrackedVariable() {
        const variable = responses[typedProps.responseIdentifier.value];
        if (trackedVariable.value !== variable) {
          trackedVariable.value = variable || null;
        }
      }

      const isSelected = identifier => {
        const variable = trackedVariable.value;
        // eslint-disable-next-line no-unused-expressions
        selectionVersion.value;
        if (!variable || variable.value === null || variable.value === undefined) {
          return false;
        }
        return getSelectionsArray(variable.value).includes(identifier);
      };

      const toggleSelection = identifier => {
        if (!interactive.value) {
          return;
        }
        syncTrackedVariable();
        const currentlySelected = isSelected(identifier);
        const variable = trackedVariable.value;
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

        selectionVersion.value++;
        return true;
      };

      // When maxChoices changes (e.g. sandbox XML editing), trim excess
      // selections so the constraint is immediately enforced.
      watch(
        () => typedProps.maxChoices.value,
        newMax => {
          syncTrackedVariable();
          const variable = trackedVariable.value;
          if (!variable) {
            return;
          }
          const selections = getSelectionsArray(variable.value);
          if (newMax > 0 && selections.length > newMax) {
            variable.value = multiSelectable.value
              ? selections.slice(0, newMax)
              : selections[0] || null;
            selectionVersion.value++;
          }
        },
      );

      // Roving tabindex: only one option has tabindex="0" at a time;
      // the rest get tabindex="-1". Arrow keys move focus between options.
      const focusedIndex = ref(0);
      // Ordered list of identifiers, updated each render via nextTick.
      // Used by isFocusTarget and setFocusedIndex provided to children.
      const orderedIdentifiers = ref([]);

      function handleListKeydown(event) {
        const count = orderedIdentifiers.value.length;
        if (count === 0) {
          return;
        }
        const { key } = event;
        let newIndex = focusedIndex.value;
        switch (key) {
          case 'ArrowDown':
            newIndex = (newIndex + 1) % count;
            break;
          case 'ArrowUp':
            newIndex = (newIndex - 1 + count) % count;
            break;
          case 'Home':
            newIndex = 0;
            break;
          case 'End':
            newIndex = count - 1;
            break;
          default:
            // Don't prevent default for keys we don't handle
            return;
        }
        event.preventDefault();
        focusedIndex.value = newIndex;
        const listEl = event.currentTarget;
        const options = listEl.querySelectorAll('[role="option"]');
        if (options[newIndex]) {
          options[newIndex].focus();
        }
      }

      // Provide functions to child components (SimpleChoice).
      // NOTE: Only plain functions work via provide/inject here, NOT refs.
      // SafeHTML (functional component) creates SimpleChoice vnodes in its
      // own render scope, so refs provided here are invisible to SimpleChoice.
      // Functions work because Vue 2 resolves inject values up through the
      // _provided chain, which includes ChoiceInteraction regardless of how
      // the vnode was created.
      provide('isSelected', isSelected);
      provide('toggleSelection', toggleSelection);
      provide('isFocusTarget', identifier => {
        const idx = orderedIdentifiers.value.indexOf(identifier);
        return idx >= 0 && idx === focusedIndex.value;
      });
      provide('setFocusedIndex', identifier => {
        const idx = orderedIdentifiers.value.indexOf(identifier);
        if (idx >= 0) {
          focusedIndex.value = idx;
        }
      });

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

      return () => {
        syncTrackedVariable();
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

        // Keep orderedIdentifiers in sync so that provided functions
        // (isFocusTarget, setFocusedIndex) can map identifier -> index.
        // Use nextTick to avoid mutating reactive state during render,
        // which would trigger an infinite re-render loop in Vue 2.
        const ids = orderedChoices.map(c => c.identifier);
        const idsChanged =
          ids.length !== orderedIdentifiers.value.length ||
          ids.some((id, i) => id !== orderedIdentifiers.value[i]);
        if (idsChanged || focusedIndex.value >= ids.length) {
          nextTick(() => {
            orderedIdentifiers.value = ids;
            if (focusedIndex.value >= ids.length) {
              focusedIndex.value = Math.max(0, ids.length - 1);
            }
          });
        }

        const choicesList = h(
          'ul',
          {
            attrs: {
              role: 'listbox',
              'aria-label': proxy.$tr('choiceListLabel'),
              'aria-multiselectable': multiSelectable.value,
            },
            class: [(attrs.class || ''), 'qti-choice-interaction'],
            on: {
              keydown: handleListKeydown,
            },
          },
          orderedChoices.map(choice => choice.vnode),
        );

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
    $trs: {
      choiceListLabel: {
        message: 'Answer choices',
        context: 'Accessible label for the list of answer choices in an assessment question',
      },
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
