<template>

  <div class="class-roster">
      <caption class="visuallyhidden">{{$tr('channelList')}}</caption>

      <table>
      <!-- Table Headers -->
      <thead>
        <tr>
          <th class="col-header" scope="col">
            Channels
          </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody>
        <template v-for="channel in channels">
          <router-link :to="reportsForChannel(channel.id)">
            <tr>
              <!-- Content Name field -->
              <td scope="row" class="table-cell">
                {{channel.name}}
              </td>
            </tr>
          </router-link>
        </template>
      </tbody>

    </table>

  </div>

</template>


<script>

  const PageNames = require('../../../state/constants').PageNames;

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'coachRecentPage',
    $trs: {
      channelList: 'Channel List',
    },
    methods: {
      reportsForChannel(channelID) {
        return {
          name: PageNames.COACH_RECENT_PAGE,
          params: {
            classID: this.classID,
            channelID,
          },
        };
      },
    },
    vuex: {
      getters: {
        channels: state => state.pageState.channels,
        classID: state => state.pageState.classID,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
