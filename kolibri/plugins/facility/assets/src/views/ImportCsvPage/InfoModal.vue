<template>

  <!-- eslint-disable max-len -->
  <KModal
    :title="$tr('csvDetails')"
    :submitText="$tr('close')"
    size="large"
    @cancel="closeModal"
    @submit="closeModal"
  >
    <p>A CSV spreadsheet should use the first row as a header. It must contain the following columns in order:</p>

    <table>
      <tbody>
        <tr>
          <th>
            Username
          </th>
          <td>Required</td>
          <td>Less than X chars and only these things</td>
        </tr>
        <tr>
          <th>
            Password
          </th>
          <td>Required</td>
          <td>At most N chars</td>
        </tr>
        <tr>
          <th>
            Full name
          </th>
          <td>Required</td>
          <td>At most N chars</td>
        </tr>
        <tr>
          <th>
            User type
          </th>
          <td>Required</td>
          <td>
            <div>Possible values:</div>
            <ul>
              <li><code>ADMIN</code></li>
              <li><code>FACILITY_COACH</code></li>
              <li><code>CLASS_COACH</code></li>
              <li><code>LEARNER</code></li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            Identifier
          </th>
          <td>Optional</td>
          <td>Examples: student ID number or email address. At most N chars</td>
        </tr>
        <tr>
          <th>
            Birth year
          </th>
          <td>Optional</td>
          <td>A four-digit number</td>
        </tr>
        <tr>
          <th>
            Gender
          </th>
          <td>Optional</td>
          <td>
            <div>Possible values:</div>
            <ul>
              <li><code>MALE</code></li>
              <li><code>FEMALE</code></li>
              <li><code>NOT_SPECIFIED</code></li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            Enrolled in
          </th>
          <td>Optional</td>
          <td>List of class names, separated by commas</td>
        </tr>
        <tr>
          <th>
            Assigned to
          </th>
          <td>Optional</td>
          <td>List of class names, separated by commas</td>
        </tr>

      </tbody>
    </table>
  </KModal>
  <!-- eslint-enable max-len -->

</template>


<script>

  export default {
    name: 'InfoModal',
    components: {},
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      csvDetails: 'CSV details',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  td,
  th {
    padding: 12px 8px;
    line-height: 1.5em;
    text-align: left;
    vertical-align: top;
  }

</style>
