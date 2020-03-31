<template>

  <!-- eslint-disable max-len -->
  <KModal
    :title="$tr('csvDetails')"
    :submitText="$tr('close')"
    size="large"
    @cancel="closeModal"
    @submit="closeModal"
  >
    <p>A CSV spreadsheet should use the first row as a header. It must contain the following columns in any order:</p>

    <table>
      <tbody>
        <tr>
          <th>
            Username
          </th>
          <td>Required</td>
          <td>Less than 125 chars and only can contain characters, numbers and underscores</td>
        </tr>
        <tr>
          <th>
            Password
          </th>
          <td>If it's not provided the system will set it to 'kolibri'</td>
          <td>At most 128 chars</td>
        </tr>
        <tr>
          <th>
            Full name
          </th>
          <td>Required</td>
          <td>At most 125 chars</td>
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
              <li><code>COACH</code></li>
              <li><code>ASSIGNABLE_COACH</code></li>
              <li><code>LEARNER</code></li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            Identifier
          </th>
          <td>Optional</td>
          <td>At most 64 chars. Examples: student ID number or email address</td>
        </tr>
        <tr>
          <th>
            Birth year
          </th>
          <td>Optional</td>
          <td>A four-digit number (greater than 1900)</td>
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
