<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <div>
    <ScrollingHeader :scrollPosition="0">
      <AppBar
        ref="appBar"
        :title="title"
        :hideNavBar="hideNavBar"
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
  import SideNav from 'kolibri.coreVue.components.SideNav';

  export default {
    name: 'AppBarCorePage',
    components: { AppBar, LanguageSwitcherModal, SideNav },
    props: {
      title: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
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
          paddingTop: '32px',
          paddingBottom: '72px',
          marginTop: 0,
        };
      },
    },
  };

</script>
