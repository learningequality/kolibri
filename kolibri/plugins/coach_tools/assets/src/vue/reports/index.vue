<template>

  <div>
    <h1>Reports</h1>

    <!--USER BREADCRUMBS-->
    <breadcrumbs :list="userBreadcrumbs"></breadcrumbs>

    <!--TABS-->
    <div class="tabs">
      <a href="/recent_view"><button :class="{ active: isRecentView }">Recent</button></a>
      <a href="/topic_view"><button :class="{ active: !isRecentView }">Topics</button></a>
    </div>

    <div class="tabcontents">
      <!--CONTENT BREADCRUMBS-->
      <breadcrumbs :list="contentBreadcrumbs"></breadcrumbs>

      <!--HEADER SECTION-->
      <report-header
        :contentkind="pageState.content_scope_summary.kind"
        :contenttitle="pageState.content_scope_summary.title"
        :userfullname="pageState.user_scope_summary.full_name"
      ></report-header>

      <!--SUMMARY SECTION-->
      <summary-section></summary-section>

      <!--VIEW BY RADIOS-->
      <view-by-switch
        v-if="!isRecentView"
        :value="pageState.view_by_content_or_learners"
        @switch="switchView"
      ></view-by-switch>

      <!--LIST SECTION-->
      <list-section></list-section>
    </div>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const logging = require('kolibri.lib.logging');

  module.exports = {
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'report-header': require('./report-header'),
      'summary-section': require('./summary-section'),
      'view-by-switch': require('./view-by-switch'),
      'list-section': require('./list-section'),
    },
    computed: {
      userBreadcrumbs() {
        if (this.pageState.user_scope === 'facility') {
          return [{ title: 'All Learners' }];
        } else if (this.pageState.user_scope === 'user') {
          const FACILITY_ID = '1'; // TODO - facility ID should not be hard-coded.
          return [
            {
              title: 'All Learners',
              vlink: this.genLink({ user_scope: 'facility', user_scope_id: FACILITY_ID }),
            },
            { title: this.pageState.user_scope_summary.full_name },
          ];
        }
        logging.error(`Unhandled user_scope: '${this.pageState.user_scope}'`);
        return [];
      },
      contentBreadcrumbs() {
        const list = this.pageState.content_scope_summary.ancestors.map((item, index) => ({
          title: item.title,
          vlink: this.genLink({
            content_scope: index ? 'topic' : 'root',
            content_scope_id: item.pk,
          }),
        }));
        list.push({ title: this.pageState.content_scope_summary.title });
        return list;
      },
      isRecentView() {
        return this.pageState.all_or_recent === 'recent';
      },
    },
    methods: {
      /* Generates a REPORTS link relative to the current page, with only newParams changed. */
      genLink(newParams) {
        const currentParams = {
          channel_id: this.pageState.channel_id,
          content_scope: this.pageState.content_scope,
          content_scope_id: this.pageState.content_scope_id,
          user_scope: this.pageState.user_scope,
          user_scope_id: this.pageState.user_scope_id,
          all_or_recent: this.pageState.all_or_recent,
          view_by_content_or_learners: this.pageState.view_by_content_or_learners,
          sort_column: this.pageState.sort_column,
          sort_order: this.pageState.sort_order,
        };
        const vlink = {
          name: PageNames.REPORTS,
          params: {},
        };
        Object.assign(vlink.params, currentParams, newParams);
        return vlink;
      },
      switchView(newView) {
        this.$router.go(this.genLink({ view_by_content_or_learners: newView }));
      },
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .tabs button
    background-color: $core-bg-light
    color: $core-action-normal
    border: none
    padding: 5px 15px
    font-size: 1em
    border-radius: 0
    border-bottom: solid 3px white
    margin-top: 5px

  .tabs button.active
    border-bottom: solid 3px $core-action-normal

  .tabcontents
    background-color: $core-bg-light

</style>
