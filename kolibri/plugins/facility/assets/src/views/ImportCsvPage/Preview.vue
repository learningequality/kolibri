<template>

  <!-- eslint-disable max-len -->
  <div>

    <template v-if="isFinal">
      <h2 style="color: green;">
        SUCCESS!
      </h2>
      <p>The following changes were made:</p>
    </template>
    <template v-else>
      <p>Changes if you choose to import:</p>
    </template>

    <table class="indent">
      <thead>
        <tr>
          <th></th>
          <th>Updated</th>
          <th>Added</th>
          <th>Deleted</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Users</th>
          <td>{{ users_report.updated }}</td>
          <td style="color: green;">
            {{ users_report.created }}
          </td>
          <td style="color: red;">
            {{ users_report.deleted }}
          </td>
        </tr>
        <tr>
          <th>Classes</th>
          <td>{{ classes_report.updated }}</td>
          <td style="color: green;">
            {{ classes_report.created }}
          </td>
          <td style="color: red;">
            {{ classes_report.cleared }}
          </td>
        </tr>
      </tbody>
    </table>

    <template v-if="isFinal">
      <p>We enountered the following issues... (whole file, specific rows, validation...). These items were skipped:</p>
    </template>
    <template v-else>
      <p>We enountered the following issues... (whole file, specific rows, validation...). These items will be skipped if you continue:</p>
    </template>


    <pre class="logs indent">{{ logs }}</pre>

    <p v-if="isFinal">
      <KButton
        text="Finish"
        appearance="raised-button"
        primary
        @click="$emit('next')"
      />
    </p>
    <p v-else>
      <KButton
        text="Cancel"
        appearance="raised-button"
        style="margin-left: 0;"
        @click="$emit('cancel')"
      />
      <KButton
        text="Continue"
        appearance="raised-button"
        primary
        @click="$emit('next')"
      />
    </p>

  </div>
  <!-- eslint-enable max-len -->

</template>


<script>

  import { mapState } from 'vuex';
  // if whole CSV cannot be parsed, wrong number of cols, etc
  // const overall_error = {};

  export default {
    name: 'Preview',
    props: {
      isFinal: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      logs() {
        return this.per_line_errors
          .map(
            obj => `Line ${obj.row}: ${obj.message} in field ${obj.field} for value "${obj.value}"`
          )
          .join('\n');
      },
      ...mapState('importCSV', [
        // 'overall_error',
        'per_line_errors',
        'classes_report',
        'users_report',
      ]),
    },
  };

</script>


<style lang="scss" scoped>

  td,
  th {
    padding: 4px;
    text-align: right;
  }

  .logs {
    font-size: smaller;
  }

  .indent {
    margin-left: 16px;
  }

</style>
