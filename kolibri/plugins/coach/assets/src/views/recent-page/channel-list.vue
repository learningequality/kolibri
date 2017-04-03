<template>

  <div>
    <caption class="visuallyhidden">{{ $tr('channelList') }}</caption>
    <table class="channel-list">
      <thead>
        <tr>
          <th scope="col">{{ $tr('channels') }}</th>
          <th scope="col">{{ $tr('lastActive') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="channel in channelList">
          <td>
            <mat-svg category="action" name="view_module" />
            <router-link :to="reportLink(channel.id)">{{ channel.title }}</router-link>
          </td>
          <td>
            {{ lastActiveText(channel) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'coachRecentPageChannelList',
    $trs: {
      channels: 'Channels',
      channelList: 'Channel list',
      lastActive: 'Last active',
      daysPassed: 'X day(s) ago',
      monthsPassed: 'X month(s) ago',
      timePassed:
      '{amount, number} {measure, select, ' +
        'day {' +
          '{amount, plural,' +
            'one {day}' +
            'other {days}' +
          '}' +
        '}' +
        'month {' +
          '{amount, plural,' +
            'one {month}' +
            'other {months}' +
          '}' +
        '}' +
      '} ago',
    },
    computed: {
      channelList() {
        return this.channels.sort(
          (channel1, channel2) => {
            const lastActiveRaw = (channel) => this.lastActive[channel.id].raw;

            if (lastActiveRaw(channel1) < lastActiveRaw(channel2)) {
              return -1;
            } else if (lastActiveRaw(channel1) > lastActiveRaw(channel2)) {
              return 1;
            }
            return 0;
          }
        );
      },
    },
    methods: {
      reportLink(channelId) {
        return {
          name: PageNames.RECENT,
          params: {
            class_id: this.classId,
            channel_id: channelId,
          },
        };
      },
      lastActiveText(channel) {
        const trArgs = this.lastActive[channel.id];
        return this.$tr('timePassed', trArgs);
      },
    },
    vuex: {
      getters: {
        channels: state => state.core.channels.list,
        lastActive: state => state.pageState.lastActive,
        classId: state => state.pageState.classId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .channel-list
    width:100%

    th
      text-align: left

</style>
