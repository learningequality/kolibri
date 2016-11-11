<template>

  <div>
    <h1>Reports</h1>

    <!--USER BREADCRUMBS-->
    <breadcrumbs :list="userBreadcrumbs"></breadcrumbs>

    <!--TABS-->
    <all-recent-tabs
      :recentviewlink="recentViewLink"
      :allviewlink="allViewLink"
      :isrecentview="isRecentView"
    ></all-recent-tabs>


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
      <summary-section
        :kind="pageState.content_scope_summary.kind"
        :exercisecount="exerciseCount"
        :exerciseprogress="exerciseProgress"
        :contentcount="contentCount"
        :contentprogress="contentProgress"
        :lastactive="pageState.content_scope_summary.last_active"
        :singleuser="isSingleUser"
      ></summary-section>

      <!--VIEW BY RADIOS-->
      <view-by-switch
        v-if="!isRecentView"
        :iscontent="isViewByContent"
        @toggled="switchView"
      ></view-by-switch>

      <!--LIST SECTION-->
      <list-section></list-section>
    </div>
  </div>

</template>


<script>

  const Constants = require('../../state/constants');
  const logging = require('kolibri.lib.logging');

  /* given an array of objects sum the keys on those that pass the filter */
  function sumOfKeys(array, key, filter = () => true) {
    return array
      .filter(filter)
      .reduce((prev, item) => prev + item[key], 0);
  }

  module.exports = {
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'all-recent-tabs': require('./all-recent-tabs'),
      'report-header': require('./report-header'),
      'summary-section': require('./summary-section'),
      'view-by-switch': require('./view-by-switch'),
      'list-section': require('./list-section'),
    },
    computed: {
      isViewByContent() {
        return this.pageState.view_by_content_or_learners === Constants.ViewBy.CONTENT;
      },
      isRecentView() {
        return this.pageState.all_or_recent === Constants.AllOrRecent.RECENT;
      },
      isSingleUser() {
        return this.pageState.user_scope === Constants.UserScopes.USER;
      },
      userBreadcrumbs() {
        if (this.pageState.user_scope === Constants.UserScopes.FACILITY) {
          return [{ title: 'All Learners' }];
        } else if (this.pageState.user_scope === Constants.UserScopes.USER) {
          const FACILITY_ID = '1'; // TODO - facility ID should not be hard-coded.
          return [
            {
              title: 'All Learners',
              vlink: this.genLink({
                user_scope: Constants.UserScopes.FACILITY,
                user_scope_id: FACILITY_ID,
              }),
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
            content_scope: index ? Constants.ContentScopes.TOPIC : Constants.ContentScopes.ROOT,
            content_scope_id: item.pk,
          }),
        }));
        list.push({ title: this.pageState.content_scope_summary.title });
        return list;
      },
      exerciseCount() {
        return sumOfKeys(
          this.pageState.content_scope_summary.progress,
          'node_count',
          item => item.kind === 'exercise'
        );
      },
      exerciseProgress() {
        const totalProgress = sumOfKeys(
          this.pageState.content_scope_summary.progress,
          'total_progress',
          item => item.kind === 'exercise'
        );
        return totalProgress / this.exerciseCount;
      },
      contentCount() {
        return sumOfKeys(
          this.pageState.content_scope_summary.progress,
          'node_count',
          item => item.kind !== 'exercise'
        );
      },
      contentProgress() {
        const totalProgress = sumOfKeys(
          this.pageState.content_scope_summary.progress,
          'total_progress',
          item => item.kind !== 'exercise'
        );
        return totalProgress / this.contentCount;
      },
      recentViewLink() {
        return this.genLink({
          all_or_recent: Constants.AllOrRecent.RECENT,
          content_scope: Constants.ContentScopes.ROOT, // recent view only applies to root
          content_scope_id: 'root_id', // TODO: get root id
          // recent view is only viewable by content
          view_by_content_or_learners: Constants.ViewBy.CONTENT,
          // These are not really taken into account in recent view but it doesn't hurt
          sort_column: Constants.SortCols.DATE,
          sort_order: Constants.SortOrders.DESC,
        });
      },
      allViewLink() {
        return this.genLink({ all_or_recent: Constants.AllOrRecent.ALL });
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
          name: Constants.PageNames.REPORTS,
          params: {},
        };
        Object.assign(vlink.params, currentParams, newParams);
        return vlink;
      },
      switchView(isContent) {
        const newView = isContent ? Constants.ViewBy.CONTENT : Constants.ViewBy.LEARNERS;
        this.$router.go(this.genLink({ view_by_content_or_learners: newView }));
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
