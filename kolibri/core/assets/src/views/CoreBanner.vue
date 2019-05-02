<template>

  <div>
    <div
      class="banner"
      :style="{ background: $coreBgLight, position: bannerClosed ? 'absolute' : 'relative' }"
      :tabindex="0"
      role="dialog"
    >
      <div class="banner-inner">
        <component :is="persistentComponent" v-if="bannerClosed" />
        <component :is="defaultComponent" v-if="!bannerClosed" />
      </div>

    </div>
    <div v-if="!bannerClosed" class="mask"></div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'CoreBanner',
    mixins: [themeMixin],
    props: {
      initiallyClosed: {
        type: Boolean,
        required: false,
        default: false
      },
      // The default component is the body of the banner's content.
      defaultComponent: {
        type: Object,
        required: true,
      },
      // The Persistent Component is shown while closed.
      persistentComponent: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        bannerClosed: this.initiallyClosed,
      };
    },
    mounted() {
      this.$root.$on('toggleBannerState', () => {
        this.bannerClosed = !this.bannerClosed;
        this.$root.$emit('bannerStateChanged', { bannerClosed: this.bannerClosed });
      });
    },
  };

</script>


<style lang="scss" scoped>

  .banner {
    position: relative;
    top: 0%;
    left: 0%;
    z-index: 7500;
    width: 100%;
    margin: 0 auto;
    overflow-y: auto;
    box-shadow: 0 2px 50px rgba(0, 0, 0, 1);
  }

  .banner-inner {
    max-width: 1000px;
    padding-top: 0;
    padding-right: 12px;
    padding-left: 12px;
    margin: 0 auto;
    h1 {
      font-weight: bold;
    }
  }

  .close-button {
    float: right;
    margin-bottom: 24px;
  }

  .open-button {
    float: right;
    margin-top: 0;
  }

  .mask {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 4000;
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    background-color: rgba(0, 0, 0, 0.375);
  }

</style>
