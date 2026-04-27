<template>

  <div class="picture-password-wrapper">
    <span class="visuallyhidden">{{ ariaLabel }}</span>
    <ol
      class="picture-password-icons"
      :class="{ 'show-sequence-numbers': showSequenceNumbers }"
      aria-hidden="true"
    >
      <li
        v-for="(icon, index) in picturePasswordIcons"
        :key="`${icon.label}-${index}`"
        :class="$computedClass({ color: $themeTokens.annotation })"
      >
        <figure :data-testid="`picture-password-icon-${icon.iconName}`">
          <KIcon
            :icon="icon.iconName"
            :style="iconStyles"
          />
          <figcaption :class="{ visuallyhidden: !effectiveShowIconText }">
            {{ icon.label }}
          </figcaption>
        </figure>
      </li>
    </ol>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  export default {
    name: 'UserPicturePassword',
    setup(props) {
      const { facilityConfig } = useFacility();
      const { picturePasswordForLearner$, picturePasswordList$ } = picturePasswordStrings;

      const picturePasswordIcons = computed(() =>
        getPicturePasswordIcons(
          props.picturePassword,
          props.iconStyle || facilityConfig.value.picture_password_settings?.icon_style,
        ),
      );

      const iconStyles = computed(() => ({
        width: props.iconSize,
        height: props.iconSize,
      }));

      const effectiveShowIconText = computed(() =>
        props.showIconText !== null
          ? props.showIconText
          : (facilityConfig.value.picture_password_settings?.show_icon_text ?? false),
      );

      const ariaLabel = computed(() => {
        const labels = picturePasswordIcons.value.map(icon => icon.label).join(', ');
        const count = picturePasswordIcons.value.length;
        return props.learnerName
          ? picturePasswordForLearner$({ learnerName: props.learnerName, count, labels })
          : picturePasswordList$({ count, labels });
      });

      return {
        picturePasswordIcons,
        iconStyles,
        effectiveShowIconText,
        ariaLabel,
      };
    },
    props: {
      picturePassword: {
        type: String,
        required: true,
        validator(value) {
          return (value || '').split('.').length === 3;
        },
      },
      showIconText: {
        type: Boolean,
        default: null,
      },
      iconStyle: {
        type: String,
        default: null,
      },
      iconSize: {
        type: String,
        default: '46px',
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

  .picture-password-wrapper {
    position: relative;
  }

  .picture-password-icons {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    width: 100%;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0;
      list-style: none;
      counter-increment: list-item;
    }

    figure {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0;
    }

    figcaption {
      margin-top: 4px;
      font-size: 12px;
      color: inherit;
    }

    &.show-sequence-numbers {
      li::after {
        margin-top: 2px;
        font-size: 12px;
        color: inherit;
        content: counter(list-item);
      }
    }
  }

</style>
