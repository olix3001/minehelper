module.exports = {
    waitForEvent: (emitter, name) => {
        return new Promise((resolve) => {
            emitter.once(name, (...data) => resolve(...data));
        });
    },
    wait: (ms) => {
        return new Promise((resolve) => setTimeout(() => resolve(), ms));
    }
}