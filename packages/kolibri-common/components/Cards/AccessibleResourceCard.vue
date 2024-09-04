<template>

  <KCard
    :to="to"
    :headingLevel="headingLevel"
    layout="horizontal"
    thumbnailDisplay="large"
    :title="contentNode.title"
    :thumbnailSrc="thumbnailSrc"
    :thumbnailScaleType="thumbnailScaleType"
    thumbnailAlign="right"
    :style="{ height: '172px',width: '500px', margin: '16px 0 16px 0' }"
  >
    <template #thumbnailPlaceholder>
      <div class="default-resource-icon" >
        <LearningActivityIcon
          :kind="contentNode.learning_activities"
        />
      </div>
    </template>
    <template #belowTitle>
      <div>
        <KTextTruncator
          :text="contentNode.description"
          :maxLines="2"
        />
      </div>
    </template>
    <template #footer>
      <div class="footer-icon-style">
          
        <KIconButton
          icon="bookmarkEmpty"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('savedFromBookmarks')"
          :tooltip="coreString('savedFromBookmarks')"
          @click="$emit('toggleBookmark')"
        />

        <KIconButton
          icon="infoOutline"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('viewInformation')"
          :tooltip="coreString('viewInformation')"
          @click="$emit('toggleInfo')"
        />
      </div>
    </template>

  </KCard>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearningActivityIcon from './../ResourceDisplayAndSearch/LearningActivityIcon.vue';
 
  export default {
    name: 'AccessibleResourceCard',
    components: {
      LearningActivityIcon
    },
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
      thumbnailScaleType: {
        type: String,
        default: "centerInside",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .default-resource-icon{
    font-size: 48px;
    text-align: center;
    width:172px;
    height:172px;
    margin:auto;
    margin-top: 40px;
  }
  
  .footer-icon-style{
    text-align: right;
    margin-top:15px;
  }

</style>
