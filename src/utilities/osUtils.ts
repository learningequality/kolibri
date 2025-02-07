// Returns true if the operating system is Mac OS
export function isMacOS(): boolean {
    return navigator.platform.toLowerCase().indexOf("mac") === 0;
}

// Returns true if the operating system is iOS
export function isIOS(): boolean {
    const platform = navigator.platform.toLowerCase();
    return platform === "iphone" || platform === "ipod" || platform === "ipad";
}

// Returns true if the operating system is Mac OS or iOS
export function isMacOrIOS(): boolean {
    return isMacOS() || isIOS();
}
