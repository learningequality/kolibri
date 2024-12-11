import { ref } from 'vue';
import { get, set } from '@vueuse/core';

const snackbarIsVisible = ref(false);
const snackbarOptions = ref({
  text: '',
  autoDismiss: true,
});

export default function useSnackbar() {
  const createSnackbar = (options = {}) => {
    // reset
    set(snackbarIsVisible, false);
    set(snackbarOptions, {});

    // set new options
    set(snackbarIsVisible, true);

    // options include text, autoDismiss, duration, actionText, actionCallback,
    // hideCallback, bottomPosition
    // if the options are a string, set it as the snackbar text
    // and default autoDismiss to true
    if (typeof options === 'string') {
      set(snackbarOptions, { text: options, autoDismiss: true });
    } else {
      set(snackbarOptions, options);
    }
  };

  const clearSnackbar = () => {
    set(snackbarIsVisible, false);
    set(snackbarOptions, {});
  };

  const setSnackbarText = text => {
    set(snackbarOptions, { ...get(snackbarOptions), text });
  };

  return {
    // state
    snackbarIsVisible,
    snackbarOptions,

    // mutators
    createSnackbar,
    clearSnackbar,
    setSnackbarText,
  };
}
