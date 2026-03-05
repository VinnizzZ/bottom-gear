export const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    ShiftLeft: false,
    ShiftRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

export function isAccelerating() {
    return keys.ArrowUp || keys.w;
}

export function isBraking() {
    return keys.ArrowDown || keys.s;
}

export function isTurningLeft() {
    return keys.ArrowLeft || keys.a;
}

export function isTurningRight() {
    return keys.ArrowRight || keys.d;
}

// Nitro trigger event logic
let nitroCallback = null;

export function onNitro(callback) {
    nitroCallback = callback;
}

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;

    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (nitroCallback) {
            nitroCallback();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});
