<template>

  <ImmersivePage
    :appBarTitle="pageTitleStrings.appBarTitle$()"
    :route="backRoute"
    :loading="pageLoading"
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
          :style="{ borderBottomColor: 'var(--palette-grey-v300)' }"
          @clickclear="handleClickClear(task)"
          @clickcancel="handleClickCancel(task)"
          @restart="restartTask(task)"
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

  import { computed, ref, watch } from 'vue';
  import some from 'lodash/some';
  import { mapGetters } from 'vuex';
  import { createTranslator } from 'kolibri/utils/i18n';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import commonDeviceStrings, { deviceStrings } from '../commonDeviceStrings';
  import useContentTasks from '../../composables/useContentTasks';
  import { PageNames } from '../../constants';
  import store from '../../store';

  import TaskPanel from './TaskPanel';

  export const pageTitleStrings = createTranslator('ManageTasksPage', {
    appBarTitle: {
      message: 'Task manager',
      context: 'Title of the page that displays all the tasks in the task manager. ',
    },
  });

  // A page to view content import/export/deletion tasks
  export default {
    name: 'ManageTasksPage',
    components: {
      TaskPanel,
      BottomAppBar,
      ImmersivePage,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    setup() {
      useContentTasks();
      const { windowIsLarge } = useKResponsiveWindow();

      // Title tracks tasks only after the task list first changes, which keeps
      // the vue-meta title's behaviour (#15396)
      const tasksChanged = ref(false);
      watch(
        () => store.getters['manageContent/managedTasks'],
        () => {
          tasksChanged.value = true;
        },
        { deep: true },
      );

      const pageTitle = computed(() => {
        if (!tasksChanged.value) {
          return pageTitleStrings.appBarTitle$();
        }
        const managedTasks = store.getters['manageContent/managedTasks'];
        const inProgressTasks = managedTasks.filter(task => task.status === 'RUNNING');
        const failedTasks = managedTasks.filter(task => task.status === 'FAILED');
        const canceledTasks = managedTasks.filter(task => task.status === 'CANCELED');
        const totalTasks = managedTasks.length;
        const completedTasks = managedTasks.filter(task => task.status === 'COMPLETED');

        if (failedTasks.length === 1) {
          return [deviceStrings.statusFailed$(), failedTasks[0].extra_metadata.channel_name];
        } else if (failedTasks.length > 1) {
          return [coreStrings.$formatNumber(failedTasks.length), deviceStrings.statusFailed$()];
        } else if (totalTasks === 1 && inProgressTasks.length === 1) {
          const inProgressTask = inProgressTasks[0];
          return [
            coreStrings.$formatNumber(inProgressTask.percentage, { style: 'percent' }),
            inProgressTask.extra_metadata.channel_name,
          ];
        } else if (totalTasks > 1 && inProgressTasks.length >= 1) {
          const averageProgress =
            inProgressTasks.reduce((sum, task) => sum + task.percentage, 0) /
            inProgressTasks.length;
          if (averageProgress === 1) {
            return deviceStrings.statusComplete$();
          }
          return [
            coreStrings.$formatNumber(averageProgress, { style: 'percent' }),
            deviceStrings.statusInProgress$(),
          ];
        } else if (totalTasks > 0 && completedTasks.length === totalTasks) {
          return deviceStrings.statusComplete$();
        } else if (canceledTasks.length > 0) {
          return deviceStrings.statusCanceled$();
        }
        return pageTitleStrings.appBarTitle$();
      });
      usePageTitle(pageTitle, { hasVisibleHeading: true });

      return {
        windowIsLarge,
        pageLoading,
        pageTitleStrings,
      };
    },
    data() {
      return {
        loading: true,
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
      updateManagedTasks(val) {
        if (val.length > 0) {
          this.loading = false;
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
      restartTask(task) {
        TaskResource.restart(task.id);
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
