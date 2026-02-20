<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <div
      class="task-panel"
      :class="{ 'task-panel-sm': windowIsSmall }"
    >
      <div class="icon">
        <transition
          v-if="!taskError"
          mode="out-in"
        >
          <KIcon
            v-if="taskCompleted"
            icon="check"
            :style="{ fill: $themeTokens.success }"
            data-test="syncStatusIcon"
          />
          <KCircularLoader
            v-else
            :size="24"
            :stroke="5"
          />
        </transition>
      </div>

      <div class="details">
        <p
          class="details-status"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ taskInfo() }}
        </p>

        <div
          v-if="taskCompleted"
          data-test="completedMessage"
        >
          {{ successfullyJoined }}
        </div>
        <div
          v-if="taskError"
          data-test="errorMessage"
        >
          {{ errorMessage }}
        </div>
        <div
          v-else
          class="details-progress-bar"
        >
          <KLinearLoader
            class="k-linear-loader"
            type="determinate"
            :delay="false"
            :progress="percentage * 100"
            :style="{ backgroundColor: $themeTokens.fineLine }"
          />
          <span class="details-percentage">
            {{ $formatNumber(percentage, { style: 'percent' }) }}
          </span>
        </div>
      </div>
    </div>

    <BottomAppBar v-if="taskCompleted || taskError">
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            v-if="taskCompleted"
            :primary="true"
            :text="coreString('finishAction')"
            data-test="finishButton"
            @click="to_finish"
          />
          <KButton
            v-if="taskError"
            :primary="true"
            :text="coreString('retryAction')"
            data-test="retryButton"
            @click="to_retry"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import { computed, inject, onMounted, ref } from 'vue';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import get from 'lodash/get';
  import { syncStatusToDescriptionMap, TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import urls from 'kolibri/urls';
  import client from 'kolibri/client';
  import { getTaskString } from 'kolibri-common/uiText/tasks';

  export default {
    name: 'MergeFacility',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },
    mixins: [commonCoreStrings],
    setup() {
      const changeFacilityService = inject('changeFacilityService');
      const state = inject('state');
      const taskId = computed(() => get(state, 'value.taskId', null));
      const task = ref(null);
      const taskError = ref(false);
      let isPolling = true;
      let isTaskRequested = false;
      const taskCompleted = computed(() =>
        task.value === null ? false : task.value.status === TaskStatuses.COMPLETED,
      );
      const percentage = computed(() => (task.value ? task.value.percentage : 0));
      onMounted(() => {
        pollTask();
      });
      const { windowIsSmall } = useKResponsiveWindow();

      function updateMachineContext(updatedTask) {
        task.value = updatedTask;
        changeFacilityService.send({
          type: 'SETTASKID',
          value: { task_id: updatedTask.id },
        });
      }

      function syncFacilityTaskDisplayInfo(task) {
        // overrides the syncFacilityTaskDisplayInfo function in kolibri.utils.syncTaskUtils
        // to provide a custom message without the step numbers

        let statusMsg;

        const statusDescription =
          syncStatusToDescriptionMap[task.extra_metadata.sync_state] ||
          syncStatusToDescriptionMap[task.status] ||
          (() => getTaskString('taskUnknownStatus'));

        if (task.status === TaskStatuses.COMPLETED) {
          statusMsg = getTaskString('taskFinishedStatus');
        } else {
          if (task.status === TaskStatuses.FAILED) {
            statusMsg = `${statusDescription()}: ${task.exception}`;
          } else statusMsg = statusDescription();
        }

        return statusMsg;
      }

      function pollTask() {
        if (taskId.value === null) {
          // first, try to see if there's already one running
          TaskResource.fetchCollection()
            .then(allTasks => {
              const tasks = allTasks.filter(
                t => t.type === 'kolibri.plugins.user_profile.tasks.mergeuser',
              );
              if (tasks.length > 0) {
                updateMachineContext(tasks[0]);
              } else {
                // if not, start a new one or wait for the previous request to finish
                if (!isTaskRequested) {
                  isTaskRequested = true;
                  const params = {
                    type: 'kolibri.plugins.user_profile.tasks.mergeuser',
                    baseurl: state.value.targetFacility.url,
                    facility: state.value.targetFacility.id,
                    username: state.value.targetAccount.username,
                    local_user_id: state.value.userId,
                    facility_name: state.value.targetFacility.name,
                    user_id: state.value.targetAccount.id,
                  };
                  if (state.value.targetAccount.password !== '') {
                    params['password'] = state.value.targetAccount.password;
                  }
                  if (state.value.newSuperAdminId !== '') {
                    params['new_superuser_id'] = state.value.newSuperAdminId;
                  }
                  if (state.value.setAsSuperAdmin !== false) {
                    params['set_as_super_user'] = true;
                  }
                  if (state.value.targetAccount.AdminUsername !== undefined) {
                    params['using_admin'] = true;
                    params['username'] = state.value.targetAccount.AdminUsername;
                    params['password'] = state.value.targetAccount.AdminPassword;
                  }

                  TaskResource.startTask(params)
                    .then(startedTask => {
                      updateMachineContext(startedTask);
                      isTaskRequested = false;
                    })
                    .catch(error => {
                      if (error.response.status === 400) {
                        const message = get(error.response, 'data[0].metadata.message', '');
                        if (
                          message === 'USERNAME_ALREADY_EXISTS' ||
                          message === 'PASSWORD_NOT_SPECIFIED'
                        ) {
                          taskError.value = true;
                          isPolling = false;
                        } else {
                          // if the request is bad, we can't do anything
                          changeFacilityService.send('TASKERROR');
                        }
                      } else if (error.response.status == 410) {
                        taskError.value = true;
                        isPolling = false;
                      }
                    });
                }
              }
            })
            .catch(() => {
              // if the request is bad, we can't do anything
              taskError.value = true;
              isPolling = false;
            });
        } else {
          TaskResource.fetchModel({ id: taskId.value, force: true })
            .then(startedTask => {
              task.value = startedTask;
              if (startedTask.status == TaskStatuses.COMPLETED) {
                isPolling = false;
              } else if (startedTask.status === TaskStatuses.FAILED) {
                TaskResource.clear(taskId.value); // start a new one
                isTaskRequested = false;
                taskError.value = true;
              }
            })
            .catch(err => {
              if (err?.response?.status === 403 && task.value) {
                // If we get a 403, it means that our currently logged in user
                // does not have permission to access the task. This can happen
                // if the user has been deleted by the task as intended, so assume
                // the task has completed successfully.
                task.value = {
                  ...task.value,
                  status: TaskStatuses.COMPLETED,
                };
              } else {
                // if the request is bad, we can't do anything
                taskError.value = true;
              }
              isPolling = false;
            });
        }

        if (isPolling) {
          setTimeout(() => {
            pollTask();
          }, 2000);
        }
      }

      function to_finish() {
        const token = task.value.extra_metadata.token;
        TaskResource.clear(taskId.value);
        changeFacilityService.send({ type: 'FINISH' });
        // use the token to login in the device using the new user in the target facility
        const params = {
          pk: state.value.targetAccount.id,
          token,
        };
        // if the user was created in the target facility, we need to gets its id:
        if (params.pk === undefined) {
          params.pk = task.value.extra_metadata.remote_user_pk;
        }
        client({
          url: urls['kolibri:kolibri.plugins.user_profile:loginmergeduser'](),
          method: 'POST',
          data: params,
        }).then(() => {
          redirectBrowser();
        });
      }

      function to_retry() {
        if (taskId.value !== null) {
          TaskResource.clear(taskId.value);
        }
        taskError.value = false;
        changeFacilityService.send('TASKERROR');
      }

      function taskInfo() {
        if (task.value === null) {
          return '';
        }
        return syncFacilityTaskDisplayInfo(task.value);
      }

      const successfullyJoined = computed({
        get() {
          return this.$tr('success', {
            target_facility: get(state, 'value.targetFacility.name', ''),
          });
        },
      });

      const errorMessage = computed({
        get() {
          const targetUsername = get(state, 'value.targetAccount.username', '');
          const currentUsername = get(state, 'value.username', '');
          let errorString = 'failedTaskError';
          if (task.value !== null && get(task, 'value.status', '') !== TaskStatuses.FAILED) {
            errorString = targetUsername !== currentUsername ? 'userExistsError' : 'userAdminError';
          }
          return this.$tr(errorString, {
            username: targetUsername,
            target_facility: get(state, 'value.targetFacility.name', ''),
          });
        },
      });

      return {
        percentage,
        taskError,
        taskCompleted,
        taskInfo,
        to_finish,
        to_retry,
        successfullyJoined,
        errorMessage,
        windowIsSmall,
      };
    },

    $trs: {
      documentTitle: {
        message: 'Changing learning facility',
        context: 'Title of this step for the change facility page.',
      },
      success: {
        message: "Successfully joined '{target_facility}' learning facility.",
        context: 'Status message for a successful task.',
      },
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      userExistsError: {
        message:
          "User '{username}' already exists in '{target_facility}'. Please choose a different username.",
        context: 'Error message for a user already existing in the target facility.',
      },
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      userAdminError: {
        message:
          "User '{username}' already exists in '{target_facility}' and is not a learner. Please choose a different username.",
        context: 'Error message for a user being other than a learner in the target facility.',
      },
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      failedTaskError: {
        message:
          "Merging task for '{username}' has failed due to some problem connecting to the '{target_facility}'. Please, check your network connection and try again.",
        context: 'Error message for a connection error when merging the user',
      },
    },
  };

</script>


<style lang="scss" scoped>

  $fs0: 12px;
  $fs1: 14px;

  p,
  h2 {
    margin: 8px 0;
  }

  .icon {
    padding: 0 16px;

    .task-panel-sm & {
      align-self: flex-start;
    }
  }

  .icon svg {
    width: 24px;
    height: 24px;
  }

  .task-panel {
    display: flex;
    align-items: center;
  }

  .task-panel-sm {
    flex-direction: column;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .details {
    flex-grow: 1;
    width: 100%;
    padding: 16px;

    .task-panel-sm & {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .details-progress-bar {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }

  // CSS overrides for linear loader
  .k-linear-loader {
    height: 10px !important;

    /deep/ .ui-progress-linear-progress-bar {
      height: 100%;
    }
  }

  .details-percentage {
    // min-width ensures num % stay on same line
    min-width: 48px;
    margin-left: 16px;
    font-size: $fs1;
  }

  .details-status {
    font-size: $fs0;
  }

</style>
