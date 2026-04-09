<template>

  <ol class="picture-password-icons">
    <li
      v-for="(icon, index) in picturePasswordIcons"
      :key="`${icon.label}-${index}`"
    >
      <figure>
        <KIcon
          class="icon"
          :icon="icon.iconName"
        />
        <figcaption :style="{ color: $themeTokens.annotation }">
          {{ icon.label }}
        </figcaption>
      </figure>
    </li>
  </ol>

</template>


<script>

  import { computed } from 'vue';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';

  export default {
    name: 'UserPicturePassword',
    setup(props) {
      const { facilityConfig } = useFacility();

      const picturePasswordIcons = computed(() =>
        getPicturePasswordIcons(
          props.picturePassword,
          facilityConfig.value.picture_password_settings?.icon_style,
        ),
      );

      return {
        // state
        picturePasswordIcons,
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
    },
  };

</script>


<style lang="scss" scoped>

  .picture-password-icons {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 0;
    margin: 0;

    li {
      margin: 0;
      list-style: none;
    }

    figure {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0;
    }

    .icon {
      // 46px renders a raw icon of roughly 32px, matching design spec
      width: 46px;
      height: 46px;
    }

    figcaption {
      margin-top: 4px;
      font-size: 12px;
    }
  }

</style>
