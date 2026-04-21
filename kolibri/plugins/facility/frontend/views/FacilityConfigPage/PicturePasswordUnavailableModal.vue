<template>

  <KModal
    :title="picturePasswordUnavailableTitle$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p v-if="learnerLimit !== null">
      {{ picturePasswordUnavailableBody$({ learnerLimit: $formatNumber(learnerLimit) }) }}
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

  export default {
    name: 'PicturePasswordUnavailableModal',
    props: {
      facilityName: {
        type: String,
        required: true,
      },
      learnerCount: {
        type: Number,
        required: true,
      },
      learnerLimit: {
        type: Number,
        default: null,
      },
    },
    setup() {
      const {
        picturePasswordUnavailableTitle$,
        picturePasswordUnavailableBody$,
        picturePasswordUnavailableLearnerCount$,
      } = picturePasswordStrings;

      return {
        coreString,
        picturePasswordUnavailableTitle$,
        picturePasswordUnavailableBody$,
        picturePasswordUnavailableLearnerCount$,
      };
    },
  };

</script>
