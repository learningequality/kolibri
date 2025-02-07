import LiteEvent from "./event";
import { BloomPlayerCore } from "./bloom-player-core";
import {
    logSound,
    logSoundPaused,
    logSoundRepeat
} from "./videoRecordingSupport";
import { PlaybackMode, currentPlaybackMode } from "./narration";

interface ISelection {
    id: number;
    src: string;
    volume: string;
}

// class Music contains functionality to get background music to play properly in bloom-player

export class Music {
    public urlPrefix: string;
    public PlayFailed: LiteEvent<HTMLElement>;

    private currentPage: HTMLDivElement;
    private selectionPlaying: ISelection | undefined;
    private pageIdToSelectionMap: Map<string, ISelection> = new Map<
        string,
        ISelection
    >();

    public pageHasMusic(page: HTMLElement): boolean {
        return this.pageIdToSelectionMap.has(this.getPageId(page));
    }

    public HandlePageVisible(bloomPage: HTMLElement) {
        this.currentPage = bloomPage as HTMLDivElement;
        if (!this.currentPage) {
            return; // should never happen
        }

        if (this.pageHasMusic(this.currentPage)) {
            this.listen();
        } else {
            this.getPlayer().pause();
        }
    }

    public hidingPage() {
        // music continues on the next page by default.
    }

    private listen() {
        this.setMusicSourceAndVolume();
        if (currentPlaybackMode === PlaybackMode.AudioPaused) {
            this.getPlayer().pause();
        } else {
            this.playerPlay();
        }
    }

    public play() {
        if (!this.currentPage) {
            return;
        }
        this.playerPlay();
    }

    public pause() {
        if (!this.currentPage) {
            return;
        }
        this.getPlayer().pause();
        logSoundPaused(this.musicLogIndex);
    }

    // Create the mapping of pages to music files so we know what to play
    // no matter how the user gets to the current page.
    public processAllMusicForBook(pages: HTMLCollectionOf<Element>) {
        this.pageIdToSelectionMap = new Map<string, ISelection>();
        let iSelection = -1;
        let selection: ISelection | undefined;
        for (let iPage = 0; iPage < pages.length; iPage++) {
            const page = pages[iPage];
            // The data-backgroundaudio attribute works like this:
            // If data-backgroundaudio is present and has a value, that page starts the music;
            // If data-backgroundaudio is NOT present, that page continues the music
            //   (if the previous page had music);
            // if data-backgroundaudio is present and has NO value, that page has no music
            //   (and nor will subsequent pages, until one has a non-empty data-backgroundaudio).
            const attrValue = page.getAttribute("data-backgroundaudio");
            if (attrValue !== null && attrValue !== "") {
                // Music starts on this page
                selection = {
                    id: ++iSelection,
                    src: attrValue,
                    volume: this.getMusicVolume(page)
                };
                this.pageIdToSelectionMap.set(this.getPageId(page), selection);
            } else if (attrValue === null) {
                if (selection) {
                    // Music continues on this page
                    this.pageIdToSelectionMap.set(
                        this.getPageId(page),
                        selection
                    );
                }
            } else {
                // No music on this page (or following pages until we get data-backgroundaudio)
                selection = undefined;
            }
        }
    }

    private getPageId(page: Element): string {
        return page.getAttribute("id") || "";
    }

    private getPlayer(): HTMLAudioElement {
        let player = document.querySelector(
            "#music-player"
        ) as HTMLAudioElement;
        if (!player) {
            player = document.createElement("audio") as HTMLAudioElement;
            player.setAttribute("id", "music-player");
            document.body.appendChild(player);

            // if we just pass the function, it has the wrong "this"
            player.addEventListener("ended", () => this.playEnded());
        }
        return player as HTMLAudioElement;
    }

    private setMusicSourceAndVolume(): void {
        const selection = this.pageIdToSelectionMap.get(
            this.getPageId(this.currentPage)
        );
        if (selection === undefined) {
            this.selectionPlaying = undefined;
            return; // should never happen
        }
        if (selection === this.selectionPlaying) {
            return;
        }
        this.selectionPlaying = selection;

        const music = selection.src;
        const volume = selection.volume;

        // Gecko has no way of knowing that we've created or modified the audio file,
        // so it will cache the previous content of the file or
        // remember if no such file previously existed. So we add a bogus query string
        // based on the current time so that it asks the server for the file again.
        let url = this.currentMusicUrl(
            music + "?nocache=" + new Date().getTime()
        );
        if (url.startsWith("blob")) {
            url = this.currentMusicUrl(music);
        }
        const player = this.getPlayer();
        player.setAttribute("src", music ? url : "");
        if (volume.length) {
            player.volume = Number(volume);
        }
        if (music) {
            this.musicLogIndex = logSound(
                url,
                volume.length ? Number(volume) : 1
            );
        }
    }

    private getMusicVolume(page: Element): string {
        if (!page) {
            return "";
        }
        const volume = page.getAttribute("data-backgroundaudiovolume");
        if (!volume) {
            return "";
        }
        return volume;
    }

    private musicLogIndex = -1;

    private currentMusicUrl(filename: string): string {
        let result = this.urlPrefix + "/audio/" + filename;
        if (filename.startsWith("_")) {
            result =
                "blob:http://" +
                this.urlPrefix.split("/").at(-2) +
                "/" +
                filename.substring(1);
        }
        return result;
    }

    private playEnded() {
        // just start playing all over again.
        this.getPlayer().currentTime = 0;
        this.play();
        this.musicLogIndex = logSoundRepeat(this.musicLogIndex);
    }

    private playerPlay() {
        const promise = this.getPlayer().play();

        // In newer browsers, play() returns a promise which fails
        // if the browser disobeys the command to play, as some do
        // if the user hasn't 'interacted' with the page in some
        // way that makes the browser think they are OK with it
        // playing audio. In Gecko45, the return value is undefined,
        // so we mustn't call catch.
        if (promise && promise.catch) {
            promise.catch((reason: any) => {
                console.log("could not play music: " + reason);

                // With some kinds of invalid sound file it keeps trying and plays over and over.
                this.getPlayer().pause();

                // Get all the state (and UI) set correctly again
                // Note that we don't want to do this if, for example, we asked the player to play
                // but hadn't actually configured any music to play, as easily happens when the
                // user clicks Play but the book has no music. We only want to do it if the thing
                // stopping us is the lack of user interaction.
                if (reason.name === "NotAllowedError" && this.PlayFailed) {
                    this.PlayFailed.raise();
                }
            });
        }
    }
}
