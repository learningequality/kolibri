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
      timePassed: '{amount, number} {measure, select, day { {amount, plural, one {day} other {days} } } month { {amount, plural, one {month} other {months} } } } ago',
    },
    computed: {
      channelList() {
        return this.channels.sort(
          (channel1, channel2) => {
            const lastActiveRaw = (channel) => this.lastActive[channel.id].raw;

            return lastActiveRaw(channel1) - lastActiveRaw(channel2);
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
        function timePassedSince(lastActiveTime) {
          // helper function for __getChannelLastActive
          // @param lastActiveTime --  date in string format
          // @returns object representing time passed since input in days or months:
          // {
          //   amount: 'int',
          //   measure: 'month or day',
          // }
          const dayMeasure = (ms) => Math.round(ms / (8.64e+7));
          const monthMeasure = (ms) => Math.round(ms / (2.628e+9));

          const currentDate = new Date();
          const lastActiveDate = new Date(lastActiveTime);
          // subtracting dates returns time interval in milliseconds
          const millisecondsEllapsed = currentDate - lastActiveDate;

          const monthsAgo = monthMeasure(millisecondsEllapsed);
          // returns months amount of days has surpassed a month
          if (monthsAgo) {
            return {
              amount: monthsAgo,
              measure: 'month',
              raw: millisecondsEllapsed,
            };
          }
          // and days otherwise
          return {
            amount: dayMeasure(millisecondsEllapsed),
            measure: 'day',
            raw: millisecondsEllapsed,
          };
        }

        const trArgs = timePassedSince(this.lastActive[channel.id]);
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
