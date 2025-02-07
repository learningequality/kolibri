import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import {
    within,
    userEvent,
    waitFor,
    fireEvent
} from "@storybook/testing-library";
import { expect } from "@storybook/jest";
import { BloomPlayerControls } from "../bloom-player-controls";

// Function to emulate pausing between interactions
const sleep = (ms: number): Promise<unknown> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// The format of the tests here is from https://storybook.js.org/docs/react/writing-stories/play-function
export default {
    title: "Interaction Tests/Player",
    component: BloomPlayerControls
} as ComponentMeta<typeof BloomPlayerControls>;

const MotionBookTemplate: ComponentStory<typeof BloomPlayerControls> = args => (
    <BloomPlayerControls
        {...args}
        showBackButton={true}
        initiallyShowAppBar={true}
        allowToggleAppBar={true}
        paused={false}
        locationOfDistFolder={"/dist/"}
        hideFullScreenButton={true}
        useOriginalPageSize={true}
        url={
            "https://s3.amazonaws.com/bloomharvest/bloom.bible.stories%40gmail.com%2faf30a7ce-d146-4f07-8aa4-d11de08c4665/bloomdigital%2findex.htm"
        }
        initialLanguageCode="fr"
        autoplay={"motion"}
    />
);

// Why this bind() and what does defining play() do?
// See comments on ControlBarButtonTest in controlBarInteractionTests.tsx
export const MotionPlayerTest = MotionBookTemplate.bind({});

MotionPlayerTest.play = async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Not all buttons are displayed immediately. 'findByX' methods combine the equivalent getByX()
    // and waitFor().
    const playerContent = await canvas.findByLabelText(
        "Player Content",
        undefined,
        {
            // need some extra time to get all the player pages loaded
            timeout: 3000,
            interval: 200
        }
    );

    const player = within(playerContent);
    // Initially showing the cover with a French title.
    expect(player.getByText("111 L’homme lépreux")).toBeInTheDocument();

    const languageMenuButton = await canvas.getByTitle("Choose Language");
    const playPauseButton = await canvas.getByLabelText("PlayPause");

    // Simulate user interactions; pause playback and then bring up the language menu.
    await sleep(300);
    await userEvent.click(playPauseButton);
    await sleep(300);
    await userEvent.click(languageMenuButton);

    // Now the header buttons should be hidden.
    // The term "hidden" in this context means it has aria-hidden="true", which just means it's
    // inaccessible to user interaction, not that it can't be seen. The MuiDialog does this automatically
    // to the background as part of its modal operation.
    const hiddenButtons = await canvas.getAllByRole("button", { hidden: true });
    await expect(hiddenButtons.length).toEqual(5);
    await expect(hiddenButtons[0]).toHaveAccessibleName("More Menu");
    await expect(hiddenButtons[1]).toHaveAccessibleName("Choose Language");
    await expect(hiddenButtons[2]).toHaveAccessibleName("PlayPause");
    await expect(hiddenButtons[3]).toHaveAccessibleName("Previous Page");
    await expect(hiddenButtons[4]).toHaveAccessibleName("Next Page");

    await sleep(500);

    // Check out the languages menu, which is at an outer level from the original canvas.
    const outerElement = within((canvasElement as HTMLElement).parentElement!);
    const dialogTitle = await outerElement.findByText(
        "Languages in this book:"
    );
    expect(dialogTitle).toBeInTheDocument();

    const english = outerElement.getByLabelText("English");
    expect(english).toBeInTheDocument();
    expect(english).not.toHaveAttribute("checked");

    const spanish = outerElement.getByLabelText("español (Spanish)");
    expect(spanish).toBeInTheDocument();
    expect(spanish).not.toHaveAttribute("checked");

    const french = outerElement.getByLabelText("français (French)");
    expect(french).toBeInTheDocument();
    expect(french).toHaveAttribute("checked");

    const portuguese = outerElement.getByLabelText("português (Portuguese)");
    expect(portuguese).toBeInTheDocument();
    expect(portuguese).not.toHaveAttribute("checked");

    const korean = outerElement.getByLabelText("한국어 (Korean)");
    expect(korean).toBeInTheDocument();
    expect(korean).not.toHaveAttribute("checked");

    await sleep(500);
    await userEvent.click(korean); // closes the menu

    expect(korean).not.toBeInTheDocument();
    await sleep(500);
    // Now we should be displaying the front cover with a Korean title.
    expect(player.getByText("111 나병환자 한사람")).toBeInTheDocument();
};

const DavidAndGoliathTemplate: ComponentStory<typeof BloomPlayerControls> = args => (
    <BloomPlayerControls
        {...args}
        showBackButton={true}
        initiallyShowAppBar={true}
        allowToggleAppBar={true}
        locationOfDistFolder={"/dist/"}
        useOriginalPageSize={true}
        url={
            "https://s3.amazonaws.com/bloomharvest/benjamin%40aconnectedplanet.org%2f130b6829-5367-4e5c-80d7-ec588aae5281/bloomdigital%2findex.htm"
        }
        initialLanguageCode="en"
    />
);

export const DavidAndGoliathPlayerTest = DavidAndGoliathTemplate.bind({});

DavidAndGoliathPlayerTest.play = async ({ canvasElement }) => {
    const canvas = within(canvasElement.querySelector("div.reactRoot"));

    let pageNumberControl = await canvasElement.querySelector(
        "#pageNumberControl"
    );
    await waitFor(() => expect(pageNumberControl).not.toBeNull());

    // findByX methods combine the equivalent getByX() and waitFor().
    const playerContent = await canvas.findByLabelText(
        "Player Content",
        undefined,
        {
            // need some extra time to get all the player pages loaded
            timeout: 3000,
            interval: 200
        }
    );
    expect(playerContent).toBeInTheDocument();
    const playerDOM = within(playerContent);
    // At the beginning of the book, there is only one visible swiper button (Next).
    // By default, findByRole only finds accessible items.
    const nextButton = await playerDOM.findByRole("button");
    expect(nextButton).toBeInTheDocument();
    expect(nextButton.parentElement!.classList).toContain("swiper-button-next");
    // There should be a hidden button (Previous).
    // Adding the "hidden" option just makes buttons that are present but inaccessible get added
    // to the query.
    const allButtons = await playerDOM.findAllByRole("button", {
        hidden: true
    });
    expect(allButtons.length).toEqual(2);
    expect(allButtons[0]).not.toBeVisible();

    // I was having a problem where stepping through the test in the debugger worked fine, but just
    // letting it run by itself was swiping the page, but not updating the slider. Adding a bit of
    // timeout before the click fixes that interaction... not sure why.
    await sleep(500);
    // Click the next button.
    await userEvent.click(nextButton);

    // Now there should be 2 visible buttons.
    const buttons = await playerDOM.findAllByRole("button");
    expect(buttons.length).toEqual(2);
    expect(
        playerContent.querySelector("div.swiper-button-prev button")
    ).toBeEnabled();

    // Let's check on the page control slider
    const pageNumberCtrlDOM = within(pageNumberControl as HTMLElement);

    const sliderControl = await pageNumberCtrlDOM.getByRole("slider");
    expect(sliderControl).toBeInTheDocument();
    expect(sliderControl.innerText).toEqual("1");
    expect(sliderControl).toHaveAttribute("aria-valuemax", "40");

    await sleep(500);

    // Simulate dragging the page indicator
    const sliderLocation = await sliderControl.getBoundingClientRect();
    await fireEvent.mouseDown(sliderControl, {
        clientX: sliderLocation.x + 6,
        clientY: sliderLocation.y + 6
    });
    await fireEvent.mouseMove(sliderControl, {
        clientX: sliderLocation.x + 30,
        clientY: sliderLocation.y + 6
    });
    await fireEvent.mouseUp(sliderControl, {
        clientX: sliderLocation.x + 30,
        clientY: sliderLocation.y + 6
    });

    // We can't really predict what the number in the slider will be, because moving the mouse 24 pixels
    // to the right will land at a different page depending on screen size, etc. So we just test that it's
    // no longer "1" and it didn't revert to the beginning (where the innerText would be empty string).
    expect(sliderControl.innerText).not.toEqual("1");
    expect(sliderControl.innerText).not.toEqual("");
};

const BigFishTemplate: ComponentStory<typeof BloomPlayerControls> = args => (
    <BloomPlayerControls
        {...args}
        showBackButton={false}
        initiallyShowAppBar={false}
        allowToggleAppBar={false}
        locationOfDistFolder={"/dist/"}
        useOriginalPageSize={true}
        url={
            "https://s3.amazonaws.com/bloomharvest/educationforlife%40sil.org%2fbb97ab6e-651f-4681-9caf-7c6ce542e3a0/bloomdigital%2findex.htm"
        }
        initialLanguageCode="tpi"
    />
);

export const BigFishPlayerTest = BigFishTemplate.bind({});

BigFishPlayerTest.play = async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // findByX methods combine the equivalent getByX() and waitFor().
    const playerContent = await canvas.findByLabelText(
        "Player Content",
        undefined,
        {
            // need some extra time to get all the player pages loaded
            timeout: 3000,
            interval: 200
        }
    );
    expect(playerContent).toBeInTheDocument();
    const playerContentDOM = within(playerContent);
    await sleep(500);
    const nextButton = await playerContentDOM.findByRole("button");
    expect(nextButton.parentElement!).toHaveClass("swiper-button-next");
    // Page through the book to the first Activity page.
    await userEvent.click(nextButton);
    await sleep(500);
    await userEvent.click(nextButton);
    await sleep(500);
    await userEvent.click(nextButton);
    await sleep(500);
    await userEvent.click(nextButton);
    await sleep(500);
    await userEvent.click(nextButton);
    await sleep(500);
    await userEvent.click(nextButton);
    await sleep(500);
    await userEvent.click(nextButton);
    await sleep(500);
    expect(nextButton).toBeVisible();
    await userEvent.click(nextButton);

    // Now we're on the first "widget" page; there shouldn't be a next button anymore
    expect(nextButton).not.toBeVisible();
    expect(await playerContentDOM.queryByRole("button")).toBeNull();
};
