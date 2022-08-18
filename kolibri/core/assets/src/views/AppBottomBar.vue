<template>

  <div class="bottom-bar">
    <div class="icons">
      <span
        v-for="(link, index) in navigationLinks"
        :key="index"
        class="icon-box"
        :activeClass="activeClasses"
      >
        <router-link
          ref="btn"
          :to="link.link"
        >
          <KIconButton
            :icon="link.icon"
            :color="link.color"
            :ariaLabel="link.title"
          />
        </router-link>


      </span>
    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'AppBottomBar',
    mixins: [commonCoreStrings],
    props: {
      navigationLinks: {
        type: Array,
        default: () => [],
        required: true,
      },
    },
    computed: {
      activeClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({ color: this.$themeTokens.primary })}`;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .bottom-bar {
    @extend %dropshadow-4dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 24;
    height: 48px;
    background-color: white;
  }

  .icons {
    //  margin-top: 4px;
    display: flex;
    justify-content: space-around;
  }

  .router-link-active {
    padding-top: 6px;
    border-top: 4px solid;
  }

  .icon-box {
    width: 48px;
  }

</style>
