<template>

  <span class="offset">
    <UiIconButton
      type="flat"
      class="icon"
      tabIndex="-1"
      aria-hidden="true"
      @click="$emit('navIconClick')"
    >
      <mat-svg
        v-if="!isRtl"
        name="arrow_back"
        category="navigation"
        :style="{ fill: $coreActionNormal }"
      />
      <mat-svg
        v-else
        name="arrow_forward"
        category="navigation"
        :style="{ fill: $coreActionNormal }"
      />
    </UiIconButton>
    <KRouterLink :to="to" :text="text" />
  </span>

</template>


<script>

  import { mapGetters } from 'vuex';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'BackLink',
    components: {
      KRouterLink,
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
    computed: {
      ...mapGetters(['$coreActionNormal']),
    },
  };

</script>


<style lang="scss" scoped>

  .offset {
    position: relative;
    left: -10px;
  }

</style>
