<template>

  <div>

    <template v-if="isFinal">
      <h2>Results</h2>
      <p>The following changes were made:</p>
    </template>
    <template v-else>
      <h2>Preview</h2>
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
          <td>6</td>
          <td>+123</td>
          <td>-5</td>
        </tr>
        <tr>
          <th>Classes</th>
          <td></td>
          <td>+3</td>
          <td>-1</td>
        </tr>
      </tbody>
    </table>


    <h2>Validation</h2>
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

</template>


<script>

  // example
  const logs = [
    { line: 43, message: "invalid username '....'" },
    { line: 255, message: 'another issue' },
  ];

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
        return logs.map(obj => `Line ${obj.line}: ${obj.message}`).join('\n');
      },
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
