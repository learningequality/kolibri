<template>

  <div>
    <div class="tabcontents">
      <div class="top-section">

        <!--HEADER SECTION-->
        <h2>
          <!--
          <span v-if="pageState.userScopeSummary.full_name">
            <mat-svg category="social" name="person"/>
            {{ pageState.userScopeSummary.full_name }} -
          </span>
          -->
          <content-icon
            :kind="pageState.contentScopeSummary.kind"
            colorstyle="text-default"
          />
          {{ pageState.contentScopeSummary.title }}
        </h2>

        <!--SUMMARY SECTION-->
        <summary-section
          :kind="pageState.contentScopeSummary.kind"
          :exerciseCount="exerciseCount"
          :exerciseProgress="exerciseProgress"
          :contentCount="contentCount"
          :contentProgress="contentProgress"
          :singleUser="isSingleUser"
          :userCount="userCount"
          :completionCount="completionCount"
          :isRecentView="isRecentPage"
        />

        <!--CONTENT BREADCRUMBS-->
        <breadcrumbs :list="contentBreadcrumbs"/>

      </div>

      <!-- TABLE SECTION -->
      <div v-if="!isSingleUser || !isSingleItem" class="table-section">

        <!--TABLE SECTION-->
        <table class="data-table">
          <thead>
            <tr>
              <th is="header-cell"
                :text="$tr('name')"
                :column="ReportConstants.TableColumns.NAME"
                class="name-col coach-filter table-name"
              ></th>
              <th is="header-cell"
                :text="$tr('avg-exercise-progress')"
                :column="ReportConstants.TableColumns.EXERCISE"
                class="progress-col coach-filter"
              ></th>
              <th is="header-cell"
                :text="$tr('avg-content-progress')"
                :column="ReportConstants.TableColumns.CONTENT"
                class="progress-col coach-filter"
              ></th>
              <th is="header-cell"
                :text="$tr('last-activity')"
                :column="ReportConstants.TableColumns.DATE"
                class="date-col coach-filter"
              ></th>
            </tr>
          </thead>
          <tbody is="transition-group" name="item">
            <tr v-for="row in dataTable" :key="row.id">
              <th scope="row" class="name-col">
                <item-cell
                  :kind="row.kind"
                  :title="row.title"
                  :id="row.id"
                  :parent="row.parent"
                  :exerciseCount="row.exerciseCount"
                  :contentCount="row.contentCount"
                />
              </th>
              <td class="progress-col">
                <progress-cell :num="row.exerciseProgress" :isExercise="true"/>
              </td>
              <td class="progress-col">
                <progress-cell :num="row.contentProgress" :isExercise="false"/>
              </td>
              <td class="date-col">
                <elapsed-time :date="row.lastActive" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>

</template>


<script>

  const ReportConstants = require('../../reportConstants');
  const CoachConstants = require('../../constants');
  const reportGetters = require('../../state/getters/reports');

  module.exports = {
    $trNameSpace: 'reportPage',
    $trs: {
      'name': 'Name',
      'avg-exercise-progress': 'Avg. exercise progress',
      'avg-content-progress': 'Avg. resource progress',
      'last-activity': 'Last active',
      'all-learners': 'All learners ({0, number, integer})',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'breadcrumbs': require('./breadcrumbs'),
      'summary-section': require('./summary-section'),
      'header-cell': require('./header-cell'),
      'user-cell': require('./data-cells/user-cell'),
      'progress-cell': require('./data-cells/progress-cell'),
      'item-cell': require('./data-cells/item-cell'),
      'elapsed-time': require('../elapsed-time'),
    },
    computed: {
      ReportConstants() {
        return ReportConstants; // allow constants to be accessed inside templates
      },
      isSingleUser() {
        return this.pageState.userScope === ReportConstants.UserScopes.USER;
      },
      isSingleItem() {
        return this.pageState.contentScope === ReportConstants.ContentScopes.CONTENT;
      },
      contentBreadcrumbs() {
        const list = this.pageState.contentScopeSummary.ancestors.map((item, index) => {
          const breadcrumb = {
            title: item.title,
            vlink: {
              name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
              params: {
                classId: this.pageState.classId,
                channelId: this.pageState.channelId,
                topicId: item.id,
              },
            },
          };
          if (!index) {
            breadcrumb.vlink.name = CoachConstants.PageNames.TOPIC_CHANNEL_ROOT;
            delete breadcrumb.vlink.params.topicId;
          }
          return breadcrumb;
        });
        list.push({ title: this.pageState.contentScopeSummary.title });
        return list;
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        exerciseCount: reportGetters.exerciseCount,
        exerciseProgress: reportGetters.exerciseProgress,
        contentCount: reportGetters.contentCount,
        contentProgress: reportGetters.contentProgress,
        dataTable: reportGetters.dataTable,
        userCount: reportGetters.userCount,
        completionCount: reportGetters.completionCount,
        isRecentPage: reportGetters.isRecentPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './reports.styl'

  .data-table
    width: 100%
    font-size: smaller
    border-spacing: 0

    td, th
      padding: $col-padding
      text-align: left

    .table-name
      text-align: left

    .name-col
      text-align: left

    .progress-col
      text-align: center
      width: $progress-col-width

    .date-col
      text-align: left
      width: $date-col-width

  .item-move
    transition: transform 0.5s cubic-bezier(0.55, 0, 0.1, 1)

  .top-section,
  .table-section
    background-color: $core-bg-light
    margin-top: 1em
    margin-bottom: 1em
    padding: 1em

  .table-section
    overflow-x: scroll

</style>
