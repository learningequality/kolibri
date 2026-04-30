<template>

  <div
    class="learner-password-card"
    :style="cardStyle"
  >
    <div class="learner-info">
      <span
        dir="auto"
        class="learner-name"
        :style="{ color: $themeTokens.text }"
      >{{ learner.full_name }}</span>
      <span
        dir="auto"
        class="learner-username"
        :style="{ color: $themeTokens.annotation }"
      >{{ learner.username }}</span>
    </div>
    <div dir="ltr">
      <template v-if="learner.picture_password">
        <div
          v-if="printFormat === 'text'"
          class="password-text-sequence"
        >
          {{ passwordTextLabels }}
        </div>
        <UserPicturePassword
          v-else
          :picturePassword="learner.picture_password"
          :showSequenceNumbers="showSequenceNumbers"
          :learnerName="learnerName"
        />
      </template>
      <NoPasswordInfo
        v-else
        :style="{ paddingLeft: '8px' }"
      />
    </div>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import UserPicturePassword from 'kolibri-common/components/UserPicturePassword';
  import NoPasswordInfo from 'kolibri-common/components/NoPasswordInfo';

  export default {
    name: 'LearnerPasswordCard',
    components: { UserPicturePassword, NoPasswordInfo },
    setup(props) {
      const passwordTextLabels = computed(() => {
        if (!props.learner.picture_password) return '';
        return getPicturePasswordIcons(props.learner.picture_password)
          .map(icon => icon.label)
          .join(' - ');
      });
      return { passwordTextLabels };
    },
    props: {
      learner: {
        type: Object,
        required: true,
      },
      cardStyle: {
        type: Object,
        default: () => ({}),
      },
      printFormat: {
        type: String,
        default: 'images',
      },
      showSequenceNumbers: {
        type: Boolean,
        default: false,
      },
      learnerName: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .learner-password-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 2px solid;
    border-radius: 8px;
  }

  .learner-info {
    display: flex;
    flex-direction: column;
  }

  .learner-name {
    padding-bottom: 4px;
    font-size: 16px;
  }

  .learner-username {
    font-size: 14px;
  }

  .password-text-sequence {
    font-size: 16px;
  }

  @media print {
    .learner-password-card {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

</style>
