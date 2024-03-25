<template>

  <div class="alert" :style="{ backgroundColor: $themePalette.red.v_200, display: displayBanner }">
    <h1 style="display: none">
      {{ $tr('insufficientStorageHeader') }}
    </h1>
    <div style="display:flex">
      <div>
        <KIcon
          icon="error"
          class="icon"
        />
      </div>

      <div class="error-message">
        {{ $tr('warningMessage') }}
        <router-link :to="url">
          <KButton appearance="basic-link">
            {{ $tr('alertLink') }}
          </KButton>
        </router-link>
      </div>

      <div>
        <KIconButton
          size="small"
          icon="incorrect"
          :ariaLabel="$tr('closeNotification')"
          :tooltip="$tr('closeNotification')"
          @click="closeAlert"
        />
      </div>

    </div>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { useLocalStorage } from '@vueuse/core';
  import { PageNames } from '../constants';

  export default {
    name: 'StorageNotificationBanner',
    components: {},
    data: function() {
      return {
        displayBanner: 'auto',
        notificationDismissal: {},
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      url() {
        return {
          name: PageNames.PLAN_PAGE,
          classId: this.classId,
        };
      },
    },
    methods: {
      closeAlert() {
        this.displayBanner = 'none';
        this.notificationDismissal = useLocalStorage('storageNotificationDismissal', {
          classId: this.classId,
          timestamp: new Date(),
        });
      },
    },
    $trs: {
      warningMessage: {
        message:
          "Some devices do not have enough storage for updates. Change the visibility of lessons and quizzes you aren't using right now to free up space.",
        context: 'Message displayed when a learner device does not have enough storage to sync.',
      },
      alertLink: {
        message: 'Manage lessons and quizzes',
        context: 'Link for coach plan page.',
      },
      closeNotification: {
        message: 'Close notification',
        context: 'Label for a button used to close a notification.',
      },
      insufficientStorageHeader: {
        message: 'Insufficient learner storage notification',
        context: 'Extra label describing notification for screen reader users',
      },
    },
  };

</script>


<style scoped>
.alert {
  padding: 10px;
  margin-bottom: 15px;
}
.icon {
  height: 24px;
  width: 24px;
  margin-top: 3px;
}
.error-message {
  font-size:14px;
  margin: 7px 7px 0px 10px;
}
</style>
