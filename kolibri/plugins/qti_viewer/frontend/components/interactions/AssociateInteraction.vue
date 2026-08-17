<script>

  import isEqual from 'lodash/isEqual';
  import { computed, h, inject, ref, watch } from 'vue';
  import { themeBrand, themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import DraggableRegion from 'kolibri-common/components/draggable/DraggableRegion';
  import DraggableItem from 'kolibri-common/components/draggable/DraggableItem';
  import DraggableHandle from 'kolibri-common/components/draggable/DraggableHandle';
  import useDraggableUniverse from 'kolibri-common/components/draggable/useDraggableUniverse';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';
  import { choiceText, getComponentTag, isFixed, orderChoices } from '../../utils/choices';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';
  import useAssociateSlots from '../../composables/useAssociateSlots';
  import useSlotListbox from '../../composables/useSlotListbox';

  const CHOICE_TAG = 'qti-simple-associable-choice';

  export const associateStrings = createTranslator('AssociateInteractionStrings', {
    responsePoolLabel: {
      message: 'Response pool',
      context:
        'Label for the set of answers a learner drags or picks from when building pairs in a connect-pairs question',
    },
    emptySlotPlaceholder: {
      message: 'Answer',
      context: 'Placeholder shown in an empty answer slot of a connect-pairs question',
    },
    firstSlotEmpty: {
      message: 'Pair {number, number}, first response: empty',
      context:
        'Accessible label for the empty first slot of a pair in a connect-pairs question. {number} is the position of the pair in the list.',
    },
    firstSlotFilled: {
      message: 'Pair {number, number}, first response: {response}',
      context:
        'Accessible label for the filled first slot of a pair in a connect-pairs question. {response} is the answer the learner placed there.',
    },
    secondSlotEmpty: {
      message: 'Pair {number, number}, second response: empty',
      context:
        'Accessible label for the empty second slot of a pair in a connect-pairs question. {number} is the position of the pair in the list.',
    },
    secondSlotFilled: {
      message: 'Pair {number, number}, second response: {response}',
      context:
        'Accessible label for the filled second slot of a pair in a connect-pairs question. {response} is the answer the learner placed there.',
    },
  });

  const {
    responsePoolLabel$,
    emptySlotPlaceholder$,
    firstSlotEmpty$,
    firstSlotFilled$,
    secondSlotEmpty$,
    secondSlotFilled$,
  } = associateStrings;

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();
  const $themeBrand = themeBrand();

  // Exposed as a custom property so the :focus rule below can use a theme colour
  const interactionCSSVars = { '--qti-associate-color-primary': $themeTokens.primary };

  export default {
    name: 'QtiAssociateInteraction',
    tag: 'qti-associate-interaction',

    setup(props, { slots, attrs }) {
      const QTI_CONTEXT = inject('QTI_CONTEXT');
      const responses = inject('responses');
      const interactive = inject('interactive');
      const typedProps = useTypedProps(props);

      // Choices are static: parse the slot vnodes once rather than on every render.
      const allContent = (slots.default && slots.default()) || [];
      const nonChoiceContent = allContent.filter(vnode => getComponentTag(vnode) !== CHOICE_TAG);
      const choiceVNodes = allContent.filter(vnode => getComponentTag(vnode) === CHOICE_TAG);

      const choices = choiceVNodes.map(vnode => ({
        identifier: vnode.componentOptions.propsData.identifier,
        fixed: isFixed(vnode),
      }));

      const contentByIdentifier = {};
      const textByIdentifier = {};
      choiceVNodes.forEach(vnode => {
        const { identifier } = vnode.componentOptions.propsData;
        contentByIdentifier[identifier] = vnode.componentOptions.children || [];
        textByIdentifier[identifier] = choiceText(vnode);
      });

      const orderedIdentifiers = computed(() =>
        orderChoices(choices, {
          shuffle: typedProps.shuffle.value,
          seed: QTI_CONTEXT.value.candidateIdentifier,
        }).map(choice => choice.identifier),
      );

      const rowCount = computed(() => {
        const max = typedProps.maxAssociations.value;
        // max-associations="0" means unlimited, so offer as many pairs as the
        // responses can form.
        return max > 0 ? max : Math.floor(choices.length / 2);
      });

      const {
        slots: pairSlots,
        pool,
        placed,
        pairs,
        place,
        clear,
        remove,
        candidatesFor,
        hydrate,
      } = useAssociateSlots(orderedIdentifiers, rowCount);

      const { isDragging } = useDraggableUniverse();

      const variable = computed(() => responses.value[typedProps.responseIdentifier.value]);

      // Only one of these is ever set: the learner either picks a response and
      // then a slot, or picks a slot and then a response.
      const selectedIdentifier = ref(null);
      const activeSlot = ref(null);

      function clearSelection() {
        selectedIdentifier.value = null;
        activeSlot.value = null;
      }

      function isActiveSlot(rowIndex, side) {
        return activeSlot.value?.rowIndex === rowIndex && activeSlot.value?.side === side;
      }

      function selectResponse(identifier) {
        // A response already in a slot is shown disabled in the pool; it is
        // picked up from its slot, not from here.
        if (!interactive.value || placed.value.has(identifier)) {
          return;
        }
        if (activeSlot.value) {
          place(identifier, activeSlot.value.rowIndex, activeSlot.value.side);
          clearSelection();
          return;
        }
        selectedIdentifier.value = selectedIdentifier.value === identifier ? null : identifier;
      }

      function selectSlot(rowIndex, side) {
        listbox.forgetPointer();
        if (!interactive.value) {
          return;
        }
        if (selectedIdentifier.value) {
          place(selectedIdentifier.value, rowIndex, side);
          clearSelection();
          return;
        }
        if (isActiveSlot(rowIndex, side)) {
          clearSelection();
          return;
        }
        // Picking up a filled slot's response is what lets two filled slots swap
        // by clicking one then the other.
        const occupant = pairSlots.value[rowIndex]?.[side];
        selectedIdentifier.value = occupant || null;
        activeSlot.value = occupant ? null : { rowIndex, side };
      }

      // Keyboard navigation is only for the slots, not the pool
      const listbox = useSlotListbox({
        candidatesFor,
        currentValue: (rowIndex, side) => pairSlots.value[rowIndex]?.[side] ?? null,
        commit: place,
        clear,
        labelFor: identifier => textByIdentifier[identifier] || identifier,
        disabled: computed(() => !interactive.value),
        onKeyboardFocus: clearSelection,
      });

      function reconcilePool(newItems) {
        if (!interactive.value) {
          return;
        }
        newItems
          .map(item => item.identifier)
          .filter(identifier => !pool.value.includes(identifier))
          .forEach(remove);
      }

      function reconcileSlot(rowIndex, side, newItems) {
        if (!interactive.value) {
          return;
        }
        const current = pairSlots.value[rowIndex]?.[side] ?? null;
        const incoming = newItems
          .map(item => item.identifier)
          .find(identifier => identifier !== current);
        if (incoming) {
          place(incoming, rowIndex, side);
        }
      }

      // Sync the variable value with the pair slots, and vice versa
      watch(
        () => variable.value?.value,
        value => {
          if (isEqual(value, pairs.value)) {
            return;
          }
          hydrate(value);
        },
        { immediate: true },
      );

      watch(pairs, value => {
        if (!interactive.value || !variable.value) {
          return;
        }
        variable.value.value = value.map(pair => [...pair]);
      });

      watch(interactive, clearSelection);

      const poolStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
      }));
      const poolLabelStyles = computed(() => ({ color: $themeTokens.annotation }));
      const placeholderStyles = computed(() => ({ color: $themeTokens.annotation }));

      function chipStyles({ selected, candidate, disabled }) {
        if (disabled) {
          return {
            backgroundColor: $themeTokens.surface,
            borderColor: $themeTokens.fineLine,
            color: $themeTokens.annotation,
          };
        }
        if (selected) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
            color: $themeTokens.primary,
          };
        }
        if (candidate) {
          return {
            backgroundColor: $themeTokens.surface,
            borderColor: $themeTokens.primary,
            color: $themeTokens.primary,
          };
        }
        return {
          backgroundColor: $themeTokens.surface,
          borderColor: $themeTokens.fineLine,
          color: $themeTokens.text,
        };
      }

      function slotStyles({ filled, target, active }) {
        if (target || active) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
          };
        }
        return {
          backgroundColor: filled ? $themePalette.grey.v_100 : 'transparent',
          borderColor: $themeTokens.fineLine,
        };
      }

      function slotLabel(identifier, rowIndex, side) {
        const number = rowIndex + 1;
        const response = identifier ? textByIdentifier[identifier] : null;
        if (side === 0) {
          return response ? firstSlotFilled$({ number, response }) : firstSlotEmpty$({ number });
        }
        return response ? secondSlotFilled$({ number, response }) : secondSlotEmpty$({ number });
      }

      // The whole chip is the drag handle, so DraggableHandle marks the chip itself
      // rather than wrapping it in another element.
      function renderChipBody(identifier, { disabled = false, candidate = false, on } = {}) {
        const selected = !disabled && selectedIdentifier.value === identifier;
        const data = {
          class: [
            'qti-associate-chip',
            {
              'qti-associate-chip-selected': selected,
              'qti-associate-chip-candidate': candidate && !selected,
              'qti-associate-chip-disabled': disabled,
            },
          ],
          style: chipStyles({ selected, candidate, disabled }),
        };
        // A placed response is rendered twice — disabled in the pool and again
        // in its slot.
        const content = [...contentByIdentifier[identifier]];
        if (disabled) {
          return h('div', { ...data, attrs: { 'aria-disabled': 'true' } }, content);
        }
        return h(DraggableHandle, [h('div', { ...data, on }, content)]);
      }

      function renderChip(
        identifier,
        { tag = 'div', itemClass, candidate = false, ariaHidden = false, on } = {},
      ) {
        return h(DraggableItem, { key: identifier, props: { disabled: !interactive.value } }, [
          h(
            tag,
            {
              class: itemClass,
              attrs: ariaHidden ? { 'aria-hidden': 'true' } : {},
            },
            [renderChipBody(identifier, { candidate, on })],
          ),
        ]);
      }

      function renderPlacedPoolEntry(identifier) {
        return h('li', { key: identifier, class: 'qti-associate-pool-entry' }, [
          renderChipBody(identifier, { disabled: true }),
        ]);
      }

      function renderPlaceholder() {
        return h(
          'span',
          {
            class: 'qti-associate-placeholder',
            style: placeholderStyles.value,
            attrs: { 'aria-hidden': 'true' },
          },
          [
            h('KIcon', { props: { icon: 'plus' }, class: 'qti-associate-placeholder-icon' }),
            h('span', emptySlotPlaceholder$()),
          ],
        );
      }

      function renderSlot(identifier, rowIndex, side) {
        const filled = Boolean(identifier);
        const active = isActiveSlot(rowIndex, side);
        const label = slotLabel(identifier, rowIndex, side);
        // A filled slot is never highlighted as a valid target, but it still
        // accepts a drop or a click — that is how two responses swap.
        const target = Boolean(selectedIdentifier.value || isDragging.value) && !filled;
        return h(
          DraggableRegion,
          {
            key: `${rowIndex}-${side}`,
            props: {
              items: filled ? [{ identifier }] : [],
              sortable: false,
              disabled: !interactive.value,
              label,
            },
            on: { 'update:items': newItems => reconcileSlot(rowIndex, side, newItems) },
          },
          [
            h(
              'div',
              {
                class: [
                  'qti-associate-slot',
                  {
                    'qti-associate-slot-filled': filled,
                    'qti-associate-slot-target': target,
                    'qti-associate-slot-active': active,
                  },
                ],
                style: slotStyles({ filled, target, active }),
                attrs: { 'aria-label': label, ...listbox.slotAttrs(rowIndex, side) },
                on: {
                  click: () => selectSlot(rowIndex, side),
                  ...listbox.handlers(rowIndex, side),
                },
              },
              [
                // The visible value is the listbox's trigger: its content repeats
                // the selected option, which the listbox already announces.
                identifier ? renderChip(identifier, { ariaHidden: true }) : renderPlaceholder(),
                listbox.renderStepper(),
                interactive.value ? listbox.renderOptions(rowIndex, side) : null,
              ].filter(Boolean),
            ),
          ],
        );
      }

      function renderPool() {
        return h('div', { class: 'qti-associate-pool', style: poolStyles.value }, [
          h(
            'p',
            {
              class: 'qti-associate-pool-label',
              style: poolLabelStyles.value,
              attrs: { 'aria-hidden': 'true' },
            },
            responsePoolLabel$(),
          ),
          h(
            DraggableRegion,
            {
              props: {
                items: pool.value.map(identifier => ({ identifier })),
                sortable: false,
                disabled: !interactive.value,
                label: responsePoolLabel$(),
              },
              on: { 'update:items': reconcilePool },
            },
            [
              h(
                'ul',
                {
                  class: 'qti-associate-pool-items',
                  attrs: { 'aria-label': responsePoolLabel$() },
                },
                orderedIdentifiers.value.map(identifier =>
                  placed.value.has(identifier)
                    ? renderPlacedPoolEntry(identifier)
                    : renderChip(identifier, {
                      tag: 'li',
                      itemClass: 'qti-associate-pool-entry',
                      candidate: Boolean(activeSlot.value),
                      on: { click: () => selectResponse(identifier) },
                    }),
                ),
              ),
            ],
          ),
        ]);
      }

      function renderRows() {
        return h(
          'ol',
          { class: 'qti-associate-rows' },
          pairSlots.value.map((row, rowIndex) =>
            h('li', { key: rowIndex, class: 'qti-associate-row' }, [
              renderSlot(row[0], rowIndex, 0),
              h('span', {
                class: 'qti-associate-connector',
                style: { borderColor: $themeTokens.fineLine },
                attrs: { 'aria-hidden': 'true' },
              }),
              renderSlot(row[1], rowIndex, 1),
            ]),
          ),
        );
      }

      return () => {
        if (choices.length === 0) {
          return;
        }

        return h('div', [
          ...nonChoiceContent,
          h(AnswerGuide, { props: { text: answerGuideStrings.chooseThenTarget$() } }),
          h(
            'div',
            {
              class: [
                attrs.class || '',
                'qti-associate-interaction',
                { 'qti-associate-readonly': !interactive.value },
              ],
              style: interactionCSSVars,
            },
            [renderPool(), renderRows()],
          ),
        ]);
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      responseIdentifier: QTIIdentifierProp(true),
      shuffle: BooleanProp(false, false),
      maxAssociations: NonNegativeIntProp(false, 1),
      minAssociations: NonNegativeIntProp(false, 0),
      /* eslint-enable */
    },
  };

</script>


<!-- Not scoped: the chips wrap authored QTI content, whose vnodes are created by
     the item body's SafeHTML render and so carry a different scope id. -->
<style lang="scss">

  $chip-max-size: 100px;
  $chip-padding-block: 8px;
  $chip-padding-inline: 12px;
  $chip-border-width: 1px;
  $chip-content-max-size: $chip-max-size - 2 * ($chip-padding-inline + $chip-border-width);

  .qti-associate-pool {
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

  .qti-associate-pool-label {
    margin: 0 0 0.5rem;
    font-size: 12px;
  }

  .qti-associate-pool-items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .qti-associate-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: $chip-max-size;
    padding-block: $chip-padding-block;
    padding-inline: $chip-padding-inline;
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    border-style: solid;
    border-width: $chip-border-width;
    border-radius: 8px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;

    .image-container,
    .img-wrapper,
    .img-button {
      width: $chip-content-max-size;
      min-width: 0;
      max-width: none;
      height: $chip-content-max-size;
      margin: 0;
    }

    .img-wrapper {
      box-shadow: none;
    }

    // Selecting or dragging the chip wins over opening the lightbox
    .img-button {
      pointer-events: none;
    }

    .expand-btn {
      display: none;
    }

    // scale-down rather than contain so a small image is never blown up
    img {
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      object-fit: scale-down;
    }
  }

  .qti-associate-chip-selected {
    font-weight: 600;
  }

  .qti-associate-chip-disabled {
    cursor: default;
    opacity: 0.55;
  }

  .qti-associate-rows {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .qti-associate-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .qti-associate-slot {
    display: flex;
    flex: 1;
    align-items: center;
    min-height: 56px;
    padding: 8px;
    cursor: pointer;
    border-style: dashed;
    border-width: 1px;
    border-radius: 8px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .qti-associate-slot:focus {
    outline: 3px solid var(--qti-associate-color-primary, #4368f3);
    outline-offset: 2px;
  }

  .qti-associate-slot-filled {
    border-style: solid;
  }

  // Review mode has nothing to click
  .qti-associate-readonly {
    .qti-associate-chip,
    .qti-associate-slot {
      cursor: default;
    }
  }

  .qti-associate-placeholder {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  // Joins the two slots of a pair
  .qti-associate-connector {
    flex-shrink: 0;
    width: 12px;
    border-top-style: solid;
    border-top-width: 1px;
  }

</style>
