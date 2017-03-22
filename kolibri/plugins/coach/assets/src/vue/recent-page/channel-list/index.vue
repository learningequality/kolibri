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
          <tr v-for="channel in channels">
            <!-- Content Name field -->
            <router-link :to="reportsForChannel(channel.id)">
              <td>
                {{channel.name}}
              </td>
            </router-link>
          </tr>
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
          name: PageNames.RECENT,
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
        classID: state => state.pageState.class_id,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
