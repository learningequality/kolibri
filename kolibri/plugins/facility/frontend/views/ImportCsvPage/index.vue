<template>

  <ImmersivePage
    :route="$store.getters.facilityPageLinks.DataPage"
    :appBarTitle="$tr('toolbarHeader')"
  >
    <KPageContainer>
      <h1>{{ $tr('pageHeader') }}</h1>

      <Init
        v-if="status === CSVImportStatuses.NOT_STARTED"
        @cancel="done"
        @next="preview"
      />
      <Preview
        v-else-if="showPreviewState"
        @done="done"
      />
      <template v-else-if="showLoaderState">
        <div class="loader-wrapper"><KCircularLoader class="loader" /> {{ $tr('loading') }}</div>
      </template>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
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
      ImmersivePage,
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
        this.$router.push(this.$store.getters.facilityPageLinks.DataPage);
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
      toolbarHeader: {
        message: 'Import users from spreadsheet',
        context: "Heading for 'Import users' page.",
      },
      pageHeader: {
        message: 'Import users',
        context: "Title of the 'Import users' page where spreadsheets can be imported.",
      },
      loading: {
        message: 'Loading...',
        context:
          "Refers to when a CSV is being imported. During the import process this texts displays to indicate that it is 'loading' into Kolibri.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loader-wrapper {
    margin: 32px;
  }

  .loader {
    position: relative;
    top: 8px;
    display: inline-block;
    margin-right: 16px;
  }

</style>
