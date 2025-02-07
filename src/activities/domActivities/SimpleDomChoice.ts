import { ActivityContext } from "../ActivityContext";
import { IActivityObject } from "../activityManager";
// tslint:disable-next-line: no-submodule-imports
/* Not using. See comment below:
    const activityCss = require("!!raw-loader!./multipleChoiceDomActivity.css")
    .default;*/

// This class is intentionally very generic. All it needs is that the html of the
// page it is given should have some objects (translation groups or images) that have
// a data-activityRole of either "correct-answer" or "wrong-answer".

// Note that you won't find any code using this directly. Instead,
// it gets used by the ActivityManager as the default export of this module.
export default class MultipleChoiceDomActivity implements IActivityObject {
    private activityContext: ActivityContext;
    // When a page that has this activity becomes the selected one, the bloom-player calls this.
    // We need to connect any listeners, start animation, etc. Here,
    // we are using a javascript class to make sure that we get a fresh start,
    // which is important because the user could be either
    // coming back to this page, or going to another instance of this activity
    // in a subsequent page.
    // eslint-disable-next-line no-unused-vars
    public constructor(public pageElement: HTMLElement) {}

    public showingPage(activityContext: ActivityContext) {
        this.activityContext = activityContext;
        this.prepareToDisplayActivityEachTime(activityContext);
    }

    // Do just those things that we only want to do once per read of the book.
    // In the current implementation of activityManager, this is operating on a copy of the page html,
    // NOT the real DOM the user will eventually interact with.
    public initializePageHtml(activityContext: ActivityContext) {
        // These flags may be set for the edit-time experience. Remove them now that we're actually going to do the activity.
        activityContext.pageElement
            .querySelectorAll(".chosen-correct, .chosen-wrong")
            .forEach((choiceElement: HTMLElement) => {
                choiceElement.classList.remove("chosen-correct");
                choiceElement.classList.remove("chosen-wrong");
            });
        // Actual buttons are problematic in the editing mode, so we wrap things with a div.player-button and then here in the player,
        // we replace that with a real button.
        activityContext.pageElement
            .querySelectorAll(".player-button")
            .forEach((choiceElement: HTMLElement) => {
                this.replaceWithButton(choiceElement);
            });
        // If the activity calls for it, shuffle the buttons
        activityContext.pageElement
            .querySelectorAll(".player-shuffle-buttons")
            .forEach((container: HTMLElement) => {
                this.shuffleChildren(container);
            });
    }
    private shuffleChildren(container: HTMLElement) {
        // because sort is supposed to get the same answer every time, we
        // are doing the randomizing ahead, before the sort.
        Array.from(container.childNodes)
            .map(node => ({ node, randomValue: Math.random() }))
            .sort((a, b) => a.randomValue - b.randomValue)
            .forEach(({ node }) => container.appendChild(node));
    }

    private replaceWithButton(element: HTMLElement): HTMLButtonElement {
        let button = element.ownerDocument!.createElement("button");
        for (const attr of Array.prototype.slice.call(element.attributes)) {
            button.setAttribute(attr.name, attr.value);
        }
        button.innerHTML = element.innerHTML;
        element.replaceWith(button);
        return button;
    }

    // The context removes event listeners each time the page is shown, so we have to put them back.
    private prepareToDisplayActivityEachTime(activityContext: ActivityContext) {
        activityContext.pageElement
            .querySelectorAll(".player-button")
            .forEach((button: HTMLButtonElement) => {
                const correct =
                    button.getAttribute("data-activityRole") ===
                    "correct-answer";

                activityContext.addEventListener(
                    "click",
                    button,
                    correct ? this.onCorrectClick : this.onWrongClick
                );
            });
    }
    private onCorrectClick = (evt: Event) => {
        (evt.currentTarget as HTMLElement).classList.add("chosen-correct");
        this.activityContext.playCorrect();
        this.activityContext.reportScore(
            1 /*total possible on page*/,
            1 /*score*/
        );
    };

    private onWrongClick = (evt: Event) => {
        (evt.currentTarget as HTMLElement).classList.add("chosen-wrong");
        this.activityContext.playWrong();
        this.activityContext.reportScore(
            1 /*total possible on page*/,
            0 /*score*/
        );
    };

    // When our page is not the selected one, the bloom-player calls this.
    // It will also tell our context to stop, which will disconnect the listeners we registered with it
    public stop() {}
}

export function activityRequirements() {
    return {
        dragging: true, // we don't actually use dragging, but we are getting accidental drags... maybe the swiper needs to be less sensitive
        clicking: true, // enhance: maybe when we say we have clicking, the swiper then becomes less sensitive?
        typing: false
    };
}
