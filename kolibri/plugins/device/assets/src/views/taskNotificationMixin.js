import { createTranslator } from 'kolibri/utils/i18n';
import useSnackbar from 'kolibri/composables/useSnackbar';
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

const { createSnackbar } = useSnackbar();

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
    notifyAndWatchTask(taskData) {
      this.startWatchingTask(taskData);
      this.createTaskStartedSnackbar();
      this.$router.push({ name: PageNames.MANAGE_TASKS });
    },
    createTaskFailedSnackbar() {
      createSnackbar(TaskSnackbarStrings.$tr('taskFailed'));
    },
    createTaskFinishedSnackbar() {
      createSnackbar({
        text: TaskSnackbarStrings.$tr('taskFinished'),
        autoDismiss: true,
      });
    },
    createTaskStartedSnackbar() {
      createSnackbar({
        text: TaskSnackbarStrings.$tr('taskStarted'),
        autoDismiss: true,
      });
    },
    startWatchingTask(taskData) {
      if (Array.isArray(taskData)) {
        this.$store.commit('manageContent/SET_WATCHED_TASK_ID', taskData[0].id);
      } else {
        this.$store.commit('manageContent/SET_WATCHED_TASK_ID', taskData.id);
      }
    },
  },
};
