<template>

  <ImmersivePage
    :appBarTitle="$tr('appBarTitle')"
    :route="backRoute"
  >
    <KPageContainer class="device-container">
      <KGrid>
        <KGridItem
          :layout8="{ span: 5 }"
          :layout12="{ span: 8 }"
        >
          <h1>
            {{ $tr('tasksHeader') }}
          </h1>
        </KGridItem>
        <KGridItem
          :layout8="{ span: 3, alignment: 'right' }"
          :layout12="{ span: 4, alignment: 'right' }"
        >
          <KButton
            v-if="showClearCompletedButton"
            :text="$tr('clearCompletedAction')"
            :class="{ 'button-offset': windowIsLarge }"
            @click="handleClickClearAll"
          />
        </KGridItem>
      </KGrid>

      <KLinearLoader
        v-if="loading"
        :delay="false"
        type="indeterminate"
      />

      <p
        v-if="!loading && managedTasks.length === 0"
        class="empty-tasks-message"
      >
        {{ deviceString('emptyTasksMessage') }}
      </p>
      <transition-group
        name="fade"
        class="task-panels"
      >
        <TaskPanel
          v-for="task in sortedTaskList"
          :key="task.id"
          :task="task"
          class="task-panel"
          :appBarTitle="$tr('appBarTitle')"
          :style="{ borderBottomColor: $themePalette.grey.v_300 }"
          @clickclear="handleClickClear(task)"
          @clickcancel="handleClickCancel(task)"
          @update-title="updateAppBarTitle"
        />
      </transition-group>
      <BottomAppBar v-if="immersivePage">
        <KButton
          :text="coreString('continueAction')"
          appearance="raised-button"
          :primary="true"
          @click="handleRedirectToImportPage()"
        />
      </BottomAppBar>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import some from 'lodash/some';
  import { mapGetters } from 'vuex';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonDeviceStrings from '../commonDeviceStrings';
  import useContentTasks from '../../composables/useContentTasks';
  import { PageNames } from '../../constants';

  import TaskPanel from './TaskPanel';

  // A page to view content import/export/deletion tasks
  export default {
    name: 'ManageTasksPage',
    metaInfo() {
      return {
        title: this.pageTitle,
      };
    },
    components: {
      TaskPanel,
      BottomAppBar,
      ImmersivePage,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    setup() {
      useContentTasks();
      const { windowIsLarge } = useKResponsiveWindow();
      return {
        windowIsLarge,
      };
    },
    data() {
      return {
        loading: true,
        pageTitle: this.$tr('appBarTitle'),
      };
    },
    computed: {
      ...mapGetters('manageContent', ['managedTasks']),
      backRoute() {
        return { name: PageNames.MANAGE_CONTENT_PAGE };
      },
      sortedTaskList() {
        const sorterArray = this.managedTasks;
        sorterArray.sort((a, b) => {
          const dateA = new Date(a.scheduled_datetime);
          const dateB = new Date(b.scheduled_datetime);

          if (dateA === dateB) return 0;

          return dateA > dateB ? 1 : -1;
        });
        return sorterArray;
      },
      showClearCompletedButton() {
        return some(this.managedTasks, task => task.clearable);
      },
      immersivePage() {
        return this.$route.query && this.$route.query.last;
      },
    },
    watch: {
      managedTasks: {
        handler: 'updateManagedTasks',
        deep: true,
      },
    },
    mounted() {
      // Wait some time for first poll from Tasks API
      if (this.managedTasks.length === 0) {
        setTimeout(() => {
          this.loading = false;
        }, 2000);
      }
    },
    methods: {
      formattedPercentage(val) {
        return this.$formatNumber(val, { style: 'percent' });
      },
      formattedNumber(val) {
        return this.$formatNumber(val);
      },

      updateManagedTasks(val) {
        if (val.length > 0) {
          this.loading = false;
        }
        // Additional logic or updates related to managedTasks
        this.updateAppBarTitle();
      },
      updateAppBarTitle() {
        const inProgressTasks = this.managedTasks.filter(task => task.status === 'RUNNING');
        const failedTasks = this.managedTasks.filter(task => task.status === 'FAILED');
        const canceledTasks = this.managedTasks.filter(task => task.status === 'CANCELED');
        const totalTasks = this.managedTasks.length;
        const completedTasks = this.managedTasks.filter(task => task.status === 'COMPLETED');

        if (failedTasks.length === 1) {
          this.pageTitle = `${this.deviceString('statusFailed')} - ${
            failedTasks[0].extra_metadata.channel_name
          } `;
        } else if (failedTasks.length > 1) {
          this.pageTitle = `${this.formattedNumber(failedTasks.length)} - ${this.deviceString(
            'statusFailed',
          )}`;
        } else if (totalTasks === 1 && inProgressTasks.length === 1) {
          const inProgressTask = inProgressTasks[0];
          this.pageTitle = `${this.formattedPercentage(inProgressTask.percentage)} - ${
            inProgressTask.extra_metadata.channel_name
          } `;
        } else if (totalTasks > 1 && inProgressTasks.length >= 1) {
          const averageProgress =
            inProgressTasks.reduce((sum, task) => sum + task.percentage, 0) /
            inProgressTasks.length;
          if (averageProgress === 1) {
            this.pageTitle = this.deviceString('statusComplete');
          } else {
            this.pageTitle = `${this.formattedPercentage(averageProgress)} - ${this.deviceString(
              'statusInProgress',
            )}`;
          }
        } else if (totalTasks > 0 && completedTasks.length === totalTasks) {
          this.pageTitle = this.deviceString('statusComplete');
        } else if (canceledTasks.length > 0) {
          this.pageTitle = this.deviceString('statusCanceled');
        } else {
          this.pageTitle = this.$tr('appBarTitle');
        }
      },
      handleClickClear(task) {
        TaskResource.clear(task.id).catch(() => {
          // error silently
        });
      },
      handleClickCancel(task) {
        TaskResource.cancel(task.id);
      },
      handleClickClearAll() {
        TaskResource.clearAll();
      },
      handleRedirectToImportPage() {
        this.$router.push(
          this.$router.getRoute(this.$route.query.last, {
            channel_id: this.$route.query.channel_id,
          }),
        );
      },
    },
    $trs: {
      tasksHeader: {
        message: 'Tasks',
        context: 'Heading in the task manager section.',
      },
      clearCompletedAction: {
        message: 'Clear completed',
        context:
          'Button on the task manager page. When pressed it will clear all the completed tasks from the list.',
      },
      appBarTitle: {
        message: 'Task manager',
        context: 'Title of the page that displays all the tasks in the task manager. ',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .button-offset {
    margin-top: 24px;
  }

  .task-panels {
    margin-top: 32px;
  }

  .task-panel {
    border-bottom: 1px solid;

    &:last-of-type {
      border-bottom-style: none;
    }
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s;
  }

</style>
