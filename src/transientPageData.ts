// This class is a trivial wrapper for a singleton object that stores
// page data for the duration of a single run of bloom-player.
// The main reason for putting it in its own file and class is that
// two other classes both need to access it, and we don't want public
// things in page-api that are not intended for use by interactive pages.
class TransientPageData {
    private data: any = {};

    public getData(): any {
        return this.data;
    }

    public setData(arg: any) {
        this.data = arg;
    }
}

// This is the one instance of this class.
export const TransientPageDataSingleton = new TransientPageData();