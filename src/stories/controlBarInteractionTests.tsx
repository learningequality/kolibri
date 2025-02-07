import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { within, userEvent } from "@storybook/testing-library";
import { expect } from "@storybook/jest";
import { ControlBar } from "../controlBar";
import LangData from "../langData";

// The format of the tests here is from https://storybook.js.org/docs/react/writing-stories/play-function
export default {
    title: "Interaction Tests/Control Bar",
    component: ControlBar
} as ComponentMeta<typeof ControlBar>;

const Template: ComponentStory<typeof ControlBar> = args => (
    <ControlBar
        {...args}
        visible={true}
        paused
        showPlayPause
        playLabel="Grind On"
        bookLanguages={[
            new LangData("Sokoro", "sok"),
            new LangData("Englishy", "en"),
            new LangData("frenchy", "fr")
        ]}
        activeLanguageCode="fr"
        canGoBack={true}
        preferredLanguages={["en", "fr"]}
    />
);

// I'm not clear myself why we need this 'bind' call, but apparently it has to do with being able to
// create the play function and get the Storybook interactions addon to run it auto-magically. When I try
// to define the play() method directly on "Template", without doing the "bind()", the test doesn't
// show up in Storybook at all.
export const ControlBarButtonTest = Template.bind({});

// From the Storybook docs: "Storybook's play functions are small code snippets that run once the story
// finishes rendering. Aided by the addon-interactions, it allows you to build component interactions
// and test scenarios that were impossible without user intervention.
//
// The canvasElement is an HTMLElement corresponding to <div id="root"> inside of the iframe that holds
// the Storybook test preview. Just inside of that is the <div class="reactRoot"> that everything is
// built into. The within function binds all of the testing queries to that HTMLElement, so we can do
// things like canvas.find/get/query/etc. (All of the Testing Library stuff for finding the accessible
// elements to test).
ControlBarButtonTest.play = async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Not all buttons are displayed immediately. 'findBy' waits until the language menu button shows up.
    const languageButton = await canvas.findByTitle("Choose Language");
    const buttons = await canvas.getAllByRole("img"); // 3 of 'em?
    expect(buttons.length).toEqual(3);
    // (User) interactions
    await userEvent.click(buttons[0]); // back button
    await userEvent.click(buttons[2]); // play button
    await userEvent.click(languageButton); // brings up language menu

    // The language menu is not "within" this canvasElement, so this test can't detect it.

    // However, because it pops up and makes the control bar buttons inaccessible, we CAN test
    // this state because the browser sets the entire canvas to aria-hidden=true.
    const hiddenButtons = canvas.getAllByRole("img", { hidden: true });
    await expect(hiddenButtons.length).toEqual(3);
};
