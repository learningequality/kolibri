<template>

  <div class="class-roster">

    <div class="header">
      <h1>{{ $tr('header') }}</h1>
      <p id="description">{{$tr('pageDescription')}}</p>
    </div>

    <table class="roster" v-if="noProgressExist">

      <caption class="visuallyhidden">{{$tr('recentPage')}}</caption>

      <!-- Table Headers -->
      <thead>
        <tr>
          <th class="col-header" scope="col"> {{$tr('name')}} </th>
          <div class="status-group">
            <th class="col-header hide-on-mobile status-header" scope="col"> {{$tr('progress')}} </th>
          </div>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody>
        <tr v-for="content in attemptedContents">
          <!-- Content Name field -->
          <th scope="row" class="table-cell">
            <router-link :to="contentLearnersPageLink(content.id)" class="table-name">
              {{content.name}}
            </router-link>
          </th>

          <div class="status-group">
            <!-- Content Progress field -->
            <td class="table-cell hide-on-mobile status-body">
              {{content.progress}}
            </td>
          </div>
        </tr>
      </tbody>

    </table>

    <p v-else>{{ $tr('noRecentProgressExist') }}</p>

  </div>

</template>


<script>

  const Constants = require('../../state/constants');

  module.exports = {
    $trNameSpace: 'coachRecentPage',
    $trs: {
      recentPage: 'Recent Page',
      header: 'Recent Activity - ',
      pageDescription: 'Content your Learners have recently completed or mastered',
      name: 'Name',
      progress: 'Progress',
      noRecentProgressExist: 'No recent progress.'
    },
    computed: {
      noProgressExist() {
        return this.attemptedContents ? this.attemptedContents.length === 0 : false;
      },
    },
    methods: {
      contentLearnersPageLink(id) {
        return {
          name: Constants.PageNames.COACH_LEARNERS_PAGE,
          params: { class_id: id }, // WIP
        };
      },
    },
    vuex: {
      getters: {
        attemptedContents: state => state.pageState.attemptedContents,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

    $row-padding = 1.5em
  .status-group
    display: inline-table
    margin-left: 30px
    width: 100%
    text-align: center
  .status-header
    vertical-align: middle
  .status-body
    padding-top: 0.5em
  .create
    float: right
    margin-top: -48px
  input[type='search']
    position: relative
    top: 0
    left: 10px
    display: inline-block
    clear: both
    width: 85%
    height: 100%
    border-color: transparent
    background-color: transparent

    box-sizing: border-box
  .header h1
    display: inline-block
    margin-bottom: 0
  #description
    margin-bottom: 40px
  hr
    height: 1px
    border: none
    background-color: $core-text-annotation

  tr
    text-align: left
  .roster
    width: 100%
    word-break: break-all
  th
    text-align: inherit
  .col-header
    padding-bottom: (1.2 * $row-padding)
    width: 28%
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
  .table-cell
    padding-bottom: $row-padding
    color: $core-text-default
    font-weight: normal // compensates for <th> cells
  .delete-class-button
    float: right
    margin-right: 4px
    padding: 8px
    width: 110px
    color: red
    cursor: pointer
  .create-class-button
    width: 100%
  .table-name
    display: inline-block
    padding-right: 1em
    $line-height = 1em
    max-height: ($line-height * 2)
    font-weight: bold
    line-height: $line-height
  .role-header
    display: none
  @media print
    .class-roster
      width: 500px
  // TODO temporary fix until remove width calculation from learn
  @media screen and (max-width: 840px)
    .create
      box-sizing: border-box
      width: 49%
    .create
      margin-top: -78px
    .hide-on-mobile
      display: none
    .table-name
      overflow: hidden
      width: 100px
      text-overflow: ellipsis
      white-space: nowrap
    .col-header
      width: 50%

</style>
