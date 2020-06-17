<template>

  <!-- TODO: move this to be a core KBackLink -->
  <span class="offset">
    <router-link :to="to">
      <KLabeledIcon
        icon="back"
        :label="text"
        :color="$themeTokens.primary"
        :style="`text-decoration: underline; color: ${$themeTokens.primary}`"
      />
    </router-link>
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
