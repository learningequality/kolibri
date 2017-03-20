<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('coachTitle')">
    <div slot="app-bar-actions">
      <channel-switcher @switch="switchChannel"/>
    </div>

    <div v-if="isCoachAdminOrSuperuser" slot="content">
      <div v-if="notRootPage" class="page">
        <top-nav/>
      </div>
      <component class="page" :is="currentPage"/>
    </div>

    <div v-else slot="content" class="login-message">
      <h1>{{ $tr('logInPrompt') }}</h1>
      <p>{{ $tr('logInCommand') }}</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const constants = require('../state/constants');
  const isCoachAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isCoachAdminOrSuperuser;
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    $trNameSpace: 'coach-root',
    $trs: {
      coachTitle: 'Coach',
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as an Admin to view this page.',
    },
    components: {
      'top-nav': require('./top-nav'),
      'class-list': require('./class-list'),
      'recent': require('./recent'),
      'topics': require('./topics'),
      'exams': require('./exams'),
      'learners': require('./learners'),
      'groups': require('./groups'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'channel-switcher': require('kolibri.coreVue.components.channelSwitcher'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        if (this.pageName === constants.PageNames.CLASS_LIST) {
          return 'class-list';
        }
        if (this.pageName === constants.PageNames.RECENT) {
          return 'recent';
        }
        if (this.pageName === constants.PageNames.TOPICS) {
          return 'topics';
        }
        if (this.pageName === constants.PageNames.EXAMS) {
          return 'exams';
        }
        if (this.pageName === constants.PageNames.LEARNERS) {
          return 'learners';
        }
        if (this.pageName === constants.PageNames.GROUPS) {
          return 'groups';
        }
        return null;
      },
      notRootPage() {
        return this.pageName !== constants.PageNames.CLASS_LIST;
      },
    },
    methods: {
      switchChannel(channelId) {
        this.$router.push({
          name: constants.PageNames.REPORTS_CHANNEL,
          params: {
            channel_id: channelId,
          },
        });
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isCoachAdminOrSuperuser,
      },
    },
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .login-message
    text-align: center
    margin-top: 200px

</style>
