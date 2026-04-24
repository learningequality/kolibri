<template>

  <KModal
    :title="picturePasswordUnavailableTitle$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p>
      {{
        picturePasswordUnavailableBody$({
          learnerLimit: $formatNumber(LEARNER_PICTURE_PASSWORD_LIMIT),
        })
      }}
    </p>
    <p>
      {{
        picturePasswordUnavailableLearnerCount$({
          facilityName,
          learnerCount: $formatNumber(learnerCount),
        })
      }}
    </p>
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  const LEARNER_PICTURE_PASSWORD_LIMIT = 1300;

  export default {
    name: 'PicturePasswordUnavailableModal',
    setup() {
      const {
        picturePasswordUnavailableTitle$,
        picturePasswordUnavailableBody$,
        picturePasswordUnavailableLearnerCount$,
      } = picturePasswordStrings;

      return {
        coreString,
        LEARNER_PICTURE_PASSWORD_LIMIT,
        picturePasswordUnavailableTitle$,
        picturePasswordUnavailableBody$,
        picturePasswordUnavailableLearnerCount$,
      };
    },
    props: {
      facilityName: {
        type: String,
        required: true,
      },
      learnerCount: {
        type: Number,
        required: true,
      },
    },
  };

</script>
