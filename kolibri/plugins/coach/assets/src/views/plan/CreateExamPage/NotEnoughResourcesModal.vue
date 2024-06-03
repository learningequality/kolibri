<template>

  <KModal
    :title="notEnoughReplacementsTitle$()"
    :submitText="addResourcesAction$()"
  >
    <p>
      {{
        notEnoughReplacementsMessage$({
          selected: selectedQuestions.length,
          available: availableResources.length,
        })
      }}
    </p>
    <p v-if="availableResources.length">
      {{
        addMoreResourcesWithNonEmptyPool$({
          available: availableResources.length,
        })
      }}
    </p>
    <p v-else>
      {{ addMoreResourcesWithEmptyPool$() }}
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
          {{ addResourcesAction$() }}
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
        addResourcesAction$,
        notEnoughReplacementsTitle$,
        notEnoughReplacementsMessage$,
        addMoreResourcesWithEmptyPool$,
        addMoreResourcesWithNonEmptyPool$,
      } = enhancedQuizManagementStrings;
      return {
        goBackAction$,
        addResourcesAction$,
        notEnoughReplacementsTitle$,
        notEnoughReplacementsMessage$,
        addMoreResourcesWithEmptyPool$,
        addMoreResourcesWithNonEmptyPool$,
      };
    },
    props: {
      selectedQuestions: {
        type: Array,
        required: true,
      },
      availableResources: {
        type: Array,
        required: true,
      },
    },
  };

</script>
