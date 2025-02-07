import React from "react";
import theme from "../bloomPlayerTheme";
import { storiesOf } from "@storybook/react";

import { ThemeProvider } from "@material-ui/styles";
import { BloomPlayerControls } from "../bloom-player-controls";
import {
    withKnobs,
    boolean as booleanKnob,
    button
} from "@storybook/addon-knobs";
import Axios from "axios";

const stories = storiesOf("Various books", module);
stories.addDecorator(withKnobs);
stories.addDecorator(storyFn => (
    <ThemeProvider theme={theme}>{storyFn()}</ThemeProvider>
));

const KNOB_TABS = {
    PROPS: "Props",
    EXTERNAL: "External"
};
const allowToggleAppBar = () =>
    booleanKnob("Allow Toggle App Bar", true, KNOB_TABS.PROPS) as boolean;
const showBackButton = () =>
    booleanKnob("Show Back Button", true, KNOB_TABS.PROPS) as boolean;
const initiallyShowAppBar = () =>
    booleanKnob("Initially Show App Bar", true, KNOB_TABS.PROPS) as boolean;
const hideFullScreenButton = () =>
    booleanKnob("Hide Full Screen Button", false, KNOB_TABS.PROPS) as boolean;
const paused = () => booleanKnob("Paused", false, KNOB_TABS.PROPS) as boolean;
const useOriginalPageSize = () =>
    booleanKnob("Original page size", false, KNOB_TABS.PROPS) as boolean;
const showExtraButtons = () =>
    booleanKnob("Show extra buttons", false, KNOB_TABS.PROPS) as boolean;

// Setting one of these as the ParentProxy of the window allows us to receive
// messages BP usually sends to a host window, without actually embedding it in an iframe.
class MessageReceiver {
    // data is what would be the data property of the event in a host window
    public receiveMessage(data: string) {
        try {
            const r = JSON.parse(data);
            if (r.messageType === "takePhoto") {
                alert("photo taken");
            } else if (r.messageType === "fullScreen") {
                alert("full screen request");
            }
        } catch (err) {
            console.log(`Got error with message: ${err}`);
        }
    }
}

function AddBloomPlayerStory(
    label: string,
    // The URL should be a valid, well-formed URL, i.e. one you can copy/paste straight into your browser.
    // If the URL contains special chars, those should be encoded, but the additional encoding that is needed
    // to pass this URL into a query parameter of another URL should be decoded.
    // e.g. "Test #1" should be "src/test %231", not "src/test #1" nor "src%2ftest %231"
    url: string,
    languageCode?: string
) {
    const parts = label.split("/");
    const lastPart = parts[parts.length - 1];
    storiesOf(
        ["Various books", ...parts.slice(0, parts.length - 1)].join("/"),
        module
    ).add(lastPart, () => {
        // The tab order is determined by the order in which the code here uses them.
        // So back button is defined first to make the Props tab show first.
        const showBackButtonKnob = showBackButton();
        button("Pause", pause, KNOB_TABS.EXTERNAL);
        button("Resume", resume, KNOB_TABS.EXTERNAL);
        button("Play", play, KNOB_TABS.EXTERNAL);
        const extraButtons = showExtraButtons()
            ? [
                  {
                      id: "takePhoto",
                      iconUrl:
                          "https://img.icons8.com/plasticine/100/000000/camera.png",
                      description: "take a photo!"
                  }
              ]
            : undefined;
        if (extraButtons) {
            // we're not making a real iframe, so we have to simulate receiving the message
            (window as any).ParentProxy = new MessageReceiver();
        }
        return (
            <BloomPlayerControls
                showBackButton={showBackButtonKnob}
                initiallyShowAppBar={initiallyShowAppBar()}
                allowToggleAppBar={allowToggleAppBar()}
                paused={paused()}
                url={url}
                locationOfDistFolder={"/dist/"}
                hideFullScreenButton={hideFullScreenButton()}
                initialLanguageCode={languageCode}
                useOriginalPageSize={useOriginalPageSize()}
                // useful for seeing what will happen in video preview/recording
                // hideSwiperButtons={true}
                // autoplay={"yes"}
                // skipActivities={true}
                // videoPreviewMode={true}
                autoplay={"motion"}
                extraButtons={extraButtons}
                // startPage={1}
                // autoplayCount={3}
            />
        );
    });
}

function pause() {
    simulateExternalMessage('{ "messageType": "control", "pause": "true" }');
}
function resume() {
    simulateExternalMessage('{ "messageType": "control", "resume": "true" }');
}
function play() {
    simulateExternalMessage('{ "messageType": "control", "play": "true" }');
}

function simulateExternalMessage(message: string) {
    window.postMessage(message, "*");
}

AddBloomPlayerStory(
    "Activity/Landscape SL with Quiz",
    "https://s3.amazonaws.com/bloomharvest/educationforlife%40sil.org%2f6f6d82d5-e98d-445d-b4be-143df993c3c0/bloomdigital%2findex.htm"
);

Axios.get("http://localhost:8089/bloom/CURRENT-BLOOMPUB-URL").then(result => {
    AddBloomPlayerStory("* BloomPUB currently previewed in Bloom", result.data);
});

AddBloomPlayerStory(
    "Comic - A5Portrait",
    "https://s3.amazonaws.com/bloomharvest/hannah_hudson%40sil-lead.org%2f8ec6f115-a508-45e1-b820-bd560fdd5b3b/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Book not found",
    "file:///aVery/Long/FileName/That/Will/Never/Be/Found/Anywhere/At/All/To/See/How/It/Wraps.htm"
);
AddBloomPlayerStory("Empty Url Parameter", "");
AddBloomPlayerStory(
    "Overflowing pages (some)",
    "https://s3.amazonaws.com/bloomharvest/benjamin%40aconnectedplanet.org%2f130b6829-5367-4e5c-80d7-ec588aae5281/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Talking book with image descriptions",
    "https://s3.amazonaws.com/bloomharvest/chris_weber%40sil-lead.org%2fd7e8058e-c0cb-4b62-a030-e710fe8b7906/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Difficult book for IOS",
    "https://s3.amazonaws.com/share.bloomlibrary.org/debug/9144p2/bloomdigital/index.htm"
);

AddBloomPlayerStory(
    "Book with forced large title in one language",
    "https://s3.amazonaws.com/bloomharvest/lorrie%40blind.org.ph%2f5723926d-f75b-4b59-b2a6-578188e07e80/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Music",
    "https://s3.amazonaws.com/bloomharvest-sandbox/bloom.bible.stories%40gmail.com/a70f135b-07b0-4bfb-962e-0aabb82f87ec/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Activity/Activity that leads to FF60 split page",
    //"https://s3.amazonaws.com/bloomharvest-sandbox/stephen_mcconnel%40sil.org/eda23196-72e8-4701-8651-58f14ce2bcfd/bloomdigital/index.htm"
    "testBooks/Testing Away Again/index.htm"
);

AddBloomPlayerStory(
    "Multilingual motion book - default language",
    "https://s3.amazonaws.com/bloomharvest/bloom.bible.stories%40gmail.com%2faf30a7ce-d146-4f07-8aa4-d11de08c4665/bloomdigital%2findex.htm"
);
AddBloomPlayerStory(
    "Multilingual motion book - initial language set to 'ko'",
    "https://s3.amazonaws.com/bloomharvest/bloom.bible.stories%40gmail.com%2faf30a7ce-d146-4f07-8aa4-d11de08c4665/bloomdigital%2findex.htm",
    "ko"
);
AddBloomPlayerStory(
    "Bilingual book, both recorded",
    "https://s3.amazonaws.com/bloomharvest/educationforlife%40sil.org%2fbb97ab6e-651f-4681-9caf-7c6ce542e3a0/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Requires custom font",
    "https://s3.amazonaws.com/bloomharvest-sandbox/andrew_polk%40sil.org%2fa0a92e1b-ccad-4dbd-8ce5-2159aaee02aa/bloomdigital%2findex.htm"
);

AddBloomPlayerStory(
    "Activity/Choice activities from Bloom 5.4",
    "testbooks/Bloom5.4-activities/Bloom5.4-activities.htm"
);
AddBloomPlayerStory(
    "Book with two audio sentences on cover",
    "https://s3.amazonaws.com/bloomharvest/namitaj%40chetana.org.in/78c7e561-ce24-4e5d-ad0a-6af141d9d0af/bloomdigital%2findex.htm"
);
AddBloomPlayerStory(
    "Activity/IFrame - Construct Runtime Game",
    "testbooks/sample-iframe-activity/index.htm"
);
AddBloomPlayerStory(
    "Activity/ActivePresenter widget test",
    "testbooks/test-widget-iframe-messages/index.htm"
);
AddBloomPlayerStory(
    "Activity/Canvas Game - Snake",
    "testbooks/sample-canvas-activity/index.htm"
);
AddBloomPlayerStory(
    "Activity/Test widget-controlled navigation",
    "testbooks/test-widget-message-activity/index.htm"
);
AddBloomPlayerStory(
    "Sign language with talking & TOC",
    "testbooks/sign-language-with-talking-book/sign-language-with-talking-book.htm"
);

AddBloomPlayerStory(
    "Book that isn't found",
    "https://s3.amazonaws.com/bloomharvest-sandbox/colin_suggett%40sil.org%2fe88a5f3f-b769-4af7-a05f-1b3a0a417c30/bloomdigital/NOTTHERE.htm"
);
AddBloomPlayerStory(
    "Encoding test with # and &",
    // note, I could not test :, /, or ? because they are not allowed as part of the filename anyways.
    "src/testbook/test %231/test %26 play%232.htm"
);
AddBloomPlayerStory(
    "Sign Language with TalkingBook sound",
    "https://s3.amazonaws.com/share.bloomlibrary.org/debug/Is+it+the+End+of+the+World++-+SL/Is+it+the+End+of+the+World++-+SL.htm"
);
AddBloomPlayerStory(
    "General video with audio",
    "https://s3.amazonaws.com/BloomLibraryBooks/joemin_maratin%40sil.org%2fe0e4f0e0-7afd-45a4-9ef6-4fdc83010621%2fBuuk+Tuni+Urup+Dang+Kimaragang++Draft%2f"
);
