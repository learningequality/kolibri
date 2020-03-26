<template>

  <KPageContainer>

    <h1>{{ $tr('pageHeader') }}</h1>

    <Init
      v-if="status === CSVImportStatuses.NOT_STARTED"
      @cancel="done"
      @next="preview"
    />
    <Preview
      v-else-if="showPreviewState"
      @cancel="done"
    />
    <template v-else-if="showLoaderState">
      <KCircularLoader style="margin: 32px" />
    </template>

  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { CSVImportStatuses } from '../../constants';
  import Init from './Init';
  import Preview from './Preview';

  export default {
    name: 'ImportCsvPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader'),
      };
    },
    components: {
      Init,
      Preview,
    },
    computed: {
      ...mapState('importCSV', ['status']),
      CSVImportStatuses: () => CSVImportStatuses,
      showPreviewState() {
        return [
          CSVImportStatuses.VALIDATED,
          CSVImportStatuses.ERRORS,
          CSVImportStatuses.FINISHED,
        ].includes(this.status);
      },
      showLoaderState() {
        return [CSVImportStatuses.VALIDATING, CSVImportStatuses.SAVING].includes(this.status);
      },
    },
    watch: {
      pollForTasks(val) {
        return val ? this.startTaskPolling() : this.stopTaskPolling();
      },
    },
    mounted() {
      this.$store.commit('importCSV/RESET_STATE');
      this.refreshTaskList();
      this.startTaskPolling();
    },
    destroyed() {
      this.stopTaskPolling();
    },
    methods: {
      ...mapActions('importCSV', ['startValidating', 'refreshTaskList']),
      preview(file, deleteUsers) {
        this.startValidating({ deleteUsers: deleteUsers, file: file });
      },
      done() {
        this.$router.push(this.$router.getRoute('DATA_PAGE'));
      },
      startTaskPolling() {
        if (!this.intervalId) {
          this.intervalId = setInterval(this.refreshTaskList, 1000);
        }
      },
      stopTaskPolling() {
        if (this.intervalId) {
          this.intervalId = clearInterval(this.intervalId);
        }
      },
    },
    $trs: {
      pageHeader: 'Import users',
    },
  };

</script>


<style lang="scss" scoped>

  .caution {
    font-weight: bold;
    color: red;
  }

</style>
