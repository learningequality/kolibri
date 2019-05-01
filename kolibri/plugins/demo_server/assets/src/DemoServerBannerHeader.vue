<template>

  <h1>
    Welcome to the Kolibri demo site!
    <KButton
      class="open-button"
      :text="'More info'"
      appearance="flat-button"
      :primary="true"
      @click="$root.$emit('toggleBannerState')"
    />
  </h1>

</template>

<script>

  import KButton from 'kolibri.coreVue.components.KButton';

  export default {
    name: 'DemoServerBannerHeader',
    components: { KButton },
  };

</script>


<style lang="scss" scoped>

  .open-button {
    float: right;
    margin-top: 0;
  }

</style>
