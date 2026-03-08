export function logInfo(msg) { console.log(msg); }
export function logError(msg) { console.error(msg); }
export function logSuccess(msg) { console.log(msg); }

export async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
