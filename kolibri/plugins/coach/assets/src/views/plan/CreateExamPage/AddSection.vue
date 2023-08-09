<template>
    <div>
        <div id="mySidenav" class="sidenav">
          <div class="">
                <h2>{{ $tr('sectionSetting') }}</h2>
                <KGrid
                    gutter="48"
                    >
                    <KGridItem
                        :layout12="{span:6}"
                    >
                        <KTextbox
                            ref="title"
                            v-model.trim="examTitle"
                            :label="$tr('sectionTitle')"
                            :autofocus="true"
                            :maxlength="100"
                            style="width:100%"
                        />
                    </KGridItem>

                    <KGridItem
                        :layout12="{span:6}"
                    >
                        <KGrid>
                            <KGridItem
                                :layout12="{ span: 8 }"
                            >
                                <KTextbox
                                    ref="questionsInput"
                                    v-model.trim.number="numQuestions"
                                    type="number"
                                    :min="1"
                                    :max="maxQs"
                                    :invalid="Boolean(showError && numQuestIsInvalidText)"
                                    :invalidText="numQuestIsInvalidText"
                                    :label="$tr('numQuestions')"
                                    @blur="handleNumberQuestionsBlur"
                                />
                            </KGridItem>

                            <KGridItem
                                :layout12="{ span: 2 }"
                                :style="{ marginTop: '16px' }"
                            >
                                <KIconButton
                                    icon="minus"
                                    aria-hidden="true"
                                    class="number-btn"
                                    :disabled="numQuestions === 1"
                                    @click="numQuestions -= 1"
                                />
                                <KIconButton
                                    icon="plus"
                                    aria-hidden="true"
                                    class="number-btn"
                                    :disabled="numQuestions === maxQs"
                                    @click="numQuestions += 1"
                                />
                            </KGridItem>

                        </KGrid>
                    </KGridItem>
                </KGrid>
          </div>
        </div>
    </div>

    
</template>

<script>


export default {
    name:"AddSection",
    components:{
        
    },
    data(){
        return {
            
        }
    },
    methods:{

    },
    $trs: {
        sectionSetting:{
            message:"Section settings",
            context:"Title for setting up the section"
        },
        sectionTitle:{
            message:"Section title",
            context:"Placholder text for the input field of section title"
        },
        numQuestions: {
            message: 'Number of questions',
            context: 'Indicates the number of questions that the quiz will have.',
        },


    }

}
</script>

<style>
.sidenav {
  height: 100%;
  width:1500px;
  position:fixed;
  z-index: 1000;
  top: 0;
  left:600px;
  right:0;
  background-color: #ffffff; 
  overflow-x: hidden;
  padding-top: 60px;
  transition: 0.5s;
}


</style>