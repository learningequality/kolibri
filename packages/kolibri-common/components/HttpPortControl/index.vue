<template>

  <div>
    <p
      v-if="readonlyMessage"
      data-testid="http-port-readonly"
    >
      {{ readonlyMessage }}
    </p>
    <p
      v-else-if="fetchFailed"
      role="alert"
    >
      {{ portFetchError$() }}
    </p>
    <KCircularLoader
      v-else-if="currentPort === null"
      data-testid="http-port-loading"
    />
    <template v-else>
      <div class="port-row">
        <KTextbox
          ref="portField"
          v-model="portInput"
          class="port-field"
          type="number"
          :min="1"
          :max="65535"
          :label="portLabel$()"
          :invalid="outOfRange"
          :invalidText="portOutOfRange$()"
          :showInvalidText="outOfRange"
          :disabled="busy"
          @keyup.enter.native.stop="requestChange"
        />
        <KButton
          primary
          :text="changePortAction$()"
          :disabled="!canChange"
          @click="requestChange"
        />
      </div>
      <p
        v-if="failureMessage"
        role="alert"
      >
        {{ failureMessage }}
      </p>
    </template>
    <KModal
      v-if="confirming"
      key="confirm"
      :title="changePortAction$()"
      :submitText="changePortAction$()"
      :cancelText="cancelAction$()"
      @submit="submitChange"
      @cancel="confirming = false"
    >
      <p>{{ changePortConfirmation$({ port: requestedPort }) }}</p>
      <p v-if="confirmationNote">{{ confirmationNote }}</p>
    </KModal>
    <KModal
      v-if="busy"
      key="busy"
      :title="changePortAction$()"
    >
      <div role="status">
        <KCircularLoader />
        <p v-if="restarting">{{ restartingOnPort$({ port: restartingPort }) }}</p>
      </div>
    </KModal>
  </div>

</template>


<script>

  import { computed, nextTick, ref, watch } from 'vue';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { httpPortStrings } from 'kolibri-common/strings/httpPortStrings';
  import useHttpPort, { BROWSER_PORT_MISMATCH } from './useHttpPort';

  const {
    advertisedPortSet$,
    browserPortMismatch$,
    cannotRestart$,
    changePortAction$,
    changePortConfirmation$,
    portInUse$,
    portInUseByProcess$,
    portInUseByUser$,
    portChangeUnconfirmed$,
    portFetchError$,
    portLabel$,
    portOutOfRange$,
    portPermissionDenied$,
    portUnavailable$,
    restartingOnPort$,
    setByCommandLine$,
    setByEnvironmentVariable$,
    stillOnPort$,
  } = httpPortStrings;

  const READONLY_MESSAGES = {
    CANNOT_RESTART: cannotRestart$,
    ENVIRONMENT_VARIABLE: setByEnvironmentVariable$,
    COMMAND_LINE: setByCommandLine$,
    ADVERTISED_HTTP_PORT: advertisedPortSet$,
    [BROWSER_PORT_MISMATCH]: browserPortMismatch$,
  };

  const FAILURE_MESSAGES = {
    [ERROR_CONSTANTS.PORT_IN_USE]: portInUse$,
    [ERROR_CONSTANTS.PORT_IN_USE_BY_PROCESS]: ({ port, detail }) =>
      portInUseByProcess$({ port, process: detail }),
    [ERROR_CONSTANTS.PORT_IN_USE_BY_USER]: ({ port, detail }) =>
      portInUseByUser$({ port, user: detail }),
    [ERROR_CONSTANTS.PORT_PERMISSION_DENIED]: portPermissionDenied$,
    [ERROR_CONSTANTS.PORT_UNAVAILABLE]: portUnavailable$,
  };

  export default {
    name: 'HttpPortControl',
    setup(props, { emit }) {
      const {
        currentPort,
        fetchFailed,
        readonlyReason,
        saving,
        restartingPort,
        failure,
        changePort,
      } = useHttpPort();

      const portField = ref(null);
      async function focusPortField() {
        await nextTick();
        // KDS KModal's `destroyed` hook refocuses its opener in a `setTimeout`.
        setTimeout(() => portField.value?.focus());
      }

      const portInput = ref('');
      function resetPortInput() {
        portInput.value = String(currentPort.value);
      }
      watch(currentPort, resetPortInput);

      const requestedPort = computed(() => Number(portInput.value));
      const outOfRange = computed(
        () =>
          !Number.isInteger(requestedPort.value) ||
          requestedPort.value < 1 ||
          requestedPort.value > 65535,
      );
      const restarting = computed(() => restartingPort.value !== null);
      const savingPending = ref(false);
      const busy = computed(() => savingPending.value || saving.value || restarting.value);
      const canChange = computed(
        () => !busy.value && !outOfRange.value && requestedPort.value !== currentPort.value,
      );

      const confirming = ref(false);

      async function submitChange() {
        confirming.value = false;
        savingPending.value = true;
        try {
          await props.beforeChange();
        } catch {
          focusPortField();
          return;
        } finally {
          savingPending.value = false;
        }
        if (!(await changePort(requestedPort.value))) {
          resetPortInput();
          focusPortField();
          emit('failed');
        }
      }

      function requestChange() {
        if (!canChange.value) {
          return;
        }
        if (props.requireConfirmation) {
          confirming.value = true;
        } else {
          submitChange();
        }
      }

      const readonlyMessage = computed(() => {
        const message = READONLY_MESSAGES[readonlyReason.value];
        return message ? message({ port: currentPort.value }) : null;
      });

      const failureMessage = computed(() => {
        if (!failure.value) {
          return null;
        }
        const message = FAILURE_MESSAGES[failure.value.id];
        if (!message) {
          const { status } = failure.value;
          return status >= 400 && status < 500
            ? stillOnPort$({ port: currentPort.value })
            : portChangeUnconfirmed$({ port: failure.value.port });
        }
        return `${message(failure.value)} ${stillOnPort$({ port: currentPort.value })}`;
      });

      return {
        currentPort,
        fetchFailed,
        portField,
        restartingPort,
        restarting,
        portInput,
        requestedPort,
        outOfRange,
        busy,
        canChange,
        confirming,
        submitChange,
        requestChange,
        readonlyMessage,
        failureMessage,
        portFetchError$,
        portLabel$,
        portOutOfRange$,
        changePortAction$,
        changePortConfirmation$,
        restartingOnPort$,
        cancelAction$: coreStrings.cancelAction$,
      };
    },
    props: {
      requireConfirmation: {
        type: Boolean,
        default: false,
      },
      confirmationNote: {
        type: String,
        default: null,
      },
      /**
       * Called before the port change is sent; a rejection cancels the change.
       */
      beforeChange: {
        type: Function,
        default: () => Promise.resolve(),
      },
    },
  };

</script>


<style lang="scss" scoped>

  .port-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  .port-field {
    max-width: 200px;
  }

</style>
