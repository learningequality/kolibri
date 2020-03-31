<template>

  <!-- TODO: move this to be a core KBackLink -->
  <span v-show="!$isPrint" class="offset">
    <router-link :to="go">
      <KLabeledIcon
        icon="back"
        :label="text"
        :color="$themeTokens.primary"
        style="text-decoration: underline;"
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
    methods: {
      go() {
        this.$router.push(this.to);
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
