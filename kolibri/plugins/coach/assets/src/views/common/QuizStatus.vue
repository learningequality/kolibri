<template>

  <KPageContainer>
    <KButton
      :primary="true"
      text="Open Quiz"
      type="submit"
      style="margin-left: 0; margin-top: 1.5rem;"
    />
    <div><b>Recipients</b></div>
    <div>Entire class</div>
    <div><b>Average score</b></div>
    <div>--</div>
    <div><b>Question order</b></div>
    <div>Randomized</div>
  </KPageContainer>

</template>

<script>

  export default {
    name: 'QuizStatus',
  };

</script>

<style scoped lang='scss'>

  div:nth-child(2n) {
    margin-top: 1.5rem;
  }
  div {
    font-size: 0.925rem;
  }

</style>
