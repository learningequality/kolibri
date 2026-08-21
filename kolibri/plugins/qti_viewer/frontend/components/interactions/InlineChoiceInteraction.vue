<template>

  <span
    class="qti-inline-choice-interaction"
    :style="rootStyles"
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
      <span
        class="qti-inline-choice-label"
        dir="auto"
      >{{ triggerLabel }}</span>
      <KIcon
        icon="dropdown"
        class="qti-inline-choice-arrow"
      />
      <KDropdownMenu
        :options="options"
        @select="onSelect"
      >
        <!--
          The slot is overridden only to set dir="auto", so that a choice written in a
          right-to-left script reads correctly. Overriding it replaces UiMenuOption's own
          markup, so the two layout classes it supplies (row height, padding, truncation)
          have to be reproduced here or every option loses its alignment.
        -->
        <template #option="{ option }">
          <div
            class="ui-menu-option-content"
            dir="auto"
          >
            <div class="ui-menu-option-text">{{ option.label }}</div>
          </div>
        </template>
      </KDropdownMenu>
    </button>
    <span
      v-else
      class="qti-inline-choice-report qti-inline-choice-trigger"
      dir="auto"
      :style="triggerStyles"
    >{{ triggerLabel }}</span>
  </span>

</template>


<script>

  import { computed, inject } from 'vue';
  import { themeTokens, themeOutlineStyle } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';
  import { choiceText, getComponentTag, isFixed, orderChoices } from '../../utils/choices';
  import {
    BooleanProp,
    NonNegativeIntProp,
    QTIIdentifierProp,
    StringProp,
  } from '../../utils/props';
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
    notAnsweredGap: {
      message: 'Gap {number} of {total}: not answered. Activate to choose an answer.',
      context:
        'Accessible label for an unanswered inline dropdown gap when a passage has several gaps, so a screen-reader user can tell the gaps apart',
    },
    answeredGap: {
      message: 'Gap {number} of {total}: selected {selection}. Activate to change your answer.',
      context:
        'Accessible label for an answered inline dropdown gap when a passage has several gaps, so a screen-reader user can tell the gaps apart',
    },
  });

  const { placeholder$, notAnswered$, answered$, notAnsweredGap$, answeredGap$ } =
    inlineChoiceStrings;

  const $themeTokens = themeTokens();

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
          text: choiceText(vnode),
          fixed: isFixed(vnode),
        }));

      const variable = computed(() => responses.value[typedProps.responseIdentifier.value]);
      const selectedValue = computed(() => variable.value?.value ?? null);

      const orderedChoices = computed(() =>
        orderChoices(choices, {
          shuffle: typedProps.shuffle.value,
          seed: QTI_CONTEXT.value.candidateIdentifier,
        }),
      );

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
      // When a passage has several gaps, each accessible name is prefixed with the gap's
      // position ("gap 2 of 3")
      // A lone gap keeps the shorter, unnumbered wording.
      const triggerAriaLabel = computed(() => {
        const number = typedProps.dataGapNumber.value;
        const total = typedProps.dataGapCount.value;
        const numbered = total > 1;
        if (isAnswered.value) {
          const selection = selectedText.value;
          return numbered ? answeredGap$({ number, total, selection }) : answered$({ selection });
        }
        return numbered ? notAnsweredGap$({ number, total }) : notAnswered$();
      });

      const rootStyles = computed(() => ({ color: $themeTokens.text }));
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
        coreOutline: themeOutlineStyle(),
        interactive,
        options,
        isAnswered,
        triggerLabel,
        triggerAriaLabel,
        rootStyles,
        triggerStyles,
        onSelect,
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      responseIdentifier: QTIIdentifierProp(true),
      shuffle: BooleanProp(false, false),
      dataPrompt: StringProp(false),
      // Position of this gap and the total gap count in the passage, injected by AssessmentItem
      // (numberPassageGaps) purely to build a distinct accessible name per gap.
      dataGapNumber: NonNegativeIntProp(false, 0),
      dataGapCount: NonNegativeIntProp(false, 0),
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
