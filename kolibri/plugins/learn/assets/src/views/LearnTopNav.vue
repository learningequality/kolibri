<template>

  <HorizontalNavBarWithOverflowMenu
    ref="navigation" 
    :ariaLabel="$tr('learnPageMenuLabel')"
    :navigationLinks="links"
  />

</template>


<script>

  import { mapGetters } from 'vuex';
  import HorizontalNavBarWithOverflowMenu from 'kolibri.coreVue.components.HorizontalNavBarWithOverflowMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import useCoreLearn from '../composables/useCoreLearn';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'LearnTopNav',
    components: {
      HorizontalNavBarWithOverflowMenu,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { inClasses } = useCoreLearn();
      return {
        inClasses,
      };
    },
    data() {
      return {
        links: [
          {
            isVisible: this.isUserLoggedIn,
            title: this.coreString('homeLabel'),
            link: this.$router.getRoute(PageNames.HOME),
            icon: 'dashboard',
            color: this.$themeTokens.textInverted,
          },
          {
            isVisible: this.canAccessUnassignedContent,
            title: this.learnString('libraryLabel'),
            link: this.$router.getRoute(PageNames.LIBRARY),
            icon: 'library',
            color: this.$themeTokens.textInverted,
          },
          {
            isVisible: this.isUserLoggedIn && this.canAccessUnassignedContent,
            title: this.coreString('bookmarksLabel'),
            link: this.$router.getRoute(PageNames.BOOKMARKS),
            icon: 'bookmark',
            color: this.$themeTokens.textInverted,
          },
        ],
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'canAccessUnassignedContent']),
    },
    $trs: {
      learnPageMenuLabel: {
        message: 'Learn page menu',
        context: 'Indicates the purpose of a navigation bar at the top of the page',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
