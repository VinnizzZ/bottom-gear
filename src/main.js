import { isAccelerating, isBraking, isTurningLeft, isTurningRight, onNitro } from './input.js';
import { renderGame, renderMirror } from './render.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const mirrorCanvas = document.getElementById('mirrorCanvas');
const mirrorCtx = mirrorCanvas.getContext('2d');

// Game state
let speed = 0;
let maxSpeed = 200; // km/h
let accel = 1;
let decel = 2;
let breaking = 4;
let offRoadDecel = 6;
let centrifugalForce = 0.025;

let playerX = 0; // -1 to 1 is on road. < -1 or > 1 is grass.
let track = [];
let trackLength = 0;

let gameState = 'MENU'; // 'MENU' or 'RACING'

let nitros = 3;
let nitroActive = false;
let nitroTimer = 0;

let startTime = 0;
let lapStartTime = 0;
let laps = 0;
let maxLaps = 3;
const SEGMENT_LENGTH = 200;

// AI racers
let racers = [];
let totalBots = 3;
let playerPosition = 4;


// Track Generation
function buildTrack() {
    const sections = [
        { length: 200, curve: 0 },
        { length: 150, curve: 0.5 },
        { length: 100, curve: 0 },
        { length: 250, curve: -0.6 },
        { length: 150, curve: 0 },
        { length: 200, curve: 0.8 },
        { length: 200, curve: -0.8 },
        { length: 300, curve: 0 }
    ];

    for (let section of sections) {
        for (let i = 0; i < section.length; i++) {
            let curve = section.curve;
            // Smooth curve
            if (i < 20) curve = (i / 20) * section.curve;
            else if (i > section.length - 20) curve = ((section.length - i) / 20) * section.curve;

            let trees = [];
            // Randomly add trees (but not at the start/finish line area for clarity)
            // We'll calculate the total expected length based on sections
            const trackLengthTotalSegments = sections.reduce((acc, s) => acc + s.length, 0);
            let absoluteIndex = track.length;
            if (absoluteIndex > 10 && absoluteIndex < trackLengthTotalSegments - 10) {
                if (Math.random() < 0.05) { // 5% chance per segment
                    trees.push({
                        x: 2.0 + Math.random() * 2, // Right side
                        type: 'tree'
                    });
                }
                if (Math.random() < 0.05) {
                    trees.push({
                        x: -2.0 - Math.random() * 2, // Left side
                        type: 'tree'
                    });
                }
            }

            track.push({ curve: curve, trees: trees });
        }
    }
    trackLength = track.length * SEGMENT_LENGTH;
}

function initRacers() {
    racers = [];
    for (let i = 0; i < totalBots; i++) {
        racers.push({
            x: (Math.random() * 1.5) - 0.75, // Random lane
            z: (Math.random() * 800) - 400, // Start around the line
            laps: 0,
            speed: 130 + Math.random() * 40, // Different base speeds
            color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 40%)` // Dark random colors
        });
    }
}

buildTrack();
initRacers();

// Menu Logic
function showMenu(menuId) {
    document.querySelectorAll('.menu-overlay').forEach(m => m.classList.add('hidden'));
    document.getElementById(menuId).classList.remove('hidden');
}

document.getElementById('btn-start').addEventListener('click', () => {
    gameState = 'RACING';
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
});

document.getElementById('btn-difficulty').addEventListener('click', () => showMenu('difficulty-menu'));
document.getElementById('btn-map').addEventListener('click', () => showMenu('map-menu'));
document.getElementById('btn-tutorial').addEventListener('click', () => showMenu('tutorial-menu'));

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showMenu('main-menu'));
});

// Nitro event listener
onNitro(() => {
    if (gameState !== 'RACING') return;
    if (nitros > 0 && !nitroActive) {
        nitros--;
        nitroActive = true;
        nitroTimer = 4000;
        document.getElementById('nitro-count').innerText = '⚡'.repeat(nitros);
    }
});

let lastTime = 0;

function update(dt) {
    if (!lastTime) lastTime = dt;
    let deltaTime = dt - lastTime;
    lastTime = dt;

    if (gameState === 'MENU') {
        // Just render the background for the menu (using initial values)
        renderGame(ctx, canvas.width, canvas.height, track, cameraZ, playerX, 0, dt, false, racers);
        requestAnimationFrame(update);
        return;
    }

    // Initialize timing properly after first frame of racing
    if (startTime === 0) {
        startTime = dt;
        lapStartTime = dt;
    }

    if (nitroActive) {
        nitroTimer -= deltaTime;
        maxSpeed = 280;
        accel = 3;
        if (nitroTimer <= 0) {
            nitroActive = false;
            maxSpeed = 200;
            accel = 1;
        }
    }

    // Input processing
    if (isAccelerating() || nitroActive) { // Auto-accelerate when nitro is on to simulate the raw power!
        speed += accel;
    } else if (isBraking()) {
        speed -= breaking;
    } else {
        speed -= decel;
    }

    if (speed > maxSpeed) speed = maxSpeed;
    if (speed < 0) speed = 0;

    // Movement
    cameraZ += speed * (deltaTime / 16);

    if (cameraZ >= trackLength) {
        cameraZ -= trackLength;
        laps++;
        lapStartTime = dt;
    }

    // Steering
    let turnSpeed = 0.05 * (deltaTime / 16) * (speed / maxSpeed);
    // Base turning ability to allow returning to track from grass at low speeds
    turnSpeed = Math.max(0.015 * (deltaTime / 16), turnSpeed);

    if (isTurningLeft()) playerX += turnSpeed;
    if (isTurningRight()) playerX -= turnSpeed;

    // Curve physics
    let baseSegment = ((Math.floor(cameraZ / SEGMENT_LENGTH) % track.length) + track.length) % track.length;
    let curve = track[baseSegment].curve;
    if (speed > 0) {
        playerX -= curve * centrifugalForce * (speed / maxSpeed) * (deltaTime / 16);
    }

    // Grass slowdown
    if (playerX < -1.1 || playerX > 1.1) {
        if (speed > 50) speed -= offRoadDecel;
        if (playerX < -1.5) playerX = -1.5;
        if (playerX > 1.5) playerX = 1.5;
    }

    // AI Racers update & Colission
    let currentPosition = 1;
    // The player's visual car is projected around 3800 units in front of cameraZ
    let playerVisualZ = laps * trackLength + cameraZ + 3800;

    for (let i = 0; i < racers.length; i++) {
        let racer = racers[i];

        // Move AI forward
        racer.z += racer.speed * (deltaTime / 16);

        // Loop racer around track and count laps
        while (racer.z >= trackLength) {
            racer.z -= trackLength;
            racer.laps++;
        }

        // Calculate total distance for positions
        let racerDist = (racer.laps * trackLength) + racer.z;
        if (racerDist > playerVisualZ) {
            currentPosition++;
        }

        // Simple AI: Slowly drift towards center unless blocked
        if (Math.abs(racer.x) > 0.1) {
            racer.x -= Math.sign(racer.x) * 0.005;
        }

        // Collision detection
        let zDiff = racer.z - cameraZ;
        if (zDiff < 0) zDiff += trackLength; // Account for racer looping wrap-around

        // The player car is visually drawn at the bottom of the screen, which is projected roughly 3800 Z-units ahead of the root camera.
        // We check if the racer's Z is overlapping this visual player Z.
        if (zDiff > 3500 && zDiff < 4100 && Math.abs(racer.x - playerX) < 0.25) {
            // "Bater na traseira de um adversário reduz a velocidade em 30% e joga o carro do jogador levemente para o lado."
            // We only apply this if we are hitting them from behind (going faster than them)
            if (speed > racer.speed) {
                speed = racer.speed * 0.7; // Instantly drop speed to be 30% slower than them
                playerX += (playerX > racer.x) ? 0.1 : -0.1; // Push laterally slightly
            }
        }
    }
    playerPosition = currentPosition;

    // HUD Updates
    document.getElementById('pos-value').innerText = `${playerPosition}/${totalBots + 1}`;
    document.getElementById('speed-value').innerText = Math.floor(speed);
    document.getElementById('lap-count').innerText = `${Math.min(laps + 1, maxLaps)}/${maxLaps}`;
    document.getElementById('total-time').innerText = formatTime(dt - startTime);
    document.getElementById('lap-time').innerText = formatTime(dt - lapStartTime);

    // Render loop
    renderGame(ctx, canvas.width, canvas.height, track, cameraZ, playerX, speed, dt, nitroActive, racers);
    renderMirror(mirrorCtx, mirrorCanvas.width, mirrorCanvas.height, track, cameraZ, playerX, racers);

    requestAnimationFrame(update);
}

function formatTime(ms) {
    let date = new Date(Math.max(0, ms));
    let m = date.getMinutes().toString().padStart(2, '0');
    let s = date.getSeconds().toString().padStart(2, '0');
    let ml = Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0');
    return `${m}:${s}:${ml}`;
}

requestAnimationFrame(update);
