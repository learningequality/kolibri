<template>

  <div>

    <breadcrumbs :list="contentBreadcrumbs"/>
    <h1>
      <content-icon
        :kind="pageState.contentScopeSummary.kind"
        colorstyle="text-default"
      />
      {{ pageState.contentScopeSummary.title }}
    </h1>
    <div>
      <ul>
        <li>{{ $tr('exerciseCountText', {count: exerciseCount}) }}</li>
        <li>{{ $tr('contentCountText', {count: contentCount}) }}</li>
      </ul>
    </div>

    <div class="table-section">
      <table class="data-table">
        <thead>
          <tr>
            <th is="header-cell"
              :text="$tr('name')"
              class="name-col coach-filter table-name"
            ></th>
            <th is="header-cell"
              :text="$tr('avgExerciseProgress')"
              class="progress-col coach-filter"
            ></th>
            <th is="header-cell"
              :text="$tr('avgContentProgress')"
              class="progress-col coach-filter"
            ></th>
            <th is="header-cell"
              :text="$tr('lastActivity')"
              class="date-col coach-filter"
            ></th>
          </tr>
        </thead>
        <tbody is="transition-group" name="item">
          <tr v-for="row in standardDataTable" :key="row.id">
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

</template>


<script>

  const CoachConstants = require('../../constants');
  const reportGetters = require('../../state/getters/reports');

  module.exports = {
    $trNameSpace: 'reportPage',
    $trs: {
      name: 'Name',
      avgExerciseProgress: 'Avg. exercise progress',
      avgContentProgress: 'Avg. resource progress',
      lastActivity: 'Last activity',
      exerciseCountText: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contentCountText: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'breadcrumbs': require('./breadcrumbs'),
      'header-cell': require('./header-cell'),
      'progress-cell': require('./data-cells/progress-cell'),
      'item-cell': require('./data-cells/item-cell'),
      'elapsed-time': require('kolibri.coreVue.components.elapsedTime'),
    },
    computed: {
      contentBreadcrumbs() {
        return [
          // link to the root channels page
          {
            title: 'Channels',
            vlink: {
              name: CoachConstants.PageNames.TOPIC_CHANNELS,
              params: {
                classId: this.pageState.classId,
              },
            },
          },
          // links to each ancestor
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { title: item.title };
            if (index) {
              // links to parent topics
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.pageState.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_CHANNEL_ROOT,
                params: {
                  classId: this.pageState.classId,
                  channelId: this.pageState.channelId,
                },
              };
            }
            return breadcrumb;
          }),
          // current item
          { title: this.pageState.contentScopeSummary.title }
        ];
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        exerciseCount: reportGetters.exerciseCount,
        contentCount: reportGetters.contentCount,
        standardDataTable: reportGetters.standardDataTable,
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

  .table-section
    background-color: $core-bg-light
    margin-top: 1em
    margin-bottom: 1em
    padding: 1em

  .table-section
    overflow-x: auto

</style>
