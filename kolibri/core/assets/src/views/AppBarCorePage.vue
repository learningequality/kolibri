<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <div>
    <ScrollingHeader :scrollPosition="0">
      <AppBar
        ref="appBar"
        :title="title"
        @toggleSideNav="navShown = !navShown"
        @showLanguageModal="languageModalShown = true"
      >
        <template #sub-nav>
          <slot name="subNav"></slot>
        </template>
      </AppBar>
    </ScrollingHeader>

    <div class="main-wrapper" :style="wrapperStyles">
      <slot></slot>
    </div>

    <SideNav
      ref="sideNav"
      :navShown="navShown"
      @toggleSideNav="navShown = !navShown"
    />

    <LanguageSwitcherModal
      v-if="languageModalShown"
      ref="languageSwitcherModal"
      :style="{ color: $themeTokens.text }"
      @cancel="languageModalShown = false"
    />
  </div>

</template>


<script>

  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
  import SideNav from 'kolibri.coreVue.components.SideNav';

  export default {
    name: 'AppBarCorePage',
    components: { AppBar, LanguageSwitcherModal, ScrollingHeader, SideNav },
    props: {
      title: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        appBarHeight: 0,
        languageModalShown: false,
        navShown: false,
      };
    },
    computed: {
      wrapperStyles() {
        return {
          width: '100%',
          display: 'inline-block',
          backgroundColor: this.$themePalette.grey.v_100,
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingTop: this.appBarHeight + 32 + 'px',
          paddingBottom: '72px',
          marginTop: 0,
        };
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
      });
    },
  };

</script>
