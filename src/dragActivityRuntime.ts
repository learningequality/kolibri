// This is the code that is shared between the Play tab of the bloom games
// (also known as drag activities) and bloom-player.
// It wants to live in the dragActivity folder because it is specific to drag activities.
// However, it also wants to live in the same place relative to narration.ts both in
// bloom player and bloom desktop. For now that's a stronger requirement.
// For now, in Bloom desktop, this file is only used in the Play tab of drag activities,
// so both live there. In Bloom player, both live in the root src directory.
// In the long run, the answer is probably a folder, or even an npm package, for all
// the stuff that the two programs share...or maybe we can make bloom player publish
// these files along with the output bundle and have bloom desktop use them from there.
// For now, though, it's much easier to just edit them and have them built automatically
// than to have this code in another repo.

import {
    kAudioSentence,
    playAllAudio,
    playAllVideo,
    urlPrefix
} from "./narration";

let targetPositions: {
    x: number;
    y: number;
    width: number;
    height: number;
}[] = [];
let originalPositions = new Map<HTMLElement, { x: number; y: number }>();
let currentPage: HTMLElement | undefined;
// Action to invoke if the user clicks a change page button.
// Our latest templates don't have their own change page buttons, just encourage the user
// to leave room for the player to add them.
let currentChangePageAction: (next: boolean) => void | undefined;
let positionsToRestore: { x: string; y: string; elt: HTMLElement }[] = [];

// Save the current positions of all draggables (when entering Play tab, so we can restore them when leaving).
const savePositions = (page: HTMLElement) => {
    positionsToRestore = [];
    page.querySelectorAll("[data-bubble-id]").forEach((elt: HTMLElement) => {
        positionsToRestore.push({
            x: elt.style.left,
            y: elt.style.top,
            elt
        });
    });
};
// Restore the positions saved by savePositions (when leaving the Play tab, or leaving this page altogether
// after being in that tab).
const restorePositions = () => {
    positionsToRestore.forEach(p => {
        p.elt.style.left = p.x;
        p.elt.style.top = p.y;
    });
    // In case we do more editing after leaving the Play tab, we don't want to restore the same positions again
    // if we leave the page completely.
    positionsToRestore = [];
};

// Function to call to get everything ready for playing the game.
// Things that get done here should usually be undone in undoPrepareActivity.
export function prepareActivity(
    page: HTMLElement,
    // Possibly obsolete: an action to take when the user clicks a change page button.
    // Current plan is to just let BP add its own change page buttons.
    changePageAction: (next: boolean) => void
) {
    currentPage = page;
    currentChangePageAction = changePageAction;
    doShowAnswersInTargets(
        page.getAttribute("data-show-answers-in-targets") === "true",
        page
    );
    // not sure we need this in BP, but definitely for when Bloom desktop goes to another tab.
    savePositions(page);

    // Set up event listeners for any change page buttons.
    const changePageButtons = Array.from(
        page.getElementsByClassName("bloom-change-page-button")
    );
    changePageButtons.forEach(b =>
        b.addEventListener("click", changePageButtonClicked)
    );

    // Hide image titles, which might give too much away, or distract.
    Array.from(document.getElementsByClassName("bloom-imageContainer")).forEach(
        container => {
            (container as HTMLElement).title = "";
        }
    );

    // By default, a shadow of any image can be dragged (e.g., to a paint program).
    // We want only dragging that is part of the game to be possible.
    Array.from(page.getElementsByTagName("img")).forEach((img: HTMLElement) => {
        img.setAttribute("draggable", "false");
    });

    // Record the positions of targets as snap locations and the original positions of draggables.
    // Add event listeners to draggables to start dragging.
    targetPositions = [];
    originalPositions = new Map<HTMLElement, { x: number; y: number }>();
    const draggables = Array.from(page.querySelectorAll("[data-bubble-id]"));
    const targets: HTMLElement[] = [];
    draggables.forEach((elt: HTMLElement) => {
        const targetId = elt.getAttribute("data-bubble-id");
        const target = page.querySelector(
            `[data-target-of="${targetId}"]`
        ) as HTMLElement;
        if (target) {
            const x = target.offsetLeft;
            const y = target.offsetTop;
            targetPositions.push({
                x,
                y,
                width: target.offsetWidth,
                height: target.offsetHeight
            });
            targets.push(target);
        }
        // if it has data-bubble-id, it should be draggable, just not needed
        // for the right answer.
        originalPositions.set(elt, { x: elt.offsetLeft, y: elt.offsetTop });
        elt.addEventListener("pointerdown", startDrag, { capture: true });
    });

    const videos = Array.from(page.getElementsByTagName("video"));
    videos.forEach(video => {
        video.addEventListener("pointerdown", playVideo);
        if (
            video
                .closest(".bloom-textOverPicture")
                ?.hasAttribute("data-bubble-id")
        ) {
            // don't want to show controls on these, because they are typically too small,
            // and the play time is short enough that just click-to-play is fine
            video.classList.add("bloom-ui-no-controls");
        }
    });

    // Add event listeners to (other) text items that should play audio when clicked.
    const dontPlayWhenClicked = draggables.concat(targets);
    const otherTextItems = Array.from(
        page.getElementsByClassName("bloom-visibility-code-on")
    ).filter(e => {
        var top = e.closest(".bloom-textOverPicture") as HTMLElement;
        if (!top) {
            // don't think this can happen with current game templates,
            // but if there's some other text on the page, may as well play when clicked
            // if it can.
            return true;
        }
        // draggables play as well as doing more complex things when clicked.
        // targets don't need to play.
        return dontPlayWhenClicked.indexOf(top) < 0;
    });
    otherTextItems.forEach(e => {
        e.addEventListener("pointerdown", playAudioOfTarget);
    });

    // Add event listeners to check, try again, and show correct buttons.
    const checkButtons = Array.from(
        page.getElementsByClassName("check-button")
    );
    const tryAgainButtons = Array.from(
        page.getElementsByClassName("try-again-button")
    );
    const showCorrectButtons = Array.from(
        page.getElementsByClassName("show-correct-button")
    );

    checkButtons.forEach((elt: HTMLElement) => {
        elt.addEventListener("click", performCheck);
    });
    tryAgainButtons.forEach((elt: HTMLElement) => {
        elt.addEventListener("click", performTryAgain);
    });
    showCorrectButtons.forEach((elt: HTMLElement) => {
        elt.addEventListener("click", showCorrect);
    });

    const soundItems = Array.from(page.querySelectorAll("[data-sound]"));
    soundItems.forEach((elt: HTMLElement) => {
        elt.addEventListener("click", playSoundOf);
    });

    prepareOrderSentenceActivity(page);

    // Slider:     // for drag-word-chooser-slider
    //     setupWordChooserSlider(page);
    //     setSlideablesVisibility(page, false);
    // // We may not want to immediately play the first word, because we may want to play some
    // // other stuff first. So we call this (before playInitialElements, so the word is given
    // // the bloom-activeTextBox class) but tell it not to play.
    // // The element with bloom-activeTextBox is put into the list of things that playInitialElements
    // // will play, after everything else that should happen initially.

    //     showARandomWord(page, false);
    //     setupSliderImageEvents(page);
}

// Break any order-sentence element into words and
// randomize word order in sentence for reader to sort
const prepareOrderSentenceActivity = (page: HTMLElement) => {
    Array.from(page.getElementsByClassName("drag-item-order-sentence")).forEach(
        (elt: HTMLElement) => {
            const contentElt = elt.getElementsByClassName(
                "bloom-content1"
            )[0] as HTMLElement;
            const content = contentElt?.textContent?.trim();
            if (!content) return;
            const words = content.split(" ");
            const shuffledWords = shuffle(words);
            const container = page.ownerDocument.createElement("div");
            container.classList.add("drag-item-random-sentence");
            container.setAttribute("data-answer", content);
            makeWordItems(page, shuffledWords, container, contentElt, true);
            container.style.left = elt.style.left;
            container.style.top = elt.style.top;
            container.style.width =
                elt.parentElement!.offsetWidth - elt.offsetLeft - 10 + "px";
            // Enhance: limit width somehow so it does not collide with other elements?
            // Maybe now we tweaked word padding to make the original sentence take up more
            // space, we could use its own width?
            elt.parentElement?.insertBefore(container, elt);
        }
    );
};

const playVideo = (e: MouseEvent) => {
    const video = e.currentTarget as HTMLVideoElement;
    video.play();
};

// Cleans up whatever prepareACtivity() did, especially when switching to another tab.
// May also be useful to do when switching pages in player. If not, we may want to move
// this out of this runtime file; but it's nice to keep it with prepareActivity.
export function undoPrepareActivity(page: HTMLElement) {
    restorePositions();
    const changePageButtons = Array.from(
        page.getElementsByClassName("bloom-change-page-button")
    );
    changePageButtons.forEach(b =>
        b.removeEventListener("click", changePageButtonClicked)
    );

    Array.from(page.getElementsByClassName("bloom-visibility-code-on")).forEach(
        e => {
            e.removeEventListener("pointerdown", playAudioOfTarget);
        }
    );

    page.querySelectorAll("[data-bubble-id]").forEach((elt: HTMLElement) => {
        elt.removeEventListener("pointerdown", startDrag, { capture: true });
    });

    Array.from(page.getElementsByTagName("img")).forEach((img: HTMLElement) => {
        img.removeAttribute("draggable");
    });

    const videos = Array.from(page.getElementsByTagName("video"));
    videos.forEach(video => {
        video.removeEventListener("pointerdown", playVideo);
        video.classList.remove("bloom-ui-no-controls");
    });
    const checkButtons = Array.from(
        page.getElementsByClassName("check-button")
    );
    const tryAgainButtons = Array.from(
        page.getElementsByClassName("try-again-button")
    );
    const showCorrectButtons = Array.from(
        page.getElementsByClassName("show-correct-button")
    );

    checkButtons.forEach((elt: HTMLElement) => {
        elt.removeEventListener("click", performCheck);
    });
    showCorrectButtons.forEach((elt: HTMLElement) => {
        elt.removeEventListener("click", showCorrect);
    });
    tryAgainButtons.forEach((elt: HTMLElement) => {
        elt.removeEventListener("click", performTryAgain);
    });

    // In Bloom Player, this will have been done by other play code, since data-sound is not
    // specfic to games. But we're adding a listener for the same function, so it doesn't matter.
    // In Bloom desktop, we need this to make cliking data-sound elements work in Play mode.
    const soundItems = Array.from(page.querySelectorAll("[data-sound]"));
    soundItems.forEach((elt: HTMLElement) => {
        elt.removeEventListener("click", playSoundOf);
    });

    Array.from(
        page.getElementsByClassName("drag-item-random-sentence")
    ).forEach((elt: HTMLElement) => {
        elt.parentElement?.removeChild(elt);
    });
    doShowAnswersInTargets(true, page);
    //Slider: setSlideablesVisibility(page, true);
    // Array.from(page.getElementsByTagName("img")).forEach((img: HTMLElement) => {
    //     img.removeEventListener("click", clickSliderImage);
    // });
}

export const playSoundOf = (e: MouseEvent) => {
    const elt = e.currentTarget as HTMLElement;
    const soundFile = elt.getAttribute("data-sound");
    if (soundFile) {
        playSound(elt, soundFile);
    }
    // Not needed in Play tab, but in Bloom Player, the click would otherwise cause
    // a toggle between full screen and showing toolbars.
    e.preventDefault();
    e.stopPropagation();
};

const playAudioOfTarget = (e: PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    playAudioOf(target);
};

const playAudioOf = (element: HTMLElement) => {
    const possibleElements = getVisibleEditables(element);
    const playables = getAudioSentences(possibleElements);
    playAllAudio(playables, element.closest(".bloom-page") as HTMLElement);
};

function makeWordItems(
    page: HTMLElement,
    words: string[],
    container: HTMLElement,
    // Something that has the right user-defined style class to apply to the words.
    // May be a bloom-content1 child of the original sentence, or a word item
    // previously created by this function.
    contentElt: HTMLElement,
    // Should the reader be able to drag the words? Not when we're using this
    // to show the correct answer.
    makeDraggable: boolean
) {
    const userStyle =
        Array.from(contentElt?.classList)?.find(c => c.endsWith("-style")) ??
        "Normal-style";
    words.forEach(word => {
        const wordItem = page.ownerDocument.createElement("div");
        wordItem.classList.add("drag-item-order-word");
        wordItem.textContent = word;
        container.appendChild(wordItem);
        wordItem.classList.add(userStyle);
        if (makeDraggable) {
            wordItem.addEventListener("pointerdown", startDragWordInSentence);
        }
    });
}

function changePageButtonClicked(e: MouseEvent) {
    const next = (e.currentTarget as HTMLElement).classList.contains(
        "bloom-next-page"
    );
    currentChangePageAction?.(next);
}

export function playInitialElements(page: HTMLElement) {
    const initialFilter = e => {
        const top = e.closest(".bloom-textOverPicture") as HTMLElement;
        if (!top) {
            // not an overlay at all. (Note that all overlays have this class, including
            // video and image overlays.) Maybe not possible in a drag-activity, but just in case
            return false;
        }
        if (top.classList.contains("draggable-text")) {
            return false; // draggable items are played only when clicked
        }
        if (top.hasAttribute("data-bubble-id")) {
            return false; // another indication of a draggable item; in fact, the one above might be obsolete
        }
        if (top.classList.contains("drag-item-order-sentence")) {
            return false; // This would give away the answer
        }
        if (top.classList.contains("bloom-wordChoice")) {
            return false; // Only one of these should be played, after any instructions
        }
        // This might be redundant since they are not visible, but just in case
        if (
            top.classList.contains("drag-item-correct") ||
            top.classList.contains("drag-item-wrong")
        ) {
            return false; // These are only played after they become visible
        }
        return true;
    };
    const videoElements = Array.from(page.getElementsByTagName("video")).filter(
        initialFilter
    );
    const audioElements = getVisibleEditables(page).filter(initialFilter);

    //Slider: // This is used in drag-word-chooser-slider to mark the text item the user is currently
    // // finding a matching image for. In that activity, it should be played last (after
    // // the instructions.)
    // const activeTextBox = page.getElementsByClassName(
    //     "bloom-activeTextBox"
    // )[0] as HTMLElement;
    // if (activeTextBox) {
    //     audioElements.push(activeTextBox);
    // }
    const playables = getAudioSentences(audioElements);
    playAllVideo(videoElements, () => playAllAudio(playables, page));
}

function getAudioSentences(editables: HTMLElement[]) {
    // Could be done more cleanly with flatMap or flat() but not ready to switch to es2019 yet.
    const result: HTMLElement[] = [];
    editables.forEach(e => {
        if (e.classList.contains(kAudioSentence)) {
            result.push(e);
        }
        result.push(
            ...(Array.from(
                e.getElementsByClassName(kAudioSentence)
            ) as HTMLElement[])
        );
    });
    return result;
}

function getVisibleEditables(container: HTMLElement) {
    // We want to play any audio we have from divs the user can see.
    // This is a crude test, but currently we always use display:none to hide unwanted languages.
    const result = Array.from(
        container.getElementsByClassName("bloom-editable")
    ).filter(
        e => window.getComputedStyle(e).display !== "none"
    ) as HTMLElement[];
    if (
        container.classList.contains("bloom-editable") &&
        window.getComputedStyle(container).display !== "none"
    ) {
        result.push(container);
    }
    return result;
}

function shuffle<T>(array: T[]): T[] {
    // review: something Copliot came up with. Is it guaranteed to be sufficiently different
    // from the correct answer?
    let currentIndex = array.length,
        randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex]
        ];
    }
    return array;
}

// Put the page into the mode that shows the correct answers.
const showCorrect = (e: MouseEvent) => {
    if (!currentPage) {
        return; // huh?? but makes TS happy
    }
    currentPage
        .querySelectorAll("[data-bubble-id]")
        .forEach((elt: HTMLElement) => {
            const targetId = elt.getAttribute("data-bubble-id");
            const target = currentPage?.querySelector(
                `[data-target-of="${targetId}"]`
            ) as HTMLElement;
            if (!target) {
                return; // this one is not required to be in a right place
            }
            const x =
                target.offsetLeft + (target.offsetWidth - elt.offsetWidth) / 2;
            const y =
                target.offsetTop + (target.offsetHeight - elt.offsetHeight) / 2;
            elt.style.left = x + "px";
            elt.style.top = y + "px";
        });
    Array.from(
        currentPage.getElementsByClassName("drag-item-random-sentence")
    ).forEach((container: HTMLElement) => {
        const correctAnswer =
            container.getAttribute("data-answer")?.split(" ") ?? [];
        const userStyleSource = container.children[0] as HTMLElement; // before we wipe them!
        container.innerHTML = "";
        makeWordItems(
            currentPage!,
            correctAnswer,
            container,
            userStyleSource,
            false
        );
    });
    classSetter(currentPage!, "drag-activity-wrong", false);
    classSetter(currentPage!, "drag-activity-solution", true);
};

// where the mouse started the drag, relative to the top left of dragTarget
let dragStartX = 0;
let dragStartY = 0;
let dragTarget: HTMLElement;
let snapped = false;

// Bloom desktop has a function getScale, but we do NOT want to use that here
// because it is not available in Bloom Reader and we don't want to add a dependency.
// So we define our own.
const getScale = (page: HTMLElement) =>
    page.getBoundingClientRect().width / page.offsetWidth;

const startDrag = (e: PointerEvent) => {
    if (e.button !== 0) return; // only left button
    if (e.ctrlKey) return; // ignore ctrl+click
    e.preventDefault(); // e.g., don't do default drag of child image
    const target = e.currentTarget as HTMLElement;
    dragTarget = target;
    const page = target.closest(".bloom-page") as HTMLElement;
    const scale = getScale(page);
    // get the mouse cursor position at startup relative to the top left.
    dragStartX = e.clientX / scale - target.offsetLeft;
    dragStartY = e.clientY / scale - target.offsetTop;
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointerup", stopDrag);
    target.addEventListener("pointermove", elementDrag);
    playAudioOf(target);
    target.classList.add("bloom-ui-dragging");
};

const elementDrag = (e: PointerEvent) => {
    const page = dragTarget.closest(".bloom-page") as HTMLElement;
    const scale = getScale(page);
    e.preventDefault();
    let x = e.clientX / scale - dragStartX;
    let y = e.clientY / scale - dragStartY;
    let deltaMin = Number.MAX_VALUE;
    snapped = false;
    let xBest = x;
    let yBest = y;
    for (const slot of targetPositions) {
        const offsetX = (slot.width - dragTarget.offsetWidth) / 2;
        const offsetY = (slot.height - dragTarget.offsetHeight) / 2;
        // if this target were centered in this slot, it would be at slot.x + offsetX, slot.y + offsetY
        const deltaX = slot.x + offsetX - x;
        const deltaY = slot.y + offsetY - y;
        const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (delta < deltaMin) {
            deltaMin = delta;
            xBest = slot.x + offsetX;
            yBest = slot.y + offsetY;
        }
    }
    if (deltaMin < 50) {
        // review: how close do we want?
        x = xBest;
        y = yBest;
        snapped = true;
    }
    dragTarget.style.top = y + "px";
    dragTarget.style.left = x + "px";
};

const stopDrag = (e: PointerEvent) => {
    // If they let go at a place that isn't a snap position at all, put it back where it was.
    if (!snapped) {
        const oldPosition = originalPositions.get(dragTarget);
        dragTarget.style.top = oldPosition?.y + "px";
        dragTarget.style.left = oldPosition?.x + "px";
    }
    dragTarget.classList.remove("bloom-ui-dragging");
    dragTarget.removeEventListener("pointerup", stopDrag);
    dragTarget.removeEventListener("pointermove", elementDrag);

    // If there was already a draggable in that slot, move the one we are replacing
    // back to its original position.
    // Enhance: animate?
    const page = dragTarget.closest(".bloom-page") as HTMLElement;
    const draggables = Array.from(page.querySelectorAll("[data-bubble-id]"));
    draggables.forEach((elt: HTMLElement) => {
        if (elt === dragTarget) {
            return;
        }
        if (rightPosition(elt, dragTarget)) {
            const originalPosition = originalPositions.get(elt);
            if (originalPosition) {
                elt.style.left = originalPosition.x + "px";
                elt.style.top = originalPosition.y + "px";
            }
        }
    });
};

const getVisibleText = (elt: HTMLElement): string => {
    const visibleDivs = getVisibleEditables(elt);
    return Array.from(visibleDivs)
        .map((elt: HTMLElement) => elt.textContent)
        .join(" ");
};

const rightPosition = (draggableToCheck: HTMLElement, target: HTMLElement) => {
    const actualX = draggableToCheck.offsetLeft;
    const actualY = draggableToCheck.offsetTop;
    const correctX =
        target.offsetLeft +
        (target.offsetWidth - draggableToCheck.offsetWidth) / 2;
    const correctY =
        target.offsetTop +
        (target.offsetHeight - draggableToCheck.offsetHeight) / 2;
    return (
        // At least a half-pixel error can occur just from centering the draggable in the target.
        Math.abs(correctX - actualX) < 0.6 && Math.abs(correctY - actualY) < 0.6
    );
};

export const performCheck = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const page = target.closest(".bloom-page") as HTMLElement;
    const allCorrect = checkDraggables(page) && checkRandomSentences(page);

    showCorrectOrWrongItems(page, allCorrect);

    return allCorrect;
};

export const performTryAgain = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const page = target.closest(".bloom-page") as HTMLElement;
    classSetter(page, "drag-activity-correct", false);
    classSetter(page, "drag-activity-wrong", false);
    //currently I don't think it could be set here, but make sure.
    classSetter(page, "drag-activity-solution", false);
};

export const classSetter = (
    page: HTMLElement,
    className: string,
    wanted: boolean
) => {
    if (wanted) {
        page.parentElement?.classList.add(className);
    } else {
        page.parentElement?.classList.remove(className);
    }
};

let draggableReposition: HTMLElement;
let wordBeingRepositioned: HTMLElement;
function showCorrectOrWrongItems(page: HTMLElement, correct: boolean) {
    classSetter(page, "drag-activity-correct", correct);
    classSetter(page, "drag-activity-wrong", !correct);

    // play sound
    const soundFile = page.getAttribute(
        correct ? "data-correct-sound" : "data-wrong-sound"
    );
    const playOtherStuff = () => {
        const elementsMadeVisible = Array.from(
            page.getElementsByClassName(
                correct ? "drag-item-correct" : "drag-item-wrong"
            )
        ) as HTMLElement[];
        const possibleNarrationElements: HTMLElement[] = [];
        const videoElements: HTMLVideoElement[] = [];
        elementsMadeVisible.forEach(e => {
            possibleNarrationElements.push(...getVisibleEditables(e));
            videoElements.push(...Array.from(e.getElementsByTagName("video")));
        });
        const playables = getAudioSentences(possibleNarrationElements);
        playAllVideo(videoElements, () => playAllAudio(playables, page));
    };
    if (soundFile) {
        playSound(page, soundFile);
    } else {
        playOtherStuff();
    }
}

function playSound(someElt: HTMLElement, soundFile: string) {
    const audio = new Audio(urlPrefix() + "/audio/" + soundFile);
    audio.style.visibility = "hidden";
    // To my surprise, in BP storybook it works without adding the audio to any document.
    // But in Bloom proper, it does not. I think it is because this code is part of the toolbox,
    // so the audio element doesn't have the right context to interpret the relative URL.
    someElt.append(audio);
    audio.play();
    // It feels cleaner if we remove it when done. This could fail, e.g., if the user
    // switches tabs or pages before we get done playing. Removing it immediately
    // prevents the sound being played. It's not a big deal if it doesn't get removed.
    audio.addEventListener(
        "ended",
        () => {
            someElt.removeChild(audio);
        },
        { once: true }
    );
}

function checkDraggables(page: HTMLElement) {
    let allCorrect = true;
    const draggables = Array.from(page.querySelectorAll("[data-bubble-id]"));
    draggables.forEach((draggableToCheck: HTMLElement) => {
        const targetId = draggableToCheck.getAttribute("data-bubble-id");
        const target = page.querySelector(
            `[data-target-of="${targetId}"]`
        ) as HTMLElement;
        if (!target) {
            // this one is not required to be in a right place.
            // Possibly we might one day need to check that it has NOT been dragged to a target.
            // But for now, we only allow one draggable per target, so if this has been wrongly
            // used some other one will not be in the right place.
            return;
        }

        if (!rightPosition(draggableToCheck, target)) {
            // It's not in the expected place. But perhaps one with the same text is?
            // This only applies if it's a text item.
            // (don't use getElementsByClassName here...there could be a TG on an image description of
            // a picture. To be a text item it must have a direct child that is a TG.)
            if (
                !Array.from(draggableToCheck.children).some(x =>
                    x.classList.contains("bloom-translationGroup")
                )
            ) {
                // not a text item. Two images or videos with the same (empty) text are not equivalent.
                allCorrect = false;
                return;
            }
            const visibleText = getVisibleText(draggableToCheck);
            if (
                !draggables.some((otherDraggable: HTMLElement) => {
                    if (otherDraggable === draggableToCheck) {
                        return false; // already know this draggable is not at the right place
                    }
                    if (getVisibleText(otherDraggable) !== visibleText) {
                        return false; // only interested in ones with the same text
                    }
                    return rightPosition(otherDraggable, target);
                })
            ) {
                allCorrect = false;
            }
        }
    });
    return allCorrect;
}

let placeHolder: HTMLElement | undefined;
let startWidth = 0;
const draggableWordMargin = 5; // enhance: compute from element

function startDragWordInSentence(e: PointerEvent) {
    if (e.button !== 0) return; // only left button
    if (e.ctrlKey) return; // ignore ctrl+click

    // get the pointer position etc. at startup:
    wordBeingRepositioned = e.currentTarget as HTMLElement;
    startWidth = wordBeingRepositioned.offsetWidth; // includes original padding but not margin
    const page = wordBeingRepositioned.closest(".bloom-page") as HTMLElement;
    const scale = getScale(page);
    dragStartX = e.clientX / scale - wordBeingRepositioned.offsetLeft;
    dragStartY = e.clientY / scale - wordBeingRepositioned.offsetTop;

    // Leave the original where it was and make a copy to drag around.
    draggableReposition = wordBeingRepositioned.ownerDocument.createElement(
        "div"
    );
    wordBeingRepositioned.classList.forEach(c =>
        draggableReposition.classList.add(c)
    );
    //draggableReposition.classList.add("drag-item-order-word");
    draggableReposition.textContent = wordBeingRepositioned.textContent;
    draggableReposition.style.position = "absolute";
    draggableReposition.style.left = wordBeingRepositioned.offsetLeft + "px";
    draggableReposition.style.top = wordBeingRepositioned.offsetTop + "px";
    // We don't want it to show while we're dragging the clone. We need something to take up the space,
    // though, until we decide it has moved. We could mess with its own properties, but then we have
    // to put everything back. Also, we want to move it in the paragraph, and if we move the thing
    // itself, we seem to lose our mouse capture. So we make a placeholder to take up the space.
    placeHolder = makeAnimationPlaceholder(wordBeingRepositioned);
    // don't add padding here, target still has it. Capture this before we hide it.
    placeHolder.style.width = startWidth + draggableWordMargin + "px";
    wordBeingRepositioned.parentElement?.insertBefore(
        placeHolder,
        wordBeingRepositioned
    );
    wordBeingRepositioned.style.display = "none";

    // It's bizarre to put the listeners and pointer capture on the target, which is NOT being dragged,
    // rather than the draggableReposition, which is. But it doesn't work to setPointerCapture on
    // the draggableReposition. I think it's because the draggableReposition is not the object clicked.
    // And once the mouse events are captured by the target, all mouse events go to that, so we get
    // them properly while dragging, and can use them to move the draggableReposition.
    wordBeingRepositioned.setPointerCapture(e.pointerId);
    wordBeingRepositioned.addEventListener("pointerup", stopDragWordInSentence);
    wordBeingRepositioned.addEventListener("pointermove", dragWordInSentence);
    // not sure we need this.
    // recommended by https://www.redblobgames.com/making-of/draggable/ to prevent touch movement
    // dragging the page behind the draggable element.
    wordBeingRepositioned.addEventListener("touchstart", preventTouchDefault);
    wordBeingRepositioned.parentElement?.appendChild(draggableReposition);
}

const preventTouchDefault = (e: TouchEvent) => {
    e.preventDefault();
};

let lastItemDraggedOver: HTMLElement | undefined;

const dragWordInSentence = (e: PointerEvent) => {
    const page = draggableReposition.closest(".bloom-page") as HTMLElement;
    const scale = getScale(page);
    e.preventDefault();
    const x = e.clientX / scale - dragStartX;
    const y = e.clientY / scale - dragStartY;

    draggableReposition.style.top = y + "px";
    draggableReposition.style.left = x + "px";

    if (animationInProgress) {
        return;
    }
    const container = wordBeingRepositioned.parentElement!;
    const itemDraggedOver = Array.from(container.children).find(c => {
        const rect = c.getBoundingClientRect();
        return (
            c !== wordBeingRepositioned &&
            c !== placeHolder &&
            c !== draggableReposition &&
            e.clientX > rect.left &&
            e.clientX < rect.right &&
            e.clientY > rect.top &&
            e.clientY < rect.bottom
        );
    });

    // If we don't check for a different item, then when we drag a short word over a long one, the mouse
    // may still be over the long word when the animation finishes, at which point it unhelpfully moves
    // back.
    if (itemDraggedOver && itemDraggedOver !== lastItemDraggedOver) {
        const children = Array.from(container.children);
        if (
            children.indexOf(itemDraggedOver) > children.indexOf(placeHolder!)
        ) {
            // moving right; it wants to go after the thing we dragged onto.
            // (It's OK if nextSibling is null; gets inserted at end, which is what we want.)
            animateMove(() => {
                container.insertBefore(
                    placeHolder!,
                    itemDraggedOver.nextSibling
                );
            });
        } else {
            // moving left; it wants to go before the thing we dragged onto.
            animateMove(() => {
                container.insertBefore(placeHolder!, itemDraggedOver);
            });
        }
    } else {
        // moved outside the sentence altogether. If we're below or to the right of the last item,
        // move to the end. Enhance: should we move to the front if we're above or to the left?
        const relatedItems = Array.from(
            wordBeingRepositioned.parentElement!.getElementsByClassName(
                "drag-item-order-word"
            )
        ).filter(
            x =>
                x !== wordBeingRepositioned &&
                x !== placeHolder &&
                x !== draggableReposition
        ) as HTMLElement[];
        const lastItem = relatedItems[relatedItems.length - 1];
        const bounds = lastItem.getBoundingClientRect();
        if (
            e.clientY > bounds.bottom ||
            (e.clientX > bounds.right && e.clientY > bounds.top)
        ) {
            animateMove(() => {
                container.appendChild(placeHolder!);
            });
        }
    }
    lastItemDraggedOver = itemDraggedOver as HTMLElement;
};

const stopDragWordInSentence = (e: PointerEvent) => {
    e.preventDefault();
    wordBeingRepositioned.style.visibility = "visible";
    wordBeingRepositioned.removeEventListener(
        "pointerup",
        stopDragWordInSentence
    );
    wordBeingRepositioned.removeEventListener(
        "pointermove",
        dragWordInSentence
    );
    wordBeingRepositioned.releasePointerCapture(e.pointerId); // redundant I think
    wordBeingRepositioned.removeEventListener(
        "touchstart",
        preventTouchDefault
    );
    // We're getting rid of this, so we don't need to remove the event handlers it has.
    draggableReposition.parentElement?.removeChild(draggableReposition);

    wordBeingRepositioned.parentElement?.insertBefore(
        wordBeingRepositioned,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        placeHolder!
    );
    wordBeingRepositioned.parentElement?.removeChild(placeHolder!);
    placeHolder = undefined;
    wordBeingRepositioned.style.display = ""; // show it again
};

function makeAnimationPlaceholder(itemBeingRepositioned: HTMLElement) {
    const placeholder = itemBeingRepositioned.cloneNode(true) as HTMLElement;
    placeholder.style.overflowX = "hidden";
    placeholder.style.marginRight = "0"; // clear all these so it can shrink to taking up no space at all.
    placeholder.style.paddingLeft = "0";
    placeholder.style.paddingRight = "0";
    placeholder.style.display = ""; // in case it was display:none
    placeholder.style.visibility = "hidden"; //just takes up space for animation
    return placeholder;
}

let animationInProgress = false;

function animateMove(movePlaceholder: () => void) {
    animationInProgress = true;
    const duration = 200;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const container = wordBeingRepositioned.parentElement!;
    const duplicate = makeAnimationPlaceholder(wordBeingRepositioned);
    container.insertBefore(duplicate, placeHolder!);
    movePlaceholder();
    const start = Date.now();

    const step = () => {
        const elapsed = Date.now() - start;
        const fraction = Math.min(elapsed / duration, 1);
        // This width includes the original padding and margin, so that it takes up the original space
        // to begin with, but can drop to zero.
        const originalWordWidth = startWidth + draggableWordMargin;
        if (!placeHolder) {
            // terminated by mouseUp
            container.removeChild(duplicate);
            animationInProgress = false;
            return;
        }
        placeHolder.style.width = originalWordWidth * fraction + "px";
        duplicate.style.width = originalWordWidth * (1 - fraction) + "px";
        if (fraction < 1) {
            requestAnimationFrame(step);
        } else {
            // animation is over, clean up.
            container.removeChild(duplicate);
            placeHolder.style.width = originalWordWidth + "px"; // previous step might not have reached full size
            animationInProgress = false;
        }
    };
    requestAnimationFrame(step);
}
function checkRandomSentences(page: HTMLElement) {
    const sentences = page.getElementsByClassName("drag-item-random-sentence");
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        // We check the expected text rather than the expected order of the child
        // elements, because it automatically handles the possibility of repeated words.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const correctAnswerWords = sentence
            .getAttribute("data-answer")!
            .split(" ");
        const actualWordElements = Array.from(sentence.children);
        for (let j = 0; j < actualWordElements.length; j++) {
            const item = actualWordElements[j];
            if (item.textContent !== correctAnswerWords[j]) {
                return false;
            }
        }
    }
    return true;
}

export const doShowAnswersInTargets = (showNow: boolean, page: HTMLElement) => {
    const draggables = Array.from(page.querySelectorAll("[data-bubble-id]"));
    if (showNow) {
        draggables.forEach(draggable => {
            copyContentToTarget(draggable as HTMLElement);
        });
    } else {
        draggables.forEach(draggable => {
            removeContentFromTarget(draggable as HTMLElement);
        });
    }
};

export function copyContentToTarget(draggable: HTMLElement) {
    const target = getTarget(draggable);
    if (!target) {
        return;
    }
    // We want to copy the content of the draggable, with several exceptions.
    // To reduce flicker, we do the manipulations on a temporary element, and
    // only copy into the actual target if there is actually a change.
    // (Flicker is particularly likely with changes that don't affect the
    // target, like adding and removing the image editing buttons.)
    let throwAway = target.ownerDocument.createElement("div");
    throwAway.innerHTML = draggable.innerHTML;

    // Don't need the bubble controls
    Array.from(throwAway.getElementsByClassName("bloom-ui")).forEach(e => {
        e.remove();
    });
    // Nor the image editing controls.
    Array.from(throwAway.getElementsByClassName("imageOverlayButton")).forEach(
        e => {
            e.remove();
        }
    );
    Array.from(throwAway.getElementsByClassName("imageButton")).forEach(e => {
        e.remove();
    });
    // Bloom has integrity checks for duplicate ids, and we don't need them in the duplicate content.
    Array.from(throwAway.querySelectorAll("[id]")).forEach(e => {
        e.removeAttribute("id");
    });
    Array.from(throwAway.getElementsByClassName("hoverUp")).forEach(e => {
        // Produces at least a change in background color that we don't want.
        e.classList.remove("hoverUp");
    });
    // Content is not editable inside the target.
    Array.from(throwAway.querySelectorAll("[contenteditable]")).forEach(e => {
        e.removeAttribute("contenteditable");
    });
    // Nor should we able to tab to it, or focus it.
    Array.from(throwAway.querySelectorAll("[tabindex]")).forEach(e => {
        e.removeAttribute("tabindex");
    });
    const imageContainer = throwAway.getElementsByClassName(
        "bloom-imageContainer"
    )[0] as HTMLElement;
    if (imageContainer) {
        // We need another layer to manage clipping and centering. The one we were going to
        // throw away becomes the wrapper, and we add a new throwAway outside it
        const wrapper = throwAway;
        throwAway = target.ownerDocument.createElement("div");
        throwAway.appendChild(wrapper);
        wrapper.classList.add("bloom-targetWrapper");
        // We need the image container size to match the draggable size so that we get the
        // same cropping.
        imageContainer.style.width = draggable.style.width;
        imageContainer.style.height = draggable.style.height;
    }
    if (target.innerHTML !== throwAway.innerHTML) {
        target.innerHTML = throwAway.innerHTML;
    }
}

export const getTarget = (draggable: HTMLElement): HTMLElement | undefined => {
    const targetId = draggable.getAttribute("data-bubble-id");
    if (!targetId) {
        return undefined;
    }
    return draggable.ownerDocument.querySelector(
        `[data-target-of="${targetId}"]`
    ) as HTMLElement;
};

function removeContentFromTarget(draggable: HTMLElement) {
    const target = getTarget(draggable);
    if (target) {
        target.innerHTML = "";
    }
}

export let draggingSlider = false;

// Setup that is common to Play and design time
export function setupWordChooserSlider(page: HTMLElement) {
    //Slider: const wrapper = page.getElementsByClassName(
    //     "bloom-activity-slider"
    // )[0] as HTMLElement;
    // if (!wrapper) {
    //     return; // panic?
    // }
    // wrapper.innerHTML = ""; // clear out any existing content.
    // const slider = page.ownerDocument.createElement("div");
    // slider.classList.add("bloom-activity-slider-content");
    // slider.style.left = 0 + "px";
    // wrapper.appendChild(slider);
    // dragStartX = 0;
    // const scale = getScale(page);
    // // Review: maybe we should use some sort of fancier slider? This one, for example,
    // // won't have fancy effects like continuing to slide if you flick it.
    // // But it's also possible this is good enough. Not really expecting a lot more items
    // // than will fit.
    // const moveHandler = (e: PointerEvent) => {
    //     let x = e.clientX / scale - dragStartX;
    //     if (Math.abs(x) > 4) {
    //         draggingSlider = true;
    //     }
    //     if (x > 0) {
    //         x = 0;
    //     }
    //     const maxScroll = Math.max(slider.offsetWidth - wrapper.offsetWidth, 0);
    //     if (x < -maxScroll) {
    //         x = -maxScroll;
    //     }
    //     slider.style.left = x + "px";
    // };
    // const upHandler = (e: PointerEvent) => {
    //     slider.removeEventListener("pointermove", moveHandler);
    //     page.ownerDocument.body.removeEventListener("pointerup", upHandler);
    //     setTimeout(() => {
    //         draggingSlider = false;
    //     }, 50);
    // };
    // slider.addEventListener("pointerdown", e => {
    //     if (e.button !== 0) return; // only left button
    //     if (e.ctrlKey) return; // ignore ctrl+click
    //     dragStartX = e.clientX / scale - slider.offsetLeft;
    //     slider.addEventListener("pointermove", moveHandler);
    //     // We'd like to capture the pointer, and then we could put the up handler on the slider.
    //     // But then a click on an image inside the slider never gets the mouse up event, so never
    //     // gets a click. So we put the up handler on the body (so that it will get called even if
    //     // the up happens outside the slider).
    //     //slider.setPointerCapture(e.pointerId);
    //     page.ownerDocument.body.addEventListener("pointerup", upHandler);
    // });
    // const imagesToPlace = shuffle(
    //     Array.from(page.querySelectorAll("[data-img-txt]"))
    // );
    // imagesToPlace.forEach((imgTop: HTMLElement) => {
    //     const img = imgTop.getElementsByTagName("img")[0];
    //     let sliderImgSrc = "";
    //     if (img) {
    //         // An older comment said:
    //         // Not just img.src: that yields a full URL, which will show the image, but will not match
    //         // when we are later trying to find the corresponding original image.
    //         // I'm not finding anything that works that way, and the code below finds a full URL
    //         sliderImgSrc = img.getAttribute("src")!;
    //     } else {
    //         // In bloom-player, for a forgotten and possibly obsolete reason, we use a background image
    //         // on the container. (I vaguely recall it may be important when animating the main image.)
    //         const imgContainer = imgTop.getElementsByClassName(
    //             "bloom-imageContainer"
    //         )[0] as HTMLElement;
    //         if (!imgContainer) {
    //             return; // weird
    //         }
    //         const bgImg = imgContainer.style.backgroundImage;
    //         if (!bgImg) {
    //             return; // weird
    //         }
    //         const start = bgImg.indexOf('"');
    //         const end = bgImg.lastIndexOf('"');
    //         sliderImgSrc = bgImg.substring(start + 1, end);
    //     }
    //     // not using cloneNode here because I don't want to bring along any alt text that might provide a clue
    //     const sliderImg = imgTop.ownerDocument.createElement("img");
    //     sliderImg.src = sliderImgSrc;
    //     sliderImg.ondragstart = () => false;
    //     sliderImg.setAttribute(
    //         "data-img",
    //         imgTop.getAttribute("data-img-txt")!
    //     );
    //     const sliderItem = imgTop.ownerDocument.createElement("div");
    //     sliderItem.classList.add("bloom-activity-slider-item");
    //     sliderItem.appendChild(sliderImg);
    //     slider.appendChild(sliderItem);
    // });
    // if (slider.offsetWidth > wrapper.offsetWidth) {
    //     // We need a slider effect. We want one of the images to be partly visible as a clue that
    //     // sliding is possible.
    //     const avWidth = slider.offsetWidth / imagesToPlace.length;
    //     let indexNearBorder = Math.floor(wrapper.offsetWidth / avWidth);
    //     let sliderItem = slider.children[indexNearBorder] as HTMLElement;
    //     if (sliderItem.offsetLeft > wrapper.offsetWidth - 30) {
    //         // The item we initially selected is mostly off the right edge.
    //         // Stretch things to make the previous item half-off-screen.
    //         indexNearBorder--;
    //         sliderItem = slider.children[indexNearBorder] as HTMLElement;
    //     }
    //     if (
    //         sliderItem.offsetLeft + sliderItem.offsetWidth <
    //         wrapper.offsetWidth + 30
    //     ) {
    //         const oldMarginPx =
    //             sliderItem.ownerDocument.defaultView?.getComputedStyle(
    //                 sliderItem
    //             ).marginLeft ?? "22px";
    //         const oldMargin = parseInt(
    //             oldMarginPx.substring(0, oldMarginPx.length - 2)
    //         );
    //         const desiredLeft =
    //             wrapper.offsetWidth - sliderItem.offsetWidth / 2;
    //         const newMargin =
    //             oldMargin +
    //             (desiredLeft - sliderItem.offsetLeft) / indexNearBorder / 2;
    //         Array.from(slider.children).forEach((elt: HTMLElement) => {
    //             elt.style.marginLeft = newMargin + "px";
    //             elt.style.marginRight = newMargin + "px";
    //         });
    //     }
    // }
}

//Slider: const clickSliderImage = (e: MouseEvent) => {
//     if (draggingSlider) {
//         return;
//     }
//     const img = e.currentTarget as HTMLElement;
//     const page = img.closest(".bloom-page") as HTMLElement;
//     const activeTextBox = page.getElementsByClassName("bloom-activeTextBox")[0];
//     if (!activeTextBox) {
//         return; // weird
//     }
//     var activeId = activeTextBox.getAttribute("data-txt-img");
//     const imgId = img.getAttribute("data-img");
//     if (activeId === imgId) {
//         const imgTop = page.querySelector(`[data-img-txt="${imgId}"]`);
//         if (!imgTop) {
//             return; // weird
//         }
//         imgTop.classList.remove("bloom-hideSliderImage");
//         setTimeout(() => {
//             if (!showARandomWord(page, true)) {
//                 showCorrectOrWrongItems(page, true);
//             }
//         }, 1000); // should roughly correspond to the css transition showing the item
//     } else {
//         showCorrectOrWrongItems(page, false);
//     }
// };

// function setupSliderImageEvents(page: HTMLElement) {
//     const slider = page.getElementsByClassName("bloom-activity-slider")[0];
//     if (!slider) {
//         return; // panic?
//     }
//     const sliderImages = Array.from(slider.getElementsByTagName("img"));
//     sliderImages.forEach((img: HTMLElement) => {
//         img.addEventListener("click", clickSliderImage);
//     });
// }

// export function setSlideablesVisibility(page: HTMLElement, visible: boolean) {
//     const slideables = Array.from(page.querySelectorAll("[data-img-txt]"));
//     slideables.forEach((elt: HTMLElement) => {
//         if (visible) {
//             elt.classList.remove("bloom-hideSliderImage");
//         } else {
//             elt.classList.add("bloom-hideSliderImage");
//         }
//     });
// }

// function showARandomWord(page: HTMLElement, playAudio: boolean) {
//     const possibleWords = Array.from(page.querySelectorAll("[data-txt-img]"));
//     const targetWords = possibleWords.filter(w => {
//         const imgId = w.getAttribute("data-txt-img");
//         const img = page.querySelector(`[data-img-txt="${imgId}"]`);
//         return img?.classList.contains("bloom-hideSliderImage");
//     });
//     possibleWords.forEach(w => {
//         w.classList.remove("bloom-activeTextBox");
//     });
//     if (targetWords.length === 0) {
//         return false;
//     }

//     const randomIndex = Math.floor(Math.random() * targetWords.length);
//     targetWords[randomIndex].classList.add("bloom-activeTextBox");
//     if (playAudio) {
//         const playables = getAudioSentences([
//             targetWords[randomIndex] as HTMLElement
//         ]);
//         playAllAudio(playables);
//     }
//     return true;
// }
