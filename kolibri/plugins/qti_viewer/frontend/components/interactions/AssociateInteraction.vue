<script>

  import get from 'lodash/get';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { computed, h, inject, watch } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import AnswerGuide, { answerGuideStrings } from '../AnswerGuide.vue';
  import { BooleanProp, NonNegativeIntProp, QTIIdentifierProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';
  import useAssociateSlots from '../../composables/useAssociateSlots';

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

  function getComponentTag(vnode) {
    return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
  }

  // Plain-text label per choice, used for the slots' accessible names.
  function vnodeToText(vnode) {
    if (!vnode) {
      return '';
    }
    if (vnode.text) {
      return vnode.text.trim();
    }
    if (vnode.children) {
      return vnode.children.map(vnodeToText).join(' ').trim();
    }
    return '';
  }

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
        fixed:
          vnode.componentOptions.propsData.fixed === 'true' ||
          vnode.componentOptions.propsData.fixed === true,
      }));

      const contentByIdentifier = {};
      const textByIdentifier = {};
      choiceVNodes.forEach(vnode => {
        const { identifier } = vnode.componentOptions.propsData;
        const children = vnode.componentOptions.children || [];
        contentByIdentifier[identifier] = children;
        textByIdentifier[identifier] = children
          .map(vnodeToText)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      });

      const orderedIdentifiers = computed(() => {
        if (!typedProps.shuffle.value) {
          return choices.map(choice => choice.identifier);
        }
        // Seeded by the candidate so the presentation is stable across reloads,
        // and choices with fixed="true" keep their authored positions.
        const shuffleable = shuffled(
          choices.filter(choice => !choice.fixed),
          QTI_CONTEXT.value.candidateIdentifier,
        );
        return choices
          .map(choice => (choice.fixed ? choice : shuffleable.shift()))
          .map(choice => choice.identifier);
      });

      const rowCount = computed(() => {
        const max = typedProps.maxAssociations.value;
        // max-associations="0" means unlimited, so offer as many pairs as the
        // responses can form.
        return max > 0 ? max : Math.floor(choices.length / 2);
      });

      const { slots: pairSlots, pool, hydrate } = useAssociateSlots(orderedIdentifiers, rowCount);

      const variable = computed(() => responses.value[typedProps.responseIdentifier.value]);

      watch(() => variable.value?.value, hydrate, { immediate: true });

      const poolStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
      }));
      const poolLabelStyles = computed(() => ({ color: $themeTokens.annotation }));
      const chipStyles = computed(() => ({
        backgroundColor: $themeTokens.surface,
        borderColor: $themeTokens.fineLine,
        color: $themeTokens.text,
      }));
      const placeholderStyles = computed(() => ({ color: $themeTokens.annotation }));
      const slotStyles = filled =>
        filled
          ? { backgroundColor: $themePalette.grey.v_100, borderColor: $themeTokens.fineLine }
          : { borderColor: $themeTokens.fineLine };

      function slotLabel(identifier, rowIndex, side) {
        const number = rowIndex + 1;
        const response = identifier ? textByIdentifier[identifier] : null;
        if (side === 0) {
          return response ? firstSlotFilled$({ number, response }) : firstSlotEmpty$({ number });
        }
        return response ? secondSlotFilled$({ number, response }) : secondSlotEmpty$({ number });
      }

      function renderChip(identifier) {
        return h(
          'div',
          { class: 'qti-associate-chip', style: chipStyles.value },
          contentByIdentifier[identifier],
        );
      }

      function renderPlaceholder() {
        return h('span', { class: 'qti-associate-placeholder', style: placeholderStyles.value }, [
          h('KIcon', { props: { icon: 'plus' }, class: 'qti-associate-placeholder-icon' }),
          h('span', emptySlotPlaceholder$()),
        ]);
      }

      function renderSlot(identifier, rowIndex, side) {
        return h(
          'div',
          {
            key: `${rowIndex}-${side}`,
            class: ['qti-associate-slot', { 'qti-associate-slot-filled': Boolean(identifier) }],
            style: slotStyles(Boolean(identifier)),
            attrs: { 'aria-label': slotLabel(identifier, rowIndex, side) },
          },
          [identifier ? renderChip(identifier) : renderPlaceholder()],
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
            'ul',
            {
              class: 'qti-associate-pool-items',
              attrs: { 'aria-label': responsePoolLabel$() },
            },
            pool.value.map(identifier =>
              h('li', { key: identifier, class: 'qti-associate-pool-entry' }, [
                renderChip(identifier),
              ]),
            ),
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
          h(AnswerGuide, { props: { text: answerGuideStrings.associate$() } }),
          h(
            'div',
            {
              class: [
                attrs.class || '',
                'qti-associate-interaction',
                { 'qti-associate-readonly': !interactive.value },
              ],
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
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .qti-associate-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: $chip-max-size;
    padding-block: 8px;
    padding-inline: 12px;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
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
    border-style: dashed;
    border-width: 1px;
    border-radius: 8px;
  }

  .qti-associate-slot-filled {
    border-style: solid;
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
