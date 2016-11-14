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

      <!--VIEW-BY SWITCH-->
      <view-by-switch
        v-if="!isRecentView"
        :iscontent="isViewByContent"
        :vlink="viewByLink"
      ></view-by-switch>

      <!--TABLE SECTION-->
      <table class="data-table">
        <thead>
          <tr>
            <th is="header-cell"
              text="Name"
              :column="Constants.TableColumns.NAME"
              class="name-col"
            ></th>
            <th is="header-cell"
              text="Exercise Progress"
              :column="Constants.TableColumns.EXERCISE"
              class="progress-col"
            ></th>
            <th is="header-cell"
              text="Content Progress"
              :column="Constants.TableColumns.CONTENT"
              class="progress-col"
            ></th>
            <th is="header-cell"
              v-if="!isRecentView"
              text="Last Activity"
              :column="Constants.TableColumns.DATE"
              class="date-col"
            ></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in dataTable" track-by="id">
            <th scope="row" class="name-col">
              <item-cell
                :kind="node.kind"
                :title="node.title"
                :id="node.id"
                :parent="node.parent"
              ></item-cell>
            </th>
            <td class="progress-col">
              <progress-cell :num="node.exerciseProgress" :isexercise="true"></progress-cell>
            </td>
            <td class="progress-col">
              <progress-cell :num="node.contentProgress" :isexercise="false"></progress-cell>
            </td>
            <td class="date-col" v-if="!isRecentView">
              <date-cell :date="node.lastActive"></date-cell>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  </div>

</template>


<script>

  const Constants = require('../../state/constants');
  const getters = require('../../state/getters');
  const coreGetters = require('kolibri.coreVue.vuex.getters');
  const genLink = require('./genLink');
  const logging = require('kolibri.lib.logging');

  module.exports = {
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'all-recent-tabs': require('./all-recent-tabs'),
      'report-header': require('./report-header'),
      'summary-section': require('./summary-section'),
      'view-by-switch': require('./view-by-switch'),
      'header-cell': require('./header-cell'),
      'user-cell': require('./data-cells/user-cell'),
      'date-cell': require('./data-cells/date-cell'),
      'progress-cell': require('./data-cells/progress-cell'),
      'item-cell': require('./data-cells/item-cell'),
    },
    computed: {
      Constants() {
        return Constants; // allow constants to be accessed inside templates
      },
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
              vlink: genLink(this.pageState, {
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
          vlink: genLink(this.pageState, {
            content_scope: index ? Constants.ContentScopes.TOPIC : Constants.ContentScopes.ROOT,
            content_scope_id: item.pk,
          }),
        }));
        list.push({ title: this.pageState.content_scope_summary.title });
        return list;
      },
      recentViewLink() {
        return genLink(this.pageState, {
          all_or_recent: Constants.AllOrRecent.RECENT,
          content_scope: Constants.ContentScopes.ROOT, // recent view only applies to root
          content_scope_id: this.currentChannel.root_id,
          view_by_content_or_learners: Constants.ViewBy.CONTENT,
        });
      },
      allViewLink() {
        return genLink(this.pageState, { all_or_recent: Constants.AllOrRecent.ALL });
      },
      viewByLink() {
        const view = this.isViewByContent ? Constants.ViewBy.LEARNERS : Constants.ViewBy.CONTENT;
        return genLink(this.pageState, { view_by_content_or_learners: view });
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        exerciseCount: getters.exerciseCount,
        exerciseProgress: getters.exerciseProgress,
        contentCount: getters.contentCount,
        contentProgress: getters.contentProgress,
        dataTable: getters.dataTable,
        currentChannel: coreGetters.getCurrentChannelObject,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .data-table
    width: 100%
    font-size: smaller

    td, th
      padding: 10px

    .name-col
      text-align: left

    .progress-col
      text-align: center
      width: 20%

    .date-col
      text-align: center
      width: 150px

</style>
