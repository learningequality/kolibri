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
  import useChannels from '../composables/useChannels';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'LearnTopNav',
    components: {
      HorizontalNavBarWithOverflowMenu,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { inClasses } = useCoreLearn();
      const { channels } = useChannels();
      return {
        channels,
        inClasses,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'canAccessUnassignedContent']),
      hasChannels() {
        return this.channels.length > 0;
      },
      links() {
        return [
          {
            isHidden: !this.isUserLoggedIn || !this.hasChannels,
            title: this.coreString('homeLabel'),
            link: this.$router.getRoute(PageNames.HOME),
            icon: 'dashboard',
            color: this.$themeTokens.textInverted,
          },
          {
            isHidden: !this.canAccessUnassignedContent,
            title: this.coreString('libraryLabel'),
            link: this.$router.getRoute(PageNames.LIBRARY),
            icon: 'library',
            color: this.$themeTokens.textInverted,
          },
          {
            isHidden: !this.isUserLoggedIn || !this.canAccessUnassignedContent || !this.hasChannels,
            title: this.coreString('bookmarksLabel'),
            link: this.$router.getRoute(PageNames.BOOKMARKS),
            icon: 'bookmark',
            color: this.$themeTokens.textInverted,
          },
        ];
      },
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
