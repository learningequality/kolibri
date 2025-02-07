export class BookInteraction {
    public lastNumberedPageWasRead: boolean = false; // has user read to last numbered page?

    // Time the user started reading this book
    public beginReadTime: number = Date.now();

    public totalAudioDuration: number = 0;
    public totalVideoDuration: number = 0;

    public reportedAudioOnCurrentPage: boolean = false;
    public reportedVideoOnCurrentPage: boolean = false;

    private pagesShown: Set<number> = new Set<number>(); // collection of (non-xmatter) pages shown
    private audioPagesShown: Set<number> = new Set<number>(); // collection of (non-xmatter) audio pages shown
    private videoPagesShown: Set<number> = new Set<number>(); // collection of (non-xmatter) video pages shown

    public getProgressReportPropertiesForAnalytics(): any {
        return {
            audioPages: this.audioPagesShown.size,
            nonAudioPages: this.pagesShown.size - this.audioPagesShown.size,
            videoPages: this.videoPagesShown.size,
            audioDuration: this.totalAudioDuration,
            videoDuration: this.totalVideoDuration,
            lastNumberedPageRead: this.lastNumberedPageWasRead,
            readDuration: Math.floor((Date.now() - this.beginReadTime) / 1000) // seconds spent reading this book
        };
    }

    public pageShown(index: number): void {
        this.pagesShown.add(index);
    }
    public audioPageShown(index: number): void {
        this.audioPagesShown.add(index);
    }
    public videoPageShown(index: number): void {
        this.videoPagesShown.add(index);
    }

    public clearPagesShown(): void {
        this.pagesShown.clear();
        this.audioPagesShown.clear();
        this.videoPagesShown.clear();
    }
}
