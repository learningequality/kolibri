<template>
<div>
    <div>
        <p class="question-list-style">{{ $tr('Questionlist')}}</p>

        <KGrid
            class="question-row"
        >
            <KGridItem
                :layout12="{ span : 6}"
            >
                <div 
                    class="left-column-alignment-style"
                    >

                    <div>
                        <p>
                            <KCheckbox/>
                        </p>
                    </div>

                    <div>
                        <p>{{ $tr('selectAllLabel') }}</p>
                    </div>
                </div>
            </KGridItem>

            <KGridItem
                :layout12="{ span : 6}"
            >
                <div
                    class="right-alignment-style"
                    >
                    <KGrid>
                        <KGridItem
                            :layout12="{ span :4 }"
                        >
                            <div style="max-height:5px">
                                <KIcon class="icon-size" icon="chevronDown"/>
                                <KIcon class="icon-size" icon="chevronUp"/>
                            </div>
                            
                        </KGridItem>

                        <KGridItem
                            :layout12="{ span :4 }"
                        >
                            <KIcon 
                                class="icon-size"
                                icon="refresh"/>
                        </KGridItem>

                        <KGridItem
                            :layout12="{ span :4 }"
                        >
                            <KIcon 
                                class="icon-size"
                                icon="trash"/>
                        </KGridItem>
                    </KGrid>
                </div>
            </KGridItem>
        </KGrid>

        <AccordionItem/>

        <AccordionItem/>

        <AccordionItem/>

        <AccordionItem/>

    </div>
</div>
</template>


<script>
import CoreTable from 'kolibri.coreVue.components.CoreTable';
import AccordionItem from './AccordionItem.vue';
export default {
    name:"AccordionContainer",
    components:{
        CoreTable,
        AccordionItem
    },
    $trs:{
        Questionlist:{
            message:"Question list",
            context:"Subtitle indicating the question in the section"
        },
        selectAllLabel:{
            message:"Select all",
            context:"Label indicates that all available options can be chosen at once."
        }
    }
}
</script>

<style scoped>
.question-list-style{
    font-size: 18px;
}

.question-label{
    margin-top:10px;
}

.icon-size{
    width:24px;
    height:24px;
}

.question-row{
    border-top:2px solid #FAFAFA;
    border-bottom: 2px solid #FAFAFA;
    background-color: #FAFAFA;
}

.left-column-alignment-style{
    display:inline-flex;
    margin-left:35px;
}

.right-alignment-style{
    float:right;
    margin-top:10px;
}
</style>