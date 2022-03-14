<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <ScrollingHeader :scrollPosition="0">
    <AppBar
      ref="appBar"
      class="app-bar"
      :title="title"
      @toggleSideNav="$emit('toggleSideNav')"
      @showLanguageModal="$emit('showLanguageModal')"
    >
      <template #sub-nav>
        <FacilityTopNav v-if="!hideNavBar" />
      </template>
    </AppBar>

  </ScrollingHeader>

</template>


<script>

  import AppBar from 'kolibri.coreVue.components.AppBar';
  import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
  import FacilityTopNav from './FacilityTopNav';

  export default {
    name: 'FacilityAppBar',
    components: {
      AppBar,
      FacilityTopNav,
      ScrollingHeader,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      hideNavBar: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
