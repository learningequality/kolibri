<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <div class="task-panel" :class="{ 'task-panel-sm': windowIsSmall }">
      <div class="icon">
        <transition v-if="!taskError" mode="out-in">
          <KIcon
            v-if="taskCompleted"
            icon="check"
            :style="{ fill: $themePalette.green.v_500 }"
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
        <p class="details-status" :style="{ color: $themeTokens.annotation }">
          {{ taskInfo() }}
        </p>

        <div v-if="taskCompleted" data-test="completedMessage">
          {{ successfullyJoined }}
        </div>
        <div v-if="taskError" data-test="errorMessage">
          {{ $tr('userExistsError') }}
        </div>
        <div v-else class="details-progress-bar">
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import { computed, inject, onMounted, ref } from 'kolibri.lib.vueCompositionApi';
  import { TaskResource } from 'kolibri.resources';
  import get from 'lodash/get';
  import { syncStatusToDescriptionMap, TaskStatuses } from 'kolibri.utils.syncTaskUtils';
  import redirectBrowser from 'kolibri.utils.redirectBrowser';
  import urls from 'kolibri.urls';
  import client from 'kolibri.client';
  import { getTaskString } from '../../../../../../core/assets/src/mixins/taskStrings';

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
        task.value === null ? false : task.value.status === TaskStatuses.COMPLETED
      );
      const percentage = computed(() => (task.value ? task.value.percentage : 0));
      onMounted(() => {
        pollTask();
      });

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
          TaskResource.fetchCollection().then(allTasks => {
            const tasks = allTasks.filter(
              t => t.type === 'kolibri.plugins.user_profile.tasks.mergeuser'
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
                  user_id: state.value.targetAccount.id,
                };
                if (state.value.targetAccount.password !== '') {
                  params['password'] = state.value.targetAccount.password;
                }
                if (state.value.newSuperAdminId !== '') {
                  params['new_superuser_id'] = state.value.newSuperAdminId;
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
                    console.log('-- error starting task', error);
                    if (error.response.status === 400) {
                      const message = get(error.response, 'data[0].metadata.message', '');
                      if (message === 'USERNAME_ALREADY_EXISTS') {
                        taskError.value = true;
                      } else {
                        // if the request is bad, we can't do anything
                        changeFacilityService.send('TASKERROR');
                      }
                    }
                  });
              }
            }
          });
        } else {
          TaskResource.fetchModel({ id: taskId.value, force: true }).then(startedTask => {
            task.value = startedTask;
            if (startedTask.status == TaskStatuses.COMPLETED) {
              isPolling = false;
            } else if (startedTask.status === TaskStatuses.FAILED) {
              TaskResource.clear(taskId.value); // start a new one
              isTaskRequested = false;
            }
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
        client({
          url: urls['kolibri:kolibri.plugins.user_profile:loginmergeduser'](),
          method: 'POST',
          data: params,
        }).then(() => {
          redirectBrowser(urls['kolibri:kolibri.plugins.learn:learn']());
        });
      }

      function to_retry() {
        if (taskId.value !== null) {
          TaskResource.clear(taskId.value);
        }
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

      return {
        percentage,
        taskError,
        taskId,
        task,
        taskCompleted,
        taskInfo,
        to_finish,
        to_retry,
        successfullyJoined,
      };
    },

    $trs: {
      documentTitle: {
        message: 'Changing learning facility',
        context: 'Title of this step for the change facility page.',
      },
      success: {
        message: 'Successfully joined ‘{target_facility}’ learning facility.',
        context: 'Status message for a successful task.',
      },
      userExistsError: {
        message: 'User already exists and is not a learner. Please choose a different username.',
        context: 'Error message for a user already exists in the target facility.',
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
