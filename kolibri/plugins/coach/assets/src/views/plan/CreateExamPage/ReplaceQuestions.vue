<template>

  <div>
    <h1>Replace questions</h1>
    <p v-for="(question, index) in selectedActiveQuestions.value" :key="`${index}q`">
      {{ JSON.stringify(question) }}
    </p>
    <h2>
      <KRouterLink appearance="raised-button" :to="{ path: 'select-resources' }">
        Select resources
      </KRouterLink>
    </h2>
  </div>

</template>


<script>

  import { injectQuizCreation } from '../../../composables/useQuizCreation';

  export default {
    name: 'ReplaceQuestions',
    setup() {
      const {
        // Computed
        selectedActiveQuestions,
      } = injectQuizCreation();
      return {
        selectedActiveQuestions,
      };
    },
  };

</script>
