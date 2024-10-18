<template>

  <div :style="{ marginBottom: '8px' }">
    <UiAlert
      :dismissible="false"
      :removeIcon="true"
      type="warning"
      :style="{ marginBottom: 0, marginTop: '8px' }"
    >
      <span v-if="$slots.syncAlert">
        <slot name="syncAlert"></slot>
      </span>
      <span v-else>
        <span>
          {{
            coreString(multiple ? 'someResourcesMissingOrNotSupported' : 'resourceNotFoundOnDevice')
          }}
          &nbsp;
          <KButton
            appearance="basic-link"
            @click="open = true"
          >
            {{ $tr('learnMore') }}
          </KButton>
        </span>
      </span>
    </UiAlert>
    <KModal
      v-if="open"
      :title="$tr('resourcesUnavailableTitle')"
      :cancelText="coreString('closeAction')"
      @cancel="open = false"
    >
      <p>{{ $tr('resourcesUnavailableP1') }}</p>
      <p>{{ $tr('resourcesUnavailableP2') }}</p>
    </KModal>
  </div>

</template>


<script>

  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'MissingResourceAlert',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings],
    props: {
      multiple: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return { open: false };
    },
    $trs: {
      resourcesUnavailableTitle: {
        message: 'Resources unavailable',
        context: 'Title of the modal window',
      },
      resourcesUnavailableP1: {
        message:
          'Some resources are missing, either because they were not found on the device, or because they are not compatible with your version of Kolibri.',

        context: 'First paragraph of the "Resources Unavailable - Learn More" modal',
      },
      resourcesUnavailableP2: {
        message:
          'Consult your administrator for guidance, or use an account with device permissions to manage channels and resources.',

        context: 'Second paragraph of the "Resources Unavailable - Learn More" modal.',
      },
      learnMore: {
        message: 'Learn more',
        context:
          'A clickable link to open a modal with more information about how to remedy missing or incompatible resource issues.',
      },
    },
  };

</script>
