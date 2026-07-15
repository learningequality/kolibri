<template>

  <span
    class="qti-inline-choice-interaction"
    :style="{ color: $themeTokens.text }"
  >
    <button
      v-if="interactive"
      type="button"
      class="qti-inline-choice-trigger"
      :class="[
        $computedClass({ ':focus': coreOutline }),
        { 'qti-inline-choice-answered': isAnswered },
      ]"
      :style="triggerStyles"
      :aria-label="triggerAriaLabel"
    >
      <span class="qti-inline-choice-label">{{ triggerLabel }}</span>
      <KIcon
        icon="dropdown"
        class="qti-inline-choice-arrow"
      />
      <KDropdownMenu
        :options="options"
        @select="onSelect"
      />
    </button>
    <span
      v-else
      class="qti-inline-choice-report qti-inline-choice-trigger"
      :style="triggerStyles"
    >{{ triggerLabel }}</span>
  </span>

</template>


<script>

  import get from 'lodash/get';
  import shuffled from 'kolibri-common/utils/shuffled';
  import { computed, inject } from 'vue';
  import { themeTokens, themeOutlineStyle } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import { BooleanProp, QTIIdentifierProp, StringProp } from '../../utils/props';
  import useTypedProps from '../../composables/useTypedProps';

  export const inlineChoiceStrings = createTranslator('InlineChoiceInteractionStrings', {
    placeholder: {
      message: 'Choose…',
      context:
        'Placeholder shown in an inline dropdown gap before the learner has chosen an answer',
    },
    notAnswered: {
      message: 'Not answered. Activate to choose an answer.',
      context: 'Accessible label for an inline dropdown gap that has not been answered yet',
    },
    answered: {
      message: 'Selected: {selection}. Activate to change your answer.',
      context: 'Accessible label for an inline dropdown gap that has been answered',
    },
  });

  const { placeholder$, notAnswered$, answered$ } = inlineChoiceStrings;

  const $themeTokens = themeTokens();

  function getComponentTag(vnode) {
    return get(vnode, ['componentOptions', 'Ctor', 'extendOptions', 'tag']);
  }

  // Plain-text label for a choice, joined from its (text) child vnodes.
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
    name: 'InlineChoiceInteraction',
    tag: 'qti-inline-choice-interaction',

    setup(props, { slots }) {
      const responses = inject('responses');
      const QTI_CONTEXT = inject('QTI_CONTEXT');
      const interactive = inject('interactive');
      const typedProps = useTypedProps(props);

      // Choices are static: parse the slot vnodes once rather than on every render.
      const allContent = (slots.default && slots.default()) || [];
      const choices = allContent
        .filter(vnode => getComponentTag(vnode) === 'qti-inline-choice')
        .map(vnode => ({
          identifier: vnode.componentOptions.propsData.identifier,
          text: (vnode.componentOptions.children || [])
            .map(vnodeToText)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
          fixed:
            vnode.componentOptions.propsData.fixed === 'true' ||
            vnode.componentOptions.propsData.fixed === true,
        }));

      const variable = computed(() => responses[typedProps.responseIdentifier.value]);
      const selectedValue = computed(() => variable.value?.value ?? null);

      const orderedChoices = computed(() => {
        if (!typedProps.shuffle.value) {
          return choices;
        }
        // Shuffle is seeded by the candidate so it is consistent for a given learner,
        // and choices with fixed="true" keep their original positions.
        const shuffleable = shuffled(
          choices.filter(choice => !choice.fixed),
          QTI_CONTEXT.value.candidateIdentifier,
        );
        return choices.map(choice => (choice.fixed ? choice : shuffleable.shift()));
      });

      const options = computed(() =>
        orderedChoices.value.map(choice => ({ label: choice.text, value: choice.identifier })),
      );

      const selectedText = computed(() => {
        const found = choices.find(choice => choice.identifier === selectedValue.value);
        return found ? found.text : '';
      });
      const isAnswered = computed(() => Boolean(selectedText.value));

      const placeholder = computed(() => typedProps.dataPrompt.value || placeholder$());
      const triggerLabel = computed(() =>
        isAnswered.value ? selectedText.value : placeholder.value,
      );
      const triggerAriaLabel = computed(() =>
        isAnswered.value ? answered$({ selection: selectedText.value }) : notAnswered$(),
      );

      const triggerStyles = computed(() => ({
        color: $themeTokens.text,
        backgroundColor: $themeTokens.surface,
        borderColor: isAnswered.value ? $themeTokens.primary : $themeTokens.fineLine,
      }));

      function onSelect(option) {
        if (!interactive.value) {
          return;
        }
        const responseVariable = variable.value;
        if (responseVariable) {
          responseVariable.value = option.value;
        }
      }

      return {
        $themeTokens,
        coreOutline: themeOutlineStyle(),
        interactive,
        options,
        isAnswered,
        triggerLabel,
        triggerAriaLabel,
        triggerStyles,
        onSelect,
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      responseIdentifier: QTIIdentifierProp(true),
      shuffle: BooleanProp(false, false),
      dataPrompt: StringProp(false),
      /* eslint-enable */
    },
  };

</script>


<style lang="scss" scoped>

  .qti-inline-choice-interaction {
    // Flow inline within the surrounding sentence, without stretching the line box.
    display: inline-flex;
    max-width: 100%;
    vertical-align: baseline;
  }

  .qti-inline-choice-trigger {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    padding: 2px 4px 2px 10px;
    margin: 0;
    font: inherit;
    line-height: inherit;
    text-align: start;
    cursor: pointer;
    border-style: solid;
    border-width: 1px;
    border-radius: 6px;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .qti-inline-choice-answered {
    font-weight: 600;
  }

  .qti-inline-choice-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qti-inline-choice-arrow {
    flex-shrink: 0;
  }

  .qti-inline-choice-report {
    cursor: default;
  }

  // QTI shared vocabulary: qti-input-width-N sizes the gap to roughly N characters.
  // We treat it as a minimum so a longer selected answer never breaks the line layout.
  @for $i from 1 through 40 {
    .qti-inline-choice-interaction.qti-input-width-#{$i} .qti-inline-choice-trigger {
      min-width: #{$i}ch;
    }
  }

  // QTI shared vocabulary: vertical alignment of the gap within the line.
  .qti-inline-choice-interaction.qti-valign-top {
    vertical-align: top;
  }

  .qti-inline-choice-interaction.qti-valign-middle {
    vertical-align: middle;
  }

  .qti-inline-choice-interaction.qti-valign-baseline {
    vertical-align: baseline;
  }

</style>
