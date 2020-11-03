<template>

  <!-- TODO: move this to be a core KBackLink -->
  <span class="offset">
    <KRouterLink
      icon="back"
      :text="text"
      :color="$themeTokens.primary"
      :to="to"
    />
  </span>

</template>


<script>

  export default {
    name: 'BackLink',
    props: {
      text: {
        type: String,
        required: true,
      },
      to: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .offset {
    position: relative;
    left: -10px;
  }

</style>
