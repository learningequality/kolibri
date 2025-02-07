// This file contains code for playing audio in a bloom page, including a draggable page.
// The file is designed to be shared between Bloom Desktop and Bloom Player. Maybe eventually
// as an npm module, but for now, just copied into both projects. See comments in dragActivityRuntime.ts.
// Until that day, changes must be copied manually, and care taken to avoid conflicts.

// It is quite difficult to know how to handle audio in a drag activity page.
// We need to be able to play it both during "Play" and when showing the page in BP.
// The code in this file so far represents a reuniting of the original Bloom Player
// narration code with the code developed for narration in drag activities.
// There is existing code for playing audio in Bloom Desktop, but it is entangled with the
// code that manages audio recording and the talking book tool. I hope eventually
// this code, or parts of it, can be used there as well as in 'Play' mode.
// The code here has hooks and some methods which are only useful to BP, for things such as
// autoplay and page advance, and also cases where the text being played is
// not fully visible. It deals with pause and continue, which also interact with
// the Bloom Player controls and with video and background music.
// Drag activities added the need to handle situations where the audio on the page
// should not all be played in succession, and more complicated sequencing of audio
// and video

import LiteEvent from "./event";
// Note: trying to avoid other imports, as part of the process of moving this code to a module
// that can be shared with BloomDesktop.

//----This first block is the old narrationUtils.ts. Everything here is now meant to be reusable
// code connected with narration, not specific to Bloom Player.
export interface ISetHighlightParams {
    newElement: Element;
    shouldScrollToElement: boolean;
    disableHighlightIfNoAudio?: boolean;
    oldElement?: Element | null | undefined; // Optional. Provides some minor optimization if set.
}

export enum PlaybackMode {
    NewPage, // starting a new page ready to play
    NewPageMediaPaused, // starting a new page in the "paused" state
    VideoPlaying, // video is playing
    VideoPaused, // video is paused
    AudioPlaying, // narration and/or animation are playing (or possibly finished)
    AudioPaused, // narration and/or animation are paused
    MediaFinished // video, narration, and/or animation has played (possibly no media to play)
    // Note that music can be playing when the state is either AudioPlaying or MediaFinished.
}

export let currentPlaybackMode: PlaybackMode = PlaybackMode.NewPage;
export function setCurrentPlaybackMode(mode: PlaybackMode) {
    if (
        currentPlaybackMode === PlaybackMode.AudioPlaying &&
        mode === PlaybackMode.NewPage
    ) {
        const mediaPlayer = getPlayer();
        if (mediaPlayer) {
            // Make sure the audio stops (pauses) before we move on to the next page.  (See BL-13905.)
            // Make the current playing element the only one in the stack for the playEnded() method
            // to process.
            elementsToPlayConsecutivelyStack = [mediaPlayer];
            playEnded();
        }
    }
    currentPlaybackMode = mode;
}

// These functions support allowing a client (typically BloomPlayerCore) to register as
// the object that wants to receive notification of how long audio was played.
// Duration is in seconds.
export let durationReporter: (duration: number) => void;
export function listenForPlayDuration(reporter: (duration: number) => void) {
    durationReporter = reporter;
}

// A client may configure a function which can be called to find out whether a swipe
// is in progress...in BloomPlayerCore, this is implemented by a test on SWiper.
// It is currently only used when we need to scroll the content of a field we are
// playing. Bloom Desktop does not need to set it.
export let isSwipeInProgress: () => boolean;
export function setTestIsSwipeInProgress(tester: () => boolean) {
    isSwipeInProgress = tester;
}

// A client may configure a function which is passed the URL of each audio file narration plays.
export let logNarration: (src: string) => void = () => {
    // do nothing by default
};
export function setLogNarration(logger: (src: string) => void) {
    logNarration =
        logger ??
        (() => {
            // do nothing by default (so we don't have to check for null)
        });
}

let playerUrlPrefix = "";
// In bloom player, figuring the url prefix (to put before file JS needs to locate, like
// sounds to play) is complicated. We pass it in.
// In Bloom desktop, it's almost more tricky. If we're executing in the page iframe, we can
// easily derive it from the page's URL. But if we're executing in the toolbox, that doesn't work.
// So we arrange for newPageReady, called at least as often as changing book, to set it up
// using setPlayerUrlPrefixFromWindowLocationHref
export function setPlayerUrlPrefix(prefix: string) {
    playerUrlPrefix = prefix;
}

export function setPlayerUrlPrefixFromWindowLocationHref(bookSrc: string) {
    setPlayerUrlPrefix(getUrlPrefixFromWindowHref(bookSrc));
}

function getUrlPrefixFromWindowHref(bookSrc: string) {
    const index = bookSrc.lastIndexOf("/");
    return bookSrc.substring(0, index);
}

export function urlPrefix(): string {
    if (playerUrlPrefix) {
        return playerUrlPrefix;
    }
    return getUrlPrefixFromWindowHref(window.location.href);
}

// We need to sort these by the tabindex of the containing bloom-translationGroup element.
// We need a stable sort, which array.sort() does not provide: elements in the same
// bloom-translationGroup, or where the translationGroup does not have a tabindex,
// should remain in their current order.
// It's not obvious what should happen to TGs with no tabindex when others have it.
// At this point we're going with the approach that no tabindex is equivalent to tabindex 999.
// This should cause text with no tabindex to sort to the bottom, if other text has a tabindex;
// It should also not affect order in situations where no text has a tabindex
// (An earlier algorithm attempted to preserve document order for the no-tab-index case
// by comparing any two elements using document order if either lacks tabindex.
// This works well for many cases, but if there's a no-tabindex element between two
// that get re-ordered (e.g., ABCDEF where the only tabindexes are C=2 and E=1),
// the function is not transitive (e.g. C < D < E but E < C) which will produce
// unpredictable results.
export function sortAudioElements(input: HTMLElement[]): HTMLElement[] {
    const keyedItems = input.map((item, index) => {
        return { tabindex: getTgTabIndex(item), index, item };
    });
    keyedItems.sort((x, y) => {
        // If either is not in a translation group with a tabindex,
        // order is determined by their original index.
        // Likewise if the tabindexes are the same.
        if (!x.tabindex || !y.tabindex || x.tabindex === y.tabindex) {
            return x.index - y.index;
        }
        // Otherwise, determined by the numerical order of tab indexes.
        return parseInt(x.tabindex, 10) - parseInt(y.tabindex, 10);
    });
    return keyedItems.map(x => x.item);
}

function getTgTabIndex(input: HTMLElement): string | null {
    let tg: HTMLElement | null = input;
    while (tg && !tg.classList.contains("bloom-translationGroup")) {
        tg = tg.parentElement;
    }
    if (!tg) {
        return "999";
    }
    return tg.getAttribute("tabindex") || "999";
}
///---- end of the bit that ended up in narrationUtils.ts before the merge.

const kSegmentClass = "bloom-highlightSegment";

// Indicates that the element should be highlighted.
const kEnableHighlightClass = "ui-enableHighlight";

// Indicates that the element should NOT be highlighted.
// For example, some elements have highlighting prevented at this level
// because its content has been broken into child elements, only some of which show the highlight
const kDisableHighlightClass = "ui-disableHighlight";
// Indicates that highlighting is briefly/temporarily suppressed,
// but may become highlighted later.
// For example, audio highlighting is suppressed until the related audio starts playing (to avoid flashes)
const kSuppressHighlightClass = "ui-suppressHighlight";

let durationOfPagesWithoutNarration = 3.0; // seconds
export function setDurationOfPagesWithoutNarration(d: number) {
    durationOfPagesWithoutNarration = d;
}

// Even though these can now encompass more than strict sentences,
// we continue to use this class name for backwards compatability reasons.
export const kAudioSentence = "audio-sentence";

const kImageDescriptionClass = "bloom-imageDescription";

// The page that is currently being played (or edited, when we use this code in Bloom Desktop).
let currentPlayPage: HTMLElement | null = null;
// When we have recently changed pages, stores a value returned from setTimeout, which can be used to cancel the old timeout
// if we change pages again. After three seconds, the timerout sets it to zero. A non-zero value also prevents the code that
// tries to scroll the currently-playing text into view from doing so in the early stages of viewing a page, when it
// can cause problems for swiper.
let recentPageChange: any = 0; // any because typescript thinks we're in Nodejs and setTimeout will return an object.
// Unused in Bloom desktop, but in Bloom player, current page might change while a series of sounds
// is playing. This lets us avoid starting the next sound if the page has changed in the meantime.
export function setCurrentPage(page: HTMLElement) {
    if (page === currentPlayPage) return;
    if (recentPageChange) {
        clearTimeout(recentPageChange);
    }
    recentPageChange = setTimeout(() => {
        recentPageChange = 0;
    }, 3000);
    currentPlayPage = page;
}
// Get the page that the narration system thinks is current.
export function getCurrentNarrationPage(): HTMLElement {
    return currentPlayPage!;
}

// The time we started playing the current narration. If we pause and resume this is adjusted
// by the length of the pause, so that "now" minus startPlay is always how much of the sound
// has actually been played.
let startPlay: Date;

// When the most recent pause happened.
let startPause: Date;

// Timer used to raise PageNarrationComplete after a delay when there is no audio on the page.
// Gets canceled if we pause and restarted if we resume.
let fakeNarrationTimer: number;

// List of segments that are currently being played, or will be resumed (or restarted) when play resumes.
// Typically the output of getPageAudioElements, but Bloom Games sometimes gives a different list.
// Unlike elementsToPlayConsecutivelyStack, this list is not reversed, nor do we remove items from it as we play them.
let segmentsWeArePlaying: HTMLElement[];

let currentAudioId = "";

// The first one to play should be at the end for both of these
let elementsToPlayConsecutivelyStack: HTMLElement[] = [];
let subElementsWithTimings: Array<[Element, number]> = [];

// On a typical page with narration, these are raised at the same time, when the last narration
// on the page finishes. But if there is no narration at all, PlayCompleted will be raised
// immediately (useful for example to disable a pause button), but PageNarrationComplete will
// be raised only after the standard delay for non-audio page (useful for auto-advancing to the next page).
export const PageNarrationComplete = new LiteEvent<HTMLElement>();
export const PlayCompleted = new LiteEvent<HTMLElement>();
// Raised when we can't play narration, specifically because the browser won't allow it until
// the user has interacted with the page.
export const PlayFailed = new LiteEvent<HTMLElement>();

// This event allows Narration to inform its controllers when we start/stop reading
// image descriptions. It is raised for each segment we read and passed true if the one
// we are about to read is an image description, false otherwise.
// Todo: wants a better name, it's not about toggling whether something is an image description,
// but about possibly updating the UI to reflect whether we are reading one.
export const ToggleImageDescription = new LiteEvent<boolean>();

// A Session Number that keeps track of each time playAllAudio started.
// This might be needed to keep track of changing pages, or when we start new audio
// that will replace something already playing.
let currentAudioSessionNum: number = 0;

let includeImageDescriptions: boolean = true;
export function setIncludeImageDescriptions(b: boolean) {
    includeImageDescriptions = b;
}

// This represents the start time of the current playing of the audio. If the user presses pause/play, it will be reset.
// This is used for analytics reporting purposes
let audioPlayCurrentStartTime: number | null = null; // milliseconds (since 1970/01/01, from new Date().getTime())

// Roughly equivalent to BloomDesktop's AudioRecording::listen() function.
// As long as there is audio on the page, this method will play it.
export function playAllSentences(page: HTMLElement | null): void {
    if (!page && !currentPlayPage) {
        return; // this shouldn't happen
    }
    const pageToPlay = page ?? currentPlayPage!;
    playAllAudio(getPageAudioElements(pageToPlay), pageToPlay);
}

export function playAllAudio(elements: HTMLElement[], page: HTMLElement): void {
    setCurrentPage(page);
    segmentsWeArePlaying = elements;
    startPlay = new Date();
    const mediaPlayer = getPlayer();
    if (mediaPlayer) {
        // This felt like a good idea to do always. But we are about to set a new src on the media player and play that,
        // which will deal with any sound that is still playing.
        // And if we explicitly pause it now, that actually starts an async process of getting it paused, which
        // may not have completed by the time we attempt to play the new audio. And then play() fails.
        // OTOH, if there is nothing new to play, we should terminate anything that is playing
        // (perhaps from a previous page).
        if (elements.length == 0) {
            mediaPlayer.pause();
        }
        mediaPlayer.currentTime = 0;
    }

    // Invalidate old ID, even if there's no new audio to play.
    // (Deals with the case where you are on a page with audio, switch to a page without audio, then switch back to original page)
    ++currentAudioSessionNum;

    fixHighlighting(elements);

    // Sorted into the order we want to play them, then reversed so we
    // can more conveniently pop the next one to play from the end of the stack.
    elementsToPlayConsecutivelyStack = sortAudioElements(elements).reverse();

    const stackSize = elementsToPlayConsecutivelyStack.length;
    if (stackSize === 0) {
        // Nothing to play. First, raise the event that indicates nothing is playing.
        // It typically sets mode to MediaFinsished, and we want to override that.
        if (PlayCompleted) {
            PlayCompleted?.raise(page);
        }
        // Simulate playing for a fixed amount of time before raising PageNarrationComplete, in case we're autoadvancing.
        // We're not really playing, but we're pretending, so things work best if we go to that mode.
        // For example, if we leave it in MediaFinished from the previous page or from raising PlayCompleted, pause won't work.
        setCurrentPlaybackMode(PlaybackMode.AudioPlaying);
        if (PageNarrationComplete) {
            fakeNarrationTimer = window.setTimeout(() => {
                setCurrentPlaybackMode(PlaybackMode.MediaFinished);
                PageNarrationComplete?.raise(page);
            }, durationOfPagesWithoutNarration * 1000);
        }
        return;
    }

    const firstElementToPlay = elementsToPlayConsecutivelyStack[stackSize - 1]; // Remember to pop it when you're done playing it. (i.e., in playEnded)
    // At one point it seemed to help something to delete the media player and make a new one each time.
    // I didn't comment this at the time, but my recollection is that this could help with some cases
    // where the old one was in a bad state, such as in the middle of pausing.
    // Currently, though, we're being more careful not to pause except when there is nothing more to play currently,
    // (or when the user clicks the button),
    // since changing the src will stop any old play, but pausing right before setting a new src and calling play()
    // can cause the play() to fail. And somehow, deleting the media player here before we set up for a new play
    // was causing play to fail, reporting an abort because the media was removed from the document.
    // I don't fully understand why that was happening, but for now, things seem to be working best by just
    // continuing to use the same player as long as it can be found.
    // For sure, don't delete the player and make a new one between setting highlight and playing,
    // or the handler that removes the highlight suppression will be lost.
    //mediaPlayer.remove();

    setSoundAndHighlight(firstElementToPlay, true);
    // Review: do we need to do something to let the rest of the world know about this?
    setCurrentPlaybackMode(PlaybackMode.AudioPlaying);
    playCurrentInternal();
    return;
}

// Match space or &nbsp; (\u00a0) or &ZeroWidthSpace; (\u200b). Must have three or more in a row to match.
// Geckofx would typically give something like `&nbsp;&nbsp;&nbsp; ` but wv2 usually gives something like `&nbsp; &nbsp; `
const multiSpaceRegex = /[ \u00a0\u200b]{3,}/;
const multiSpaceRegexGlobal = new RegExp(multiSpaceRegex, "g");
/**
 * Finds and fixes any elements on the page that should have their audio-highlighting disabled.
 *
 * Note, all this logic is essentially duplicated from BloomDesktop where there are quite a few unit tests.
 */
function fixHighlighting(audioElements: HTMLElement[]) {
    // Note: Only relevant when playing by sentence (but note, this can make Record by Text Box -> Split or Record by Sentence, Play by Sentence)
    // Play by Text Box highlights the whole paragraph and none of this really matters.
    // (the span selector won't match anyway)
    audioElements.forEach(audioElement => {
        // FYI, don't need to process the bloom-linebreak spans. Nothing bad happens, just unnecessary.
        const matches = findAll(
            "span[id]:not(.bloom-linebreak)",
            audioElement,
            true
        );
        matches.forEach(element => {
            // Remove all existing highlight classes from element and element's descendants.
            // These shouldn't be in the dom as the editor is supposed to clean them up,
            // but we have seen at least on case where it didn't. BL-13428.
            removeHighlightClasses(element);

            // Simple check to help ensure that elements that don't need to be modified will remain untouched.
            // This doesn't consider whether text that shouldn't be highlighted is already in inside an
            // element with highlight disabled, but that's ok. The code down the stack checks that.
            const containsNonHighlightText = !!element.innerText.match(
                multiSpaceRegex
            );

            if (containsNonHighlightText) {
                fixHighlightingInNode(element, element);
            }
        });
    });
}

// Remove all existing highlight classes from element and element's descendants.
function removeHighlightClasses(element: HTMLElement) {
    element.classList.remove(kDisableHighlightClass);
    element.classList.remove(kEnableHighlightClass);

    Array.from(element.children).forEach((child: HTMLElement) => {
        removeHighlightClasses(child);
    });
}

/**
 * Recursively fixes the audio-highlighting within a node (whether element node or text node)
 * @param node The node to recursively fix
 * @param startingSpan The starting span, AKA the one that will receive .ui-audioCurrent in the future.
 */
function fixHighlightingInNode(node: Node, startingSpan: HTMLSpanElement) {
    if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).classList.contains(kDisableHighlightClass)
    ) {
        // No need to process bloom-highlightDisabled elements (they've already been processed)
        return;
    } else if (node.nodeType === Node.TEXT_NODE) {
        // Leaf node. Fix the highlighting, then go back up the stack.
        fixHighlightingInTextNode(node, startingSpan);
        return;
    } else {
        // Recursive case
        const childNodesCopy = Array.from(node.childNodes); // Make a copy because node.childNodes is being mutated
        childNodesCopy.forEach(childNode => {
            fixHighlightingInNode(childNode, startingSpan);
        });
    }
}

/**
 * Analyzes a text node and fixes its highlighting.
 */
function fixHighlightingInTextNode(
    textNode: Node,
    startingSpan: HTMLSpanElement
) {
    if (textNode.nodeType !== Node.TEXT_NODE) {
        throw new Error(
            "Invalid argument to fixMultiSpaceInTextNode: node must be a TextNode"
        );
    }

    if (!textNode.nodeValue) {
        return;
    }

    // string.matchAll would be cleaner, but not supported in all browsers (in particular, FF60)
    // Use RegExp.exec for greater compatibility.
    multiSpaceRegexGlobal.lastIndex = 0; // RegExp.exec is stateful! Need to reset the state.
    const matches: {
        text: string;
        startIndex: number;
        endIndex: number; // the index of the first character to exclude
    }[] = [];
    let regexResult: RegExpExecArray | null;
    while (
        (regexResult = multiSpaceRegexGlobal.exec(textNode.nodeValue)) != null
    ) {
        regexResult.forEach(matchingText => {
            matches.push({
                text: matchingText,
                startIndex:
                    multiSpaceRegexGlobal.lastIndex - matchingText.length,
                endIndex: multiSpaceRegexGlobal.lastIndex // the index of the first character to exclude
            });
        });
    }

    // First, generate the new DOM elements with the fixed highlighting.
    const newNodes: Node[] = [];
    if (matches.length === 0) {
        // No matches
        newNodes.push(makeHighlightedSpan(textNode.nodeValue));
    } else {
        let lastMatchEndIndex = 0; // the index of the first character to exclude of the last match
        for (let i = 0; i < matches.length; ++i) {
            const match = matches[i];

            const preMatchText = textNode.nodeValue.slice(
                lastMatchEndIndex,
                match.startIndex
            );
            lastMatchEndIndex = match.endIndex;
            if (preMatchText) newNodes.push(makeHighlightedSpan(preMatchText));

            newNodes.push(document.createTextNode(match.text));

            if (i === matches.length - 1) {
                const postMatchText = textNode.nodeValue.slice(match.endIndex);
                if (postMatchText) {
                    newNodes.push(makeHighlightedSpan(postMatchText));
                }
            }
        }
    }

    // Next, replace the old DOM element with the new DOM elements
    const oldNode = textNode;
    if (oldNode.parentNode && newNodes && newNodes.length > 0) {
        for (let i = 0; i < newNodes.length; ++i) {
            const nodeToInsert = newNodes[i];
            oldNode.parentNode.insertBefore(nodeToInsert, oldNode);
        }

        oldNode.parentNode.removeChild(oldNode);

        // We need to set ancestor's background back to transparent (instead of highlighted),
        // and let each of the newNodes's styles control whether to be highlighted or transparent.
        // If ancestor was highlighted but one of its new descendant nodes was transparent,
        // all that would happen is the descendant would allow the ancestor's highlight color to show through,
        // which doesn't achieve what we want :(
        startingSpan.classList.add(kDisableHighlightClass);
    }
}

function makeHighlightedSpan(textContent: string) {
    const newSpan = document.createElement("span");
    newSpan.classList.add(kEnableHighlightClass);
    newSpan.appendChild(document.createTextNode(textContent));
    return newSpan;
}

function playCurrentInternal() {
    if (currentPlaybackMode === PlaybackMode.AudioPlaying) {
        const mediaPlayer = getPlayer();
        if (mediaPlayer) {
            const element = getCurrentNarrationPage().querySelector(
                `#${currentAudioId}`
            );
            if (!element || !canPlayAudio(element)) {
                playEnded();
                return;
            }

            // Regardless of whether we end up using timingsStr or not,
            // we should reset this now in case the previous page used it and was still playing
            // when the user flipped to the next page.
            subElementsWithTimings = [];

            const timingsStr: string | null = element.getAttribute(
                "data-audioRecordingEndTimes"
            );
            if (timingsStr) {
                const childSpanElements = element.querySelectorAll(
                    `span.${kSegmentClass}`
                );
                const fields = timingsStr.split(" ");
                const subElementCount = Math.min(
                    fields.length,
                    childSpanElements.length
                );

                for (let i = subElementCount - 1; i >= 0; --i) {
                    const durationSecs: number = Number(fields[i]);
                    if (isNaN(durationSecs)) {
                        continue;
                    }
                    subElementsWithTimings.push([
                        childSpanElements.item(i),
                        durationSecs
                    ]);
                }
            } else {
                // No timings string available.
                // No need for us to do anything. The correct element is already highlighted by playAllSentences() (which needed to call setCurrent... anyway to set the audio player source).
                // We'll just proceed along, start playing the audio, and playNextSubElement() will return immediately because there are no sub-elements in this case.
            }

            const currentSegment = element as HTMLElement;
            if (currentSegment && ToggleImageDescription) {
                ToggleImageDescription?.raise(
                    isImageDescriptionSegment(currentSegment)
                );
            }

            gotErrorPlaying = false;
            const promise = mediaPlayer.play();
            ++currentAudioSessionNum;
            audioPlayCurrentStartTime = new Date().getTime();
            highlightNextSubElement(currentAudioSessionNum);
            handlePlayPromise(promise);
        }
    }
}

function isImageDescriptionSegment(segment: HTMLElement): boolean {
    return segment.closest("." + kImageDescriptionClass) !== null;
}

function handlePlayPromise(promise: Promise<void>, player?: HTMLMediaElement) {
    // In newer browsers, play() returns a promise which fails
    // if the browser disobeys the command to play, as some do
    // if the user hasn't 'interacted' with the page in some
    // way that makes the browser think they are OK with it
    // playing audio. In Gecko45, the return value is undefined,
    // so we mustn't call catch.
    if (promise && promise.catch) {
        promise.catch((reason: any) => {
            // The HTMLMediaElement also has an error handler (which calls playEnded()).
            // We do NOT want to call that here, both to stop it happening twice, but also because
            // we do NOT want to call playEnded (which in autoplay causes advance to next page)
            // when we get NotAllowedError. That error seems to only come here, and not to raise the
            // ended event.

            // This promise.catch error handler is the only one that handles NotAllowedException (that is, playback not started because user has not interacted with the page yet).
            // However, older versions of browsers don't support promise from HTMLMediaElement.play(). So this cannot be the only error handler.
            // Thus we need both the promise.catch error handler as well as the HTMLMediaElement's error handler.
            //
            // In many cases (such as NotSupportedError, which happens when the audio file isn't found), both error handlers will run.
            // That is a little annoying but if the two don't conflict with each other it's not problematic.

            const playingWhat = player?.getAttribute("src") ?? "unknown";
            console.log("could not play sound: " + reason + " " + playingWhat);

            if (
                reason &&
                reason
                    .toString()
                    .includes(
                        "The play() request was interrupted by a call to pause()."
                    )
            ) {
                // We were getting this error Aug 2020. I tried wrapping the line above which calls mediaPlayer.play()
                // (currently `promise = mediaPlayer.play();`) in a setTimeout with 0ms. This seemed to fix the bug (with
                // landscape books not having audio play initially -- BL-8887). But the root cause was actually that
                // we ended up calling playAllSentences twice when the book first loaded.
                // I fixed that in bloom-player-core. But I wanted to document the possible setTimeout fix here
                // in case this issue ever comes up for a different reason.
                console.log(
                    "See comment in narration.ts for possibly useful information regarding this error."
                );
            }

            // Don't call removeAudioCurrent() here. The HTMLMediaElement's error handler will call playEnded() and calling removeAudioCurrent() here will mess up playEnded().
            // removeAudioCurrent();

            // With some kinds of invalid sound file it keeps trying and plays over and over.
            // But when we move on to play another sound, a pause here will mess things up.
            // So instead I put a pause after we run out of sounds to try to play.
            //getPlayer().pause();
            // if (Pause) {
            //     Pause?.raise();
            // }

            // Get all the state (and UI) set correctly again.
            // Not entirely sure about limiting this to NotAllowedError, but that's
            // the one kind of play error that is fixed by the user just interacting.
            // If there's some other reason we can't play, showing as paused may not
            // be useful. See comments on the similar code in music.ts
            if (reason.name === "NotAllowedError" && PlayFailed) {
                PlayFailed?.raise();
            }
        });
    }
}

// Moves the highlight to the next sub-element
// originalSessionNum: The value of currentAudioSessionNum at the time when the audio file started playing.
// This is used to check in the future if the timeouts we started are for the right session.
// startTimeInSecs is an optional fallback that will be used in case the currentTime cannot be determined from the audio player element.
function highlightNextSubElement(
    originalSessionNum: number,
    startTimeInSecs: number = 0
) {
    // the item should not be popped off the stack until it's completely done with.
    const subElementCount = subElementsWithTimings.length;

    if (subElementCount <= 0) {
        return;
    }

    const topTuple = subElementsWithTimings[subElementCount - 1];
    const element = topTuple[0];
    const endTimeInSecs: number = topTuple[1];

    setHighlightTo({
        newElement: element,
        shouldScrollToElement: true,
        disableHighlightIfNoAudio: false
    });

    const mediaPlayer: HTMLMediaElement = document.getElementById(
        "bloom-audio-player"
    )! as HTMLMediaElement;
    let currentTimeInSecs: number = mediaPlayer.currentTime;
    if (currentTimeInSecs <= 0) {
        currentTimeInSecs = startTimeInSecs;
    }

    // Handle cases where the currentTime has already exceeded the nextStartTime
    //   (might happen if you're unlucky in the thread queue... or if in debugger, etc.)
    // But instead of setting time to 0, set the minimum highlight time threshold to 0.1 (this threshold is arbitrary).
    const durationInSecs = Math.max(endTimeInSecs - currentTimeInSecs, 0.1);

    setTimeout(() => {
        onSubElementHighlightTimeEnded(originalSessionNum);
    }, durationInSecs * 1000);
}

// Handles a timeout indicating that the expected time for highlighting the current subElement has ended.
// If we've really played to the end of that subElement, highlight the next one (if any).
// originalSessionNum: The value of currentAudioSessionNum at the time when the audio file started playing.
// This is used to check in the future if the timeouts we started are for the right session
function onSubElementHighlightTimeEnded(originalSessionNum: number) {
    // Check if the user has changed pages since the original audio for this started playing.
    // Note: Using the timestamp allows us to detect switching to the next page and then back to this page.
    //       Using playerPage (HTMLElement) does not detect that.
    if (originalSessionNum !== currentAudioSessionNum) {
        return;
    }
    // Seems to be needed to prevent jumping to the next subelement when not permitted to play by browser.
    // Not sure why the check below on mediaPlayer.currentTime does not prevent this.
    if (currentPlaybackMode === PlaybackMode.AudioPaused) {
        return;
    }

    const subElementCount = subElementsWithTimings.length;
    if (subElementCount <= 0) {
        return;
    }

    const mediaPlayer: HTMLMediaElement = document.getElementById(
        "bloom-audio-player"
    )! as HTMLMediaElement;
    if (mediaPlayer.ended || mediaPlayer.error) {
        // audio playback ended. No need to highlight anything else.
        // (No real need to remove the highlights either, because playEnded() is supposed to take care of that.)
        return;
    }
    const playedDurationInSecs: number | undefined | null =
        mediaPlayer.currentTime;

    // Peek at the next sentence and see if we're ready to start that one. (We might not be ready to play the next audio if the current audio got paused).
    const subElementWithTiming = subElementsWithTimings[subElementCount - 1];
    const nextStartTimeInSecs = subElementWithTiming[1];

    if (playedDurationInSecs && playedDurationInSecs < nextStartTimeInSecs) {
        // Still need to wait. Exit this function early and re-check later.
        const minRemainingDurationInSecs =
            nextStartTimeInSecs - playedDurationInSecs;
        setTimeout(() => {
            onSubElementHighlightTimeEnded(originalSessionNum);
        }, minRemainingDurationInSecs * 1000);

        return;
    }

    subElementsWithTimings.pop();

    highlightNextSubElement(originalSessionNum, nextStartTimeInSecs);
}

// Removes the .ui-audioCurrent class from all elements (also ui-audioCurrentImg)
// Equivalent of removeAudioCurrentFromPageDocBody() in BloomDesktop.
// "around" might be the element that has the highlight, or the one getting it;
// the important thing is that it belongs to the right document (which is in question
// with multiple iframes in Bloom desktop).
function removeAudioCurrent(around: HTMLElement = document.body) {
    // Note that HTMLCollectionOf's length can change if you change the number of elements matching the selector.
    // For safety we get rid of all existing ones.
    const audioCurrentArray = Array.from(
        around.ownerDocument.getElementsByClassName("ui-audioCurrent")
    );

    for (let i = 0; i < audioCurrentArray.length; i++) {
        audioCurrentArray[i].classList.remove("ui-audioCurrent");
    }
    const currentImg = around.ownerDocument.getElementsByClassName(
        "ui-audioCurrentImg"
    )[0];
    if (currentImg) {
        currentImg.classList.remove("ui-audioCurrentImg");
    }
}

function setSoundAndHighlight(
    newElement: Element,
    disableHighlightIfNoAudio: boolean,
    oldElement?: Element | null | undefined
) {
    setHighlightTo({
        newElement,
        shouldScrollToElement: true, // Always true in bloom-player version
        disableHighlightIfNoAudio,
        oldElement
    });
    setSoundFrom(newElement);
}

function setHighlightTo({
    newElement,
    shouldScrollToElement,
    disableHighlightIfNoAudio,
    oldElement
}: ISetHighlightParams) {
    // This should happen even if oldElement and newElement are the same.
    if (shouldScrollToElement) {
        // Wrap it in a try/catch so that if something breaks with this minor/nice-to-have feature of scrolling,
        // the main responsibilities of this method can still proceed
        try {
            scrollElementIntoView(newElement);
        } catch (e) {
            console.error(e);
        }
    }

    if (oldElement === newElement) {
        // No need to do much, and better not to, so that we can avoid any temporary flashes as the highlight is removed and re-applied
        return;
    }

    removeAudioCurrent((oldElement || newElement) as HTMLElement);

    if (disableHighlightIfNoAudio) {
        const mediaPlayer = getPlayer();
        const isAlreadyPlaying = mediaPlayer.currentTime > 0;

        // If it's already playing, no need to disable (Especially in the Soft Split case, where only one file is playing but multiple sentences need to be highlighted).
        if (!isAlreadyPlaying) {
            // Start off in a highlight-disabled state so we don't display any momentary highlight for cases where there is no audio for this element.
            // In react-based bloom-player, canPlayAudio() can't trivially identify whether or not audio exists,
            // so we need to incorporate a derivative of Bloom Desktop's .ui-suppressHighlight code
            newElement.classList.add(kSuppressHighlightClass);
            // When it starts playing, we know we really have such an audio file, so we can stop
            // suppressing the highlight.
            mediaPlayer.addEventListener("playing", () => {
                newElement.classList.remove(kSuppressHighlightClass);
            });
        }
    }

    newElement.classList.add("ui-audioCurrent");
    // If the current audio is part of a (currently typically hidden) image description,
    // highlight the image.
    // it's important to check for imageDescription on the translationGroup;
    // we don't want to highlight the image while, for example, playing a TOP box content.
    const translationGroup = newElement.closest(".bloom-translationGroup");
    if (
        translationGroup &&
        translationGroup.classList.contains(kImageDescriptionClass)
    ) {
        const imgContainer = translationGroup.closest(".bloom-imageContainer");
        if (imgContainer) {
            imgContainer.classList.add("ui-audioCurrentImg");
        }
    }
}

// Scrolls an element into view.
function scrollElementIntoView(element: Element) {
    // In Bloom Player, scrollIntoView can interfere with page swipes,
    // so Bloom Player needs some smarts about when to call it...
    if (isSwipeInProgress?.() || recentPageChange) {
        // This alternative implementation doesn't use scrollIntoView (Which interferes with swiper).
        // Since swiping is only active at the beginning (usually while the 1st element is playing)
        // it should generally be good enough just to reset the scroll of the scroll parent to the top.

        // Assumption: Assumes the editable is the scrollbox.
        // If this is not the case, you can use JQuery's scrollParent() function or other equivalent
        const scrollAncestor = getEditable(element);
        if (scrollAncestor) {
            scrollAncestor.scrollTop = 0;
        }
        return;
    }

    let mover = element as HTMLElement; // by default make the element itself scrollIntoView
    if (window.getComputedStyle(element.parentElement!).position !== "static") {
        // We can make a new element absolutely positioned and it will be relative to the parent.
        // The idea is to make an element much narrower than the element we are
        // trying to make visible, since we don't want horizontal movement. Quite possibly,
        // as in BL-11038, only some white space is actually off-screen. But even if the author
        // has positioned a bubble so some text is cut off, we don't want horizontal scrolling,
        // which inside swiper will weirdly pull in part of the next page.
        // (In the pathological case that the bubble is more than half hidden, we'll do the
        // horizontal scroll, despite the ugliness of possibly showing part of the next page.)
        // Note that elt may be a span, when scrolling chunks of text into view to play.
        // I thought about using scrollWidth/Height to include any part of the element
        // that is scrolled out of view, but for some reason these are always zero for spans.
        // OffsetHeight seems to give the full height, though docs seem to indicate that it
        // should not include invisible areas.
        const elt = element as HTMLElement;
        mover = document.createElement("div");
        mover.style.position = "absolute";
        mover.style.top = elt.offsetTop + "px";

        // now we need what for a block would be offsetLeft. However, for a span, that
        // yields the offset of the top left corner, which may be in the middle
        // of a line.
        const bounds = elt.getBoundingClientRect();
        const parent = elt.parentElement;
        const parentBounds = parent?.getBoundingClientRect();
        const scale = parentBounds!.width / parent!.offsetWidth;
        const leftRelativeToParent = (bounds.left - parentBounds!.left) / scale;

        mover.style.left = leftRelativeToParent + elt.offsetWidth / 2 + "px";
        mover.style.height = elt.offsetHeight + "px";
        mover.style.width = "0";
        element.parentElement?.insertBefore(mover, element);
    }

    mover.scrollIntoView({
        // Animated instead of sudden
        behavior: "smooth",

        // "nearest" setting does lots of smarts for us (compared to us deciding when to use "start" or "end")
        // Seems to reduce unnecessary scrolling compared to start (aka true) or end (aka false).
        // Refer to https://drafts.csswg.org/cssom-view/#scroll-an-element-into-view,
        // which seems to imply that it won't do any scrolling if the two relevant edges are already inside.
        block: "nearest"

        // horizontal alignment is controlled by "inline". We'll leave it as its default ("nearest")
        // which typically won't move things at all horizontally
    });
    if (mover !== element) {
        mover.parentElement?.removeChild(mover);
    }
}

function getEditable(element: Element): Element | null {
    if (element.classList.contains("bloom-editable")) {
        return element;
    } else {
        return element.closest(".bloom-editable"); // Might be null
    }
}

function setSoundFrom(element: Element) {
    const firstAudioSentence = getFirstAudioSentenceWithinElement(element);
    const id: string = firstAudioSentence ? firstAudioSentence.id : element.id;
    setCurrentAudioId(id);
}

function getFirstAudioSentenceWithinElement(
    element: Element | null
): Element | null {
    const audioSentences = getAudioSegmentsWithinElement(element);
    if (!audioSentences || audioSentences.length === 0) {
        return null;
    }

    return audioSentences[0];
}

function getAudioSegmentsWithinElement(element: Element | null): Element[] {
    const audioSegments: Element[] = [];

    if (element) {
        if (element.classList.contains(kAudioSentence)) {
            audioSegments.push(element);
        } else {
            const collection = element.getElementsByClassName(kAudioSentence);
            for (let i = 0; i < collection.length; ++i) {
                const audioSentenceElement = collection.item(i);
                if (audioSentenceElement) {
                    audioSegments.push(audioSentenceElement);
                }
            }
        }
    }

    return audioSegments;
}

function setCurrentAudioId(id: string) {
    if (!currentAudioId || currentAudioId !== id) {
        currentAudioId = id;
        updatePlayerStatus();
    }
}

function updatePlayerStatus() {
    const player = getPlayer();
    if (!player) {
        return;
    }
    // Any time we change the src, the player will pause.
    // So if we're playing currently, we'd better report whatever time
    // we played.
    if (player.currentTime > 0 && !player.paused && !player.ended) {
        reportPlayDuration();
    }
    const url = currentAudioUrl(currentAudioId);
    logNarration(url);
    // because this code is meant to work in both Bloom and BloomPlayer, we can't call a Bloom API to find
    // out whether we actually have a recording (as we well might not, if we just opened the talking book
    // tool and haven't recorded anything yet). So we just try to play it and see what happens.
    // The optional param tells Bloom not to report an error if the file isn't found, and is ignored in
    // other contexts.
    if (url.startsWith("blob")) player.setAttribute("src", url);
    else
        player.setAttribute(
            "src",
            url + "?nocache=" + new Date().getTime() + "&optional=true"
        );
}

function currentAudioUrl(id: string): string {
    let result = urlPrefix() + "/audio/" + id + ".mp3";
    if (id.startsWith("_")) {
        result =
            "blob:http://" +
            urlPrefix()
                .split("/")
                .at(-2) +
            "/" +
            id.substring(1);
    }
    return result;
}

function getPlayer(): HTMLMediaElement {
    const audio = getAudio("bloom-audio-player", a => {
        a.addEventListener("ended", playEnded);
        a.addEventListener("error", handlePlayError);
    });
    return audio;
}

function playEnded(): void {
    // Not sure if this is necessary, since both 'playCurrentInternal()' and 'reportPlayEnded()'
    // will toggle image description already, but if we've just gotten to the end of our "stack",
    // it may be needed.
    if (ToggleImageDescription) {
        ToggleImageDescription?.raise(false);
    }
    reportPlayDuration();
    if (
        elementsToPlayConsecutivelyStack &&
        elementsToPlayConsecutivelyStack.length > 0
    ) {
        const elementJustPlayed = elementsToPlayConsecutivelyStack.pop(); // get rid of the last one we played
        const newStackCount = elementsToPlayConsecutivelyStack.length;
        if (newStackCount > 0) {
            // More items to play
            const nextElement =
                elementsToPlayConsecutivelyStack[newStackCount - 1];
            setSoundAndHighlight(nextElement, true);
            playCurrentInternal();
        } else {
            reportPlayEnded();
            removeAudioCurrent(elementJustPlayed);
            // In some error conditions, we need to stop repeating attempts to play.
            getPlayer().pause();
        }
    }
}

function reportPlayEnded() {
    elementsToPlayConsecutivelyStack = [];
    subElementsWithTimings = [];

    removeAudioCurrent();
    PageNarrationComplete?.raise(currentPlayPage!);
    PlayCompleted?.raise();
}

function reportPlayDuration() {
    if (!audioPlayCurrentStartTime || !durationReporter) {
        return;
    }
    const currentTime = new Date().getTime();
    const duration = (currentTime - audioPlayCurrentStartTime) / 1000;
    durationReporter(duration);
}

function getAudio(id: string, init: (audio: HTMLAudioElement) => void) {
    let player: HTMLAudioElement | null = document.querySelector(
        "#" + id
    ) as HTMLAudioElement;
    // If (somehow?) it exists but is not a valid HTMLAudioElement, remove it.
    if (player && !player.play) {
        player.remove();
        player = null;
    }
    if (!player) {
        player = document.createElement("audio") as HTMLAudioElement;
        player.setAttribute("id", id);
        document.body.appendChild(player);
        init(player);
    }
    return player as HTMLMediaElement;
}

function canPlayAudio(current: Element): boolean {
    return true; // currently no way to check
}

// If something goes wrong playing a media element, typically that we don't actually have a recording
// for a particular one, we seem to sometimes get an error event, while other times, the promise returned
// by play() is rejected. Both cases call handlePlayError, which calls playEnded, but in case we get both,
// we don't want to call playEnded twice.
let gotErrorPlaying = false;

function handlePlayError() {
    if (gotErrorPlaying) {
        console.log("Already got error playing, not handling again");
        return;
    }
    gotErrorPlaying = true;
    console.log("Error playing, handling");
    setTimeout(() => {
        playEnded();
    }, 100);
}

// Returns all elements that match CSS selector {expr} as an array.
// Querying can optionally be restricted to {container}'s descendants
// If includeSelf is true, it includes both itself as well as its descendants.
// Otherwise, it only includes descendants.
// Also filters out imageDescriptions if we aren't supposed to be reading them.
function findAll(
    expr: string,
    container: HTMLElement,
    includeSelf: boolean = false
): HTMLElement[] {
    // querySelectorAll checks all the descendants
    const allMatches: HTMLElement[] = [].slice.call(
        (container || document).querySelectorAll(expr)
    );

    // Now check itself
    if (includeSelf && container && container.matches(expr)) {
        allMatches.push(container);
    }

    return includeImageDescriptions
        ? allMatches
        : allMatches.filter(match => !isImageDescriptionSegment(match));
}

function getPlayableDivs(container: HTMLElement) {
    // We want to play any audio we have from divs the user can see.
    // This is a crude test, but currently we always use display:none to hide unwanted languages.
    return findAll(".bloom-editable", container).filter(
        e => window.getComputedStyle(e).display !== "none"
    );
}

// Optional param is for use when 'playerPage' has NOT been initialized.
// Not using the optional param assumes 'playerPage' has been initialized
function getPagePlayableDivs(page?: HTMLElement): HTMLElement[] {
    return getPlayableDivs(page ? page : currentPlayPage!);
}

// Optional param is for use when 'playerPage' has NOT been initialized.
// Not using the optional param assumes 'playerPage' has been initialized
function getPageAudioElements(page?: HTMLElement): HTMLElement[] {
    return [].concat.apply(
        [],
        getPagePlayableDivs(page).map(x => findAll(".audio-sentence", x, true))
    );
}

export function pageHasAudio(page: HTMLElement): boolean {
    return getPageAudioElements(page).length ? true : false;
}

// Called when the user clicks the play/pause button, and we want to resume playing.
// If we're in the middle of playing, we resume it.
// If we have finished playing, we start over.
// If the page nas no audio, we assume the user paused as long as wanted on
// the page, and raise the PageNarrationComplete event at once (to move to the
// next page if we are in autoplay).
export function playNarration() {
    if (currentPlaybackMode === PlaybackMode.AudioPlaying) {
        return; // no change.
    }
    setCurrentPlaybackMode(PlaybackMode.AudioPlaying);
    // I'm not sure how getPlayer() can return null/undefined, but have seen it happen
    // typically when doing something odd like trying to go back from the first page.
    if (segmentsWeArePlaying.length && getPlayer()) {
        if (elementsToPlayConsecutivelyStack.length) {
            handlePlayPromise(getPlayer().play());

            // Resuming play. Only currentStartTime needs to be adjusted, but originalStartTime shouldn't be changed.
            audioPlayCurrentStartTime = new Date().getTime();
            // in case we're resuming play, we need a new timout when the current subelement is finished
            highlightNextSubElement(currentAudioSessionNum);
            return;
        } else {
            // Pressing the play button in this case is triggering a replay of the current page,
            // so we need to reset the highlighting.
            playAllSentences(null);
            return;
        }
    }
    // Nothing real to play on this page, so PageNarrationComplete depends on a timeout.
    // We only get here following a pause, so assume the reader has paused as long as wanted,
    // and move on.
    PageNarrationComplete?.raise(currentPlayPage!);
}

export function pauseNarration() {
    if (currentPlaybackMode === PlaybackMode.AudioPaused) {
        return;
    }
    pausePlaying();
    startPause = new Date();

    // Note that neither music.pause() nor animations.PauseAnimations() check the state.
    // If that changes, then this state setting might need attention.
    setCurrentPlaybackMode(PlaybackMode.AudioPaused);
}

// This pauses the current player without setting the "AudioPaused" state or setting the
// startPause timestamp.  If this method is called when resumption is possible, the calling
// method must take care of these values (as in the pause method directly above).
// Note that there's no "stop" method on player, only a "pause" method.  This method is
// used both when "pausing" the narration while viewing a page and when stopping narration
// when changing pages.
function pausePlaying() {
    const player = getPlayer();
    // We're paused, so if we have a timer running to switch pages after a certain time, cancel it.
    clearTimeout(fakeNarrationTimer);
    if (segmentsWeArePlaying && segmentsWeArePlaying.length && player) {
        // Before reporting duration, try to check that we really are playing.
        // a separate report is sent if play ends.
        if (player.currentTime > 0 && !player.paused && !player.ended) {
            reportPlayDuration();
        }
        player.pause();
    }
}

// Figure out the total duration of the audio on the page.
// An earlier version of this code (see narration.ts around November 2023)
// was designed to run asnychronously so that if we don't have audio
// durations in the file, it would try to get the actual duration of the audio
// from the server. However, comments indicated that this approach did not
// work in mobile apps, and bloompubs have now long shipped with the durations.
// So I decided to simplify.
export function computeDuration(page: HTMLElement): number {
    let pageDuration = 0.0;
    getPageAudioElements(page).forEach(segment => {
        const attrDuration = segment.getAttribute("data-duration");
        if (attrDuration) {
            pageDuration += parseFloat(attrDuration);
        }
    });
    if (pageDuration < durationOfPagesWithoutNarration) {
        pageDuration = durationOfPagesWithoutNarration;
    }
    return pageDuration;
}

export function hidingPage() {
    // This causes problems. When we're hiding one page, we immediately show another.
    // If that page has no audio, we pause the player then.
    // If it DOES have audio, a pause here can interfere with playing it.
    //pausePlaying(); // Doesn't set AudioPaused state.  Caller sets NewPage state.
    clearTimeout(fakeNarrationTimer);
}

// Play the specified elements, one after the other. When the last completes (or at once if the array is empty),
// perform the 'then' action (typically used to play narration, which we put after videos).
//
// Note, there is a very similar function in narration.ts. It would be nice to combine them, but
// there are various reasons that is difficult at the moment. e.g.:
// 1. See comment below about sharing code with Bloom Desktop.
// 2. The other version handles play/pause which doesn't apply in BloomDesktop.
//
// (This function would be more natural in video.ts. But at least for now I'm trying to minimize the
// number of source files shared with Bloom Desktop, and we need this for Bloom Games.)
export function playAllVideo(elements: HTMLVideoElement[], then: () => void) {
    if (elements.length === 0) {
        then();
        return;
    }
    const video = elements[0];

    // If there is an error, try to continue with the next video.
    if (
        video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE &&
        video.readyState === HTMLMediaElement.HAVE_NOTHING
    ) {
        showVideoError(video);
        this.playAllVideo(elements.slice(1));
    } else {
        hideVideoError(video);
        // Review: do we need to do something to let the rest of the world know about this?
        setCurrentPlaybackMode(PlaybackMode.VideoPlaying);
        const promise = video.play();
        promise
            .then(() => {
                // The promise resolves when the video starts playing. We want to know when it ends.
                // Note: in Bloom Desktop, sometimes this event does not fire normally, even when the video is
                // played to the end.  I have not figured out why. It may be something to do with how we are
                // trimming the videos.
                // In Bloom Desktop, this is worked around by raising the ended event when we detect that it has
                // paused past the end point in resetToStartAfterPlayingToEndPoint.
                // In BloomPlayer,I don't think this is a problem. Videos are trimmed when published, so we always
                // play to the real end (unless the user pauses). So one way or another, we should get the ended
                // event.
                video.addEventListener(
                    "ended",
                    () => {
                        playAllVideo(elements.slice(1), then);
                    },
                    { once: true }
                );
            })
            .catch(reason => {
                console.error("Video play failed", reason);
                showVideoError(video);
                this.playAllVideo(elements.slice(1), then);
            });
    }
}

// These methods live here instead of video.ts because video.ts is already importing
// from narration.ts, and we don't want to create a circular dependency.

// We're living with this message not being localized.
const badVideoMessage = "Sorry, this video cannot be played in this browser.";

export function showVideoError(video: HTMLVideoElement): void {
    const parent = video.parentElement;
    if (parent) {
        const divs = parent.getElementsByClassName("video-error-message");
        if (divs.length === 0) {
            const msgDiv = parent.ownerDocument.createElement("div");
            msgDiv.className = "video-error-message normal-style";
            msgDiv.textContent = badVideoMessage;
            msgDiv.style.display = "block";
            msgDiv.style.color = "black";
            msgDiv.style.position = "absolute";
            msgDiv.style.left = "10%";
            msgDiv.style.top = "10%";
            msgDiv.style.width = "80%";
            msgDiv.style.fontSize = "x-large";
            parent.appendChild(msgDiv);
        }
    }
}
export function hideVideoError(video: HTMLVideoElement): void {
    const parent = video.parentElement;
    if (parent) {
        const divs = parent.getElementsByClassName("video-error-message");
        while (divs.length > 1) parent.removeChild(divs[0]);
    }
}
