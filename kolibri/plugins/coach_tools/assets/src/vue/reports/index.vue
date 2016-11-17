<template>

  <div>
    <!--USER BREADCRUMBS-->
    <breadcrumbs :list="userBreadcrumbs"></breadcrumbs>

    <!--TABS-->
    <all-recent-tabs
      :recentviewlink="recentViewLink"
      :allviewlink="allViewLink"
      :isrecentview="isRecentView"
    ></all-recent-tabs>


    <div class="tabcontents">
      <div class="top-section">
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
          :usercount="userCount"
          :completioncount="completionCount"
          :userscompleted="usersCompleted"
          :isrecentview="isRecentView"
        ></summary-section>
      </div>

      <!-- TABLE SECTION -->
      <div v-if="!isSingleUser || !isSingleItem" class="table-section">
        <!--VIEW-BY SWITCH-->
        <view-by-switch
          v-if="!isRecentView"
          :iscontent="isViewByContent"
          :vlink="viewByLink"
          :disabled="isSingleUser || isSingleItem"
        ></view-by-switch>

        <!--TABLE SECTION-->
        <table class="data-table">
          <thead>
            <tr>
              <th is="header-cell"
                :text="$tr('name')"
                :column="Constants.TableColumns.NAME"
                class="name-col"
              ></th>
              <th is="header-cell"
                :text="$tr('avg-exercise-progress')"
                :column="Constants.TableColumns.EXERCISE"
                class="progress-col"
              ></th>
              <th is="header-cell"
                :text="$tr('avg-content-progress')"
                :column="Constants.TableColumns.CONTENT"
                class="progress-col"
              ></th>
              <th is="header-cell"
                v-if="!isRecentView"
                :text="$tr('last-activity')"
                :column="Constants.TableColumns.DATE"
                class="date-col"
              ></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dataTable" track-by="id" transition="item">
              <th scope="row" class="name-col">
                <item-cell
                  :kind="row.kind"
                  :title="row.title"
                  :id="row.id"
                  :parent="row.parent"
                  :exercisecount="row.exerciseCount"
                  :contentcount="row.contentCount"
                ></item-cell>
              </th>
              <td class="progress-col">
                <progress-cell :num="row.exerciseProgress" :isexercise="true"></progress-cell>
              </td>
              <td class="progress-col">
                <progress-cell :num="row.contentProgress" :isexercise="false"></progress-cell>
              </td>
              <td class="date-col" v-if="!isRecentView">
                <date-cell :date="row.lastActive"></date-cell>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
    $trNameSpace: 'report-page',
    $trs: {
      'name': 'Name',
      'avg-exercise-progress': 'Avg. Exercise Progress',
      'avg-content-progress': 'Avg. Content Progress',
      'last-activity': 'Last Activity',
    },
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
      isSingleItem() {
        return this.pageState.content_scope === Constants.ContentScopes.CONTENT;
      },
      userBreadcrumbs() {
        if (this.pageState.user_scope === Constants.UserScopes.FACILITY) {
          return [{ title: `All Learners (${this.userCount})` }];
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
        // target of the link is the opposite of the current view
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
        userCount: getters.userCount,
        completionCount: getters.completionCount,
        currentChannel: coreGetters.getCurrentChannelObject,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require './reports.styl'

  .data-table
    width: 100%
    font-size: smaller
    border-spacing: 0

    td, th
      padding: $col-padding

    .name-col
      text-align: left

    .progress-col
      text-align: center
      width: $progress-col-width

    .date-col
      text-align: center
      width: $date-col-width

  .item-move
    transition: transform 0.5s cubic-bezier(0.55, 0, 0.1, 1)

  .top-section,
  .table-section
    background-color: $core-bg-light
    margin-top: 1em
    margin-bottom: 1em
    padding: 1em

</style>
