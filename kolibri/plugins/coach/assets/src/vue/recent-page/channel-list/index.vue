<template>

  <div class="class-roster">
      <caption class="visuallyhidden">{{$tr('channelList')}}</caption>

      <table>
      <!-- Table Headers -->
      <thead>
        <tr>
          <th class="col-header" scope="col"> test </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody>
        <tr>
          <!-- Content Name field -->
          <th scope="row" class="table-cell">
          </th>
        </tr>
      </tbody>

    </table>

  </div>

</template>


<script>

  // const Constants = require('../../state/constants');

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'coachRecentPage',
    $trs: {
      channelList: 'Channel List',
    },
    methods: {
    },
    vuex: {
      getters: {
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

    $row-padding = 1.5em
  .status-group
    display: inline-table
    width: 100%
    text-align: center
    margin-left: 30px
  .status-header
    vertical-align: middle
  .status-body
    padding-top: 0.5em
  .create
    float: right
    margin-top: -48px
  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both
  .header h1
    display: inline-block
    margin-bottom: 0
  #description
    margin-bottom: 40px
  hr
    background-color: $core-text-annotation
    height: 1px
    border: none
  tr
    text-align: left
  .roster
    width: 100%
    word-break: break-all
  th
    text-align: inherit
  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
    width: 28%
  .table-cell
    font-weight: normal // compensates for <th> cells
    padding-bottom: $row-padding
    color: $core-text-default
  .delete-class-button
    color: red
    width: 110px
    padding: 8px
    cursor: pointer
    margin-right: 4px
    float: right
  .create-class-button
    width: 100%
  .table-name
    $line-height = 1em
    line-height: $line-height
    max-height: ($line-height * 2)
    display: inline-block
    padding-right: 1em
    font-weight: bold
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
      text-overflow: ellipsis
      white-space: nowrap
      width: 100px
    .col-header
      width: 50%

</style>
