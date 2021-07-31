import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../constants';

const TaskSnackbarStrings = createTranslator('TaskSnackbarStrings', {
  taskStarted: {
    message: 'Task started…',
    context: 'Message displays when a task has started.',
  },
  taskFailed: {
    message: 'Task could not be started',
    context: 'Displays if a task action could not be started.',
  },
  taskFinished: {
    message: 'Task has finished',
    context: 'Message displays when a task has finished.',
  },
  viewTasksAction: {
    message: 'View tasks',
    context: 'Option to view the task manager.',
  },
  clearTaskAction: {
    message: 'Clear task',
    context: 'Action to clear a task from the list of tasks.',
  },
});

export default {
  data() {
    return {
      showSnackbarWhenTaskHasFinished: true,
    };
  },
  computed: {
    watchedTaskId() {
      return this.$store.state.manageContent.watchedTaskId;
    },
    watchedTaskHasFinished() {
      // Should switch between null and the taskIds, and can be watched
      // by component to trigger side effects when a task finishes.
      return this.$store.getters['manageContent/taskFinished'](this.watchedTaskId);
    },
  },
  watch: {
    watchedTaskHasFinished(val) {
      if (val && val === this.watchedTaskId) {
        if (this.showSnackbarWhenTaskHasFinished) {
          this.createTaskFinishedSnackbar();
        }
        // Host component must implement this method
        if (typeof this.onWatchedTaskFinished === 'function') {
          this.onWatchedTaskFinished();
        }
      }
    },
  },
  methods: {
    notifyAndWatchTask(taskResponse) {
      this.startWatchingTask(taskResponse);
      this.createTaskStartedSnackbar();
      this.$router.push({ name: PageNames.MANAGE_TASKS });
    },
    createTaskFailedSnackbar() {
      this.$store.dispatch('createSnackbar', TaskSnackbarStrings.$tr('taskFailed'));
    },
    createTaskFinishedSnackbar() {
      this.$store.commit('CORE_CREATE_SNACKBAR', {
        text: TaskSnackbarStrings.$tr('taskFinished'),
        autoDismiss: true,
      });
    },
    createTaskStartedSnackbar() {
      this.$store.commit('CORE_CREATE_SNACKBAR', {
        text: TaskSnackbarStrings.$tr('taskStarted'),
        autoDismiss: true,
      });
    },
    startWatchingTask(taskResponse) {
      if (Array.isArray(taskResponse.data)) {
        this.$store.commit('manageContent/SET_WATCHED_TASK_ID', taskResponse.data[0].id);
      } else {
        this.$store.commit('manageContent/SET_WATCHED_TASK_ID', taskResponse.data.id);
      }
    },
  },
};
