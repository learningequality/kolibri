import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
import useSnackbar from 'kolibri/composables/useSnackbar';

/**
 * Composable that wraps an action with an undo capability via a snackbar notification.
 * @param {object} root0 - Options object.
 * @param {Function} root0.action - The primary action to perform.
 * @param {Function} root0.actionNotice$ - Function returning the snackbar message after the action.
 * @param {Function} root0.undoAction - The function to call to undo the primary action.
 * @param {Function} root0.undoActionNotice$ - Function returning the snackbar message after undo.
 * @param {Function} root0.onBlur - Callback invoked when the snackbar action loses focus.
 * @returns {object} An object containing the performAction function.
 */
export default function useActionWithUndo({
  action,
  actionNotice$,
  undoAction,
  undoActionNotice$,
  onBlur,
}) {
  const { undoAction$, defaultErrorMessage$ } = bulkUserManagementStrings;
  const { createSnackbar, clearSnackbar } = useSnackbar();

  const performUndoAction = async () => {
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
      actionText: undoAction$(),
      onBlur,
      actionCallback: performUndoAction,
    });
  };

  return {
    performAction,
  };
}
