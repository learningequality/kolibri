<template>

  <!-- TODO: move this to be a core KBackLink -->
  <span v-show="!$isPrint" class="offset">
    <UiIconButton
      type="flat"
      class="icon"
      tabIndex="-1"
      aria-hidden="true"
      @click="go"
    >
      <mat-svg
        v-if="!isRtl"
        name="arrow_back"
        category="navigation"
        :style="{ fill: $themeTokens.primary }"
      />
      <mat-svg
        v-else
        name="arrow_forward"
        category="navigation"
        :style="{ fill: $themeTokens.primary }"
      />
    </UiIconButton>
    <KRouterLink :to="to" :text="text" />
  </span>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'BackLink',
    components: {
      UiIconButton,
    },
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
