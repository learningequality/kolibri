import { computed } from 'vue';
import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useSnackbar from 'kolibri/composables/useSnackbar';

/**
 *
 * @param {Object} options
 * @param {() => Promise<boolean>} options.action - Callback that executes the action to perform.
 * Should return a boolean promise indicating whether the action was successful. If the action
 * succeeds, the snackbar will display a success message and provide an undo option.
 *
 * @param {() => string} options.actionNotice$ - Function that returns the message to display on
 * the snackbar when the action is successful.
 *
 * @param {() => Promise<void>} options.undoAction - Callback that executes the undo action.
 * Be careful if this action is happening after the component that triggered the original action has
 * been unmounted (e.g. you cannot emit events from an unmounted component). If the undoAction fails
 * the function should throw an error, and a snackbar will be shown with a generic error message.
 *
 * @param {() => string} options.undoActionNotice$ - Function that returns the message to display on
 * the snackbar when the undo action is successful.
 *
 * @param {() => void} [options.onBlur] - Optional callback that executes when the undo button in
 * the snackbar loses focus.
 *
 * @typedef {Object} UseActionWithUndoObject
 * @property {() => Promise<void>} performAction - A method to manually trigger the main action
 * with all the undo machinery set up.
 *
 * @param {ComputedRef<boolean>} options.canUndo - A computed ref that will return true when the undo
 * can be performed (Default: ComputedRef -> true)
 *
 * @returns {UseActionWithUndoObject}
 */
export default function useActionWithUndo({
  canUndo = computed(() => true),
  action,
  actionNotice$,
  undoAction,
  undoActionNotice$,
  onBlur,
}) {
  const { undoAction$, defaultErrorMessage$ } = bulkUserManagementStrings;
  const { createSnackbar, clearSnackbar } = useSnackbar();

  const performUndoAction = async () => {
    if (!canUndo.value) return;

    clearSnackbar();
    try {
      await undoAction();
      createSnackbar(undoActionNotice$());
    } catch (error) {
      createSnackbar(defaultErrorMessage$());
    }
  };

  const performAction = async () => {
    const success = await action();
    if (!success) {
      return;
    }

    createSnackbar({
      text: actionNotice$(),
      autofocus: true,
      autoDismiss: true,
      duration: 6000,
      actionText: canUndo.value ? undoAction$() : coreStrings.dismissAction$(),
      onBlur,
      actionCallback: performUndoAction,
    });
  };

  return {
    performAction,
  };
}
