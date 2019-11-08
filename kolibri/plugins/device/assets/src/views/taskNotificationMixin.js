import pick from 'lodash/pick';
import { createTranslator } from 'kolibri.utils.i18n';
import { TaskResource } from 'kolibri.resources';

const TaskSnackbarStrings = createTranslator('TaskSnackbarStrings', {
  taskStarted: 'Task started…',
  taskFailed: 'Task could not be started',
  taskFinished: 'Task has finished',
  viewTasksAction: 'View tasks',
  clearTaskAction: 'Clear task',
});

export default {
  data() {
    return {
      watchedTaskId: null,
    };
  },
  computed: {
    watchedTaskHasFinished() {
      // Should switch between null and the taskIds, and can be watched
      // by component to trigger side effects when a task finishes.
      return this.$store.getters['manageContent/taskFinished'](this.watchedTaskId);
    },
  },
  watch: {
    watchedTaskHasFinished(val) {
      if (val && val === this.watchedTaskId) {
        this.createTaskFinishedSnackbar(val);
      }
    },
  },
  methods: {
    createTaskFailedSnackbar() {
      this.$store.dispatch('createSnackbar', TaskSnackbarStrings.$tr('taskFailed'));
    },
    createTaskFinishedSnackbar(taskId) {
      this.$store.commit('CORE_CREATE_SNACKBAR', {
        text: TaskSnackbarStrings.$tr('taskFinished'),
        autoDismiss: true,
        duration: 10000,
        actionText: TaskSnackbarStrings.$tr('clearTaskAction'),
        actionCallback() {
          return TaskResource.clearTask(taskId);
        },
      });
    },
    createTaskStartedSnackbar() {
      const actionCallback = function() {
        return this.$router.push(
          {
            name: 'MANAGE_TASKS',
            params: {
              lastRoute: pick(this.$router.currentRoute, ['name', 'params', 'query']),
            },
          },
          () => {
            this.$store.commit('CORE_CLEAR_SNACKBAR');
          }
        );
      }.bind(this);

      this.$store.commit('CORE_CREATE_SNACKBAR', {
        text: TaskSnackbarStrings.$tr('taskStarted'),
        autoDismiss: true,
        duration: 10000,
        actionText: TaskSnackbarStrings.$tr('viewTasksAction'),
        actionCallback,
      });
    },
    startWatchingTask(task) {
      this.watchedTaskId = task.entity.id;
    },
  },
};
