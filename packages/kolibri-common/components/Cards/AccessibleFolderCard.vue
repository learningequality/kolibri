<template>

  
  <KCard
    :to="to"
    :headingLevel="headingLevel"
    layout="horizontal"
    thumbnailDisplay="large"
    :title="contentNode.title"
    :thumbnailSrc="thumbnailSrc"
    thumbnailScaleType="centerInside"
    thumbnailAlign="right"
    :style="{ height: '172px', margin: '16px 0 16px 0' }"
  >
    <template #thumbnailPlaceholder>
      <div class="default-folder-icon" >
        <KIcon
          icon="topic"
          :color="$themePalette.grey.v_600"
          class=""
        />
      </div>
    </template>

    <template #belowTitle>
      <div
        class="header-bar"
        :style="headerStyles "
      >
        <KIcon
          icon="topic"
          :color="$themePalette.grey.v_800"
          class="folder-header-bar"
        />
        <p
          class="folder-header-text"
          :style="{ color: $themePalette.grey.v_600 }"
        >
          {{ coreString('folder') }}
        </p>
      </div>
    </template>

  </KCard>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'AccessibleFolderCard',
    mixins: [commonCoreStrings],
    props: {
      to: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      contentNode: {
        type: Object,
        required: true,
      },
      headingLevel: {
        type: Number,
        required:true
      },
      thumbnailSrc: {
        type: String,
        default: null,
      },

    },
    computed: {
      headerStyles() {
        return {
          color: this.$themeTokens.text,
          borderRadius: '4px',
          height: '24px',
          width: '74px',
          margin: '0',
          backgroundColor: this.$themePalette.grey.v_50,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header-bar {
    display: flex;
    justify-content: space-between;
    height: 38px;
    font-size: 12px;
    

  }

  .folder-header-bar {
    display: inline-block;
    margin-left: 8px;
    font-size: 16px;
  }

  .folder-header-text {
    display: inline-block;
    padding: 0;
    margin: 4px;
    font-size: 12px;
  }
  .default-folder-icon{
    font-size: 48px;
    text-align: center;
    width:172px;
    height:172px;
    margin:auto;
    margin-top: 40px;
  }

</style>
