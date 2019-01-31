<template>

  <div class="overview">
    <table>
      <tr style="color: gray">
        <th>scenario</th>
        <th>example tally</th>
        <th>status bar</th>
        <th>verbosity</th>
        <th>ratio variant</th>
        <th>count variant</th>
      </tr>
      <tbody v-for="(tally, index) in testSummaries" :key="index" style="border: 2px solid gray">
        <tr>
          <th rowspan="2" style="max-width: 100px; text-align: left;">
            {{ tally.name }}
          </th>
          <td rowspan="2">
            <table>
              <tr><td>not started</td><td> {{ tally.notStarted }}</td></tr>
              <tr><td>started</td><td> {{ tally.started }}</td></tr>
              <tr><td>completed</td><td> {{ tally.completed }}</td></tr>
              <tr><td>help needed</td><td> {{ tally.helpNeeded }}</td></tr>
            </table>
          </td>
          <td rowspan="2" style="width: 200px; text-align: center; position: relative;">
            <div class="bar">
              <ProgressSummaryBar
                :started="tally.started + tally.helpNeeded"
                :completed="tally.completed"
                :total="tally.completed + tally.started + tally.notStarted + tally.helpNeeded"
              />
            </div>
          </td>
          <td style="text-align: center">long</td>
          <td>
            <StatusSummary :tallyObject="tally" :verbose="true" :ratio="true" />
          </td>
          <td>
            <StatusSummary :tallyObject="tally" :verbose="true" :ratio="false" />
          </td>
        </tr>
        <tr>
          <td style="text-align: center">short</td>
          <td>
            <StatusSummary :tallyObject="tally" :verbose="false" :ratio="true" />
          </td>
          <td>
            <StatusSummary :tallyObject="tally" :verbose="false" :ratio="false" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import commonCoach from '../../common';
  import ProgressSummaryBar from '../../common/status/ProgressSummaryBar';
  import StatusSummary from '../../common/status/StatusSummary';

  export default {
    name: 'StatusTestPage',
    components: {
      StatusSummary,
      ProgressSummaryBar,
    },
    mixins: [commonCoach],
    data() {
      return {
        testSummaries: [
          {
            name: 'all started',
            started: 12,
            notStarted: 0,
            completed: 0,
            helpNeeded: 0,
          },
          {
            name: 'none started',
            started: 0,
            notStarted: 12,
            completed: 0,
            helpNeeded: 0,
          },
          {
            name: 'all completed',
            started: 0,
            notStarted: 0,
            completed: 12,
            helpNeeded: 0,
          },
          {
            name: 'all need help',
            started: 0,
            notStarted: 0,
            completed: 0,
            helpNeeded: 12,
          },
          {
            name: 'some started',
            started: 6,
            notStarted: 6,
            completed: 0,
            helpNeeded: 0,
          },
          {
            name: 'some completed',
            started: 0,
            notStarted: 6,
            completed: 6,
            helpNeeded: 0,
          },
          {
            name: 'some completed, others need help',
            started: 0,
            notStarted: 0,
            completed: 6,
            helpNeeded: 6,
          },
          {
            name: 'all started, some need help',
            started: 6,
            notStarted: 0,
            completed: 0,
            helpNeeded: 6,
          },
          {
            name: 'some completed, some started',
            started: 4,
            notStarted: 4,
            completed: 4,
            helpNeeded: 0,
          },
          {
            name: 'some completed, some need help',
            started: 0,
            notStarted: 4,
            completed: 4,
            helpNeeded: 4,
          },
          {
            name: 'some started, some need help',
            started: 4,
            notStarted: 4,
            completed: 0,
            helpNeeded: 4,
          },
          {
            name: 'some completed, some started, others need help',
            started: 4,
            notStarted: 0,
            completed: 4,
            helpNeeded: 4,
          },
          {
            name: 'some completed, some started, some need help',
            started: 3,
            notStarted: 3,
            completed: 3,
            helpNeeded: 3,
          },
        ],
      };
    },
  };

</script>


<style lang="scss" scoped>

  .overview {
    padding: 30px;
    margin: 30px;
    background-color: white;
  }

  .bar {
    display: inline-block;
    width: 150px;
    height: 16px;
    margin: auto;
  }

  td,
  tbody th {
    padding: 4px;
    padding-right: 8px;
    padding-left: 8px;
    font-weight: normal;
    border: 1px solid #c8c8c8;
  }

  table table td,
  table table tr {
    border: 0;
  }

</style>
