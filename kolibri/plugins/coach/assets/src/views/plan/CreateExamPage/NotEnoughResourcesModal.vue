<template>

  <KModal
    :title="notEnoughReplacementsTitle$()"
  >
    <p v-if="availableQuestions.length">
      {{
        notEnoughReplacementsMessage$({
          selected: selectedQuestions.length,
          available: availableQuestions.length,
        })
      }}
    </p>
    <p v-else>
      {{ noReplacementsMessage$() }}
    </p>
    <p v-if="availableQuestions.length">
      {{
        addMoreQuestionsWithNonEmptyPool$()
      }}
    </p>
    <p v-else>
      {{ addMoreQuestionsWithEmptyPool$() }}
    </p>
    <template #actions>
      <KButtonGroup>
        <KButton
          @click="() => $emit('close')"
        >
          {{ goBackAction$() }}
        </KButton>
        <KButton
          primary
          @click="() => $emit('addResources')"
        >
          {{ addQuestions$() }}
        </KButton>
      </KButtonGroup>
    </template>
  </KModal>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';

  export default {
    name: 'NotEnoughResourcesModal',
    setup() {
      const {
        goBackAction$,
        addQuestions$,
        notEnoughReplacementsTitle$,
        notEnoughReplacementsMessage$,
        addMoreQuestionsWithEmptyPool$,
        addMoreQuestionsWithNonEmptyPool$,
        noReplacementsMessage$,
      } = enhancedQuizManagementStrings;
      return {
        goBackAction$,
        addQuestions$,
        notEnoughReplacementsTitle$,
        notEnoughReplacementsMessage$,
        addMoreQuestionsWithEmptyPool$,
        addMoreQuestionsWithNonEmptyPool$,
        noReplacementsMessage$,
      };
    },
    props: {
      selectedQuestions: {
        type: Array,
        required: true,
      },
      availableQuestions: {
        type: Array,
        required: true,
      },
    },
  };

</script>
