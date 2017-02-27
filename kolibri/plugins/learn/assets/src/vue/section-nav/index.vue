<template>

  <ui-tabs
    ref="tabs"
    class="learn-tabs"
    type="icon-and-text"
    :disableRipple="true">
    <ui-tab
      icon="forum"
      :title="$tr('learnName')"
      :selected="isRecommended"/>
    <ui-tab
      icon="folder"
      :title="$tr('exploreName')"
      :selected="!isRecommended"/>
  </ui-tabs>

</template>


<script>

  const Constants = require('../../state/constants');

  module.exports = {
    $trNameSpace: 'sectionNav',
    $trs: {
      learnName: 'Recommended',
      exploreName: 'Topics',
    },
    components: {
      'ui-tabs': require('keen-ui/src/UiTabs'),
      'ui-tab': require('keen-ui/src/UiTab'),
    },
    computed: {
      isRecommended() {
        return this.pageName === Constants.PageNames.LEARN_CHANNEL;
      },
    },
    methods: {
      navigateToTab(tab) {
        switch (tab) {
          case 'Recommended':
            this.$router.push({ name: Constants.PageNames.LEARN_ROOT });
            return;

          case 'Topics':
            this.$router.push({ name: Constants.PageNames.EXPLORE_ROOT });
            return;

          default:
            return;
        }
      },
      addTabListeners() {
        const tabs = Array.from(this.$refs.tabs.$el.querySelectorAll('.ui-tab-header-item'));
        tabs.forEach((tab) => {
          tab.addEventListener('click', () => {
            const tabClicked = tab.querySelectorAll('.ui-tab-header-item__text')[0].innerHTML;
            this.navigateToTab(tabClicked);
          }, false);
        });
      },
    },
    mounted() {
      this.$nextTick(this.addTabListeners);
    },
    beforeDestroy() {
      // TODO: Remove event listeners
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>


<style lang="stylus">

  // hide body od tabs
  .learn-tabs > .ui-tabs__body
    display: none

</style>
