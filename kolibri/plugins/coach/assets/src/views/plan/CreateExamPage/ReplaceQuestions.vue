<template>

  <div>
    <h1>Replace questions</h1>
    <p v-for="(question,index) in quizForge.selectedActiveQuestions.value" :key="`${index}q`">
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

  export default {
    name: 'ReplaceQuestions',
    inject: ['quizForge'],
  };

</script>
