<template>

  <!-- TODO: move this to be a core KBackLink -->
  <span
    v-show="!$isPrint"
    class="offset"
  >
    <KRouterLink
      :to="to"
      icon="back"
      :text="text"
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
