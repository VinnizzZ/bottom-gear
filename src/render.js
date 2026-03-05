const ROAD_WIDTH = 2000;
const SEGMENT_LENGTH = 200;
const CAMERA_HEIGHT = 1000;
const DRAW_DISTANCE = 300;

// Doom / Dark retro aesthetics
const COLORS = {
    sky: '#1a0000', // Crimson/black sky
    mountains: '#0a0000', // Silhouette
    grass1: '#210000', // Dark blood red
    grass2: '#1a0000', // Darker black-red
    road1: '#111111', // Very dark asphalt
    road2: '#0a0a0a',
    rumble1: '#770000', // Alert red
    rumble2: '#000000' // Absolute black
};

function drawQuad(ctx, color, x1, y1, w1, x2, y2, w2) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x2 - w2, y2);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x1 + w1, y1);
    ctx.fill();
}

export function renderGame(ctx, width, height, track, cameraZ, playerX, speed, timeMs, nitroActive, racers) {
    // Fill Sky
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, width, height);

    // Simulate basic mountain parallax by looking at curve at horizon
    let baseSegment = Math.floor(cameraZ / SEGMENT_LENGTH);
    let percent = ((cameraZ % SEGMENT_LENGTH) + SEGMENT_LENGTH) % SEGMENT_LENGTH / SEGMENT_LENGTH;
    let currentCurve = track[(baseSegment % track.length + track.length) % track.length].curve;
    let mountainsOffset = -(playerX * 100) - (currentCurve * 150);

    ctx.fillStyle = COLORS.mountains;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);

    // Parabolic peaks
    for (let i = 0; i <= 5; i++) {
        let xPos = (i * (width / 3)) + (mountainsOffset % (width / 3));
        if (xPos < -width) xPos += width * 2;
        if (xPos > width * 2) xPos -= width * 2;

        ctx.lineTo(xPos, height / 2 - 50 - ((i % 2) * 40));
    }
    ctx.lineTo(width, height / 2);
    ctx.fill();

    let maxy = height;

    let dx = -(percent * percent) * 1.5;
    let x = 0;

    // Project and render 3D road lines
    for (let n = 0; n < DRAW_DISTANCE; n++) {
        let segmentIndex = ((baseSegment + n) % track.length + track.length) % track.length;
        let segment = track[segmentIndex];

        let p3D = {
            x: playerX * ROAD_WIDTH - x,
            y: CAMERA_HEIGHT,
            z: (n + 1 - percent) * SEGMENT_LENGTH
        };

        // Pseudo 3D perspective projection
        let scale = 0.8 / (p3D.z / CAMERA_HEIGHT);

        segment.screen = {
            x: (width / 2) + p3D.x * scale,
            y: (height / 2) + p3D.y * scale,
            w: ROAD_WIDTH * scale
        };

        dx += segment.curve;
        x += dx;

        if (segment.screen.y >= maxy) continue;

        if (n > 0) {
            let prevIndex = ((baseSegment + n - 1) % track.length + track.length) % track.length;
            let prevPrj = track[prevIndex].screen;
            let prj = segment.screen;

            let colorMod = Math.floor(segmentIndex / 3) % 2;
            let grassColor = colorMod === 0 ? COLORS.grass1 : COLORS.grass2;
            let rumbleColor = colorMod === 0 ? COLORS.rumble1 : COLORS.rumble2;
            let roadColor = colorMod === 0 ? COLORS.road1 : COLORS.road2;

            // Render Grass
            ctx.fillStyle = grassColor;
            ctx.fillRect(0, prj.y, width, prevPrj.y - prj.y);

            // Render Rumble strips
            drawQuad(ctx, rumbleColor, prevPrj.x, prevPrj.y, prevPrj.w * 1.2, prj.x, prj.y, prj.w * 1.2);

            // Render Asphalt
            drawQuad(ctx, roadColor, prevPrj.x, prevPrj.y, prevPrj.w, prj.x, prj.y, prj.w);

            // Center Lane Marker
            if (colorMod === 0) {
                drawQuad(ctx, '#333333', prevPrj.x, prevPrj.y, prevPrj.w * 0.05, prj.x, prj.y, prj.w * 0.05);
            }

            // Start/Finish Line (Checkered pattern)
            if (segmentIndex < 3 || segmentIndex > track.length - 2) {
                let checkerColor = (segmentIndex % 2 === 0) ? '#ffffff' : '#000000';
                drawQuad(ctx, checkerColor, prevPrj.x, prevPrj.y, prevPrj.w, prj.x, prj.y, prj.w);

                // Draw opposite colors to make checkerboard
                checkerColor = (segmentIndex % 2 === 0) ? '#000000' : '#ffffff';
                let halfW = prevPrj.w / 2;
                drawQuad(ctx, checkerColor, prevPrj.x - halfW, prevPrj.y, halfW, prj.x - (prj.w / 2), prj.y, prj.w / 2);
                drawQuad(ctx, checkerColor, prevPrj.x + halfW, prevPrj.y, halfW, prj.x + (prj.w / 2), prj.y, prj.w / 2);
            }

            // Start/Finish Posts & Banner (Occurs strictly on segment 0)
            if (segmentIndex === 0) {
                let postWidth = prevPrj.w * 0.1;
                let postHeight = prevPrj.w * 1.5; // Tall enough to feel like a gate relative to road width

                // Left Post
                ctx.fillStyle = '#330000';
                ctx.fillRect(prevPrj.x - prevPrj.w - postWidth, prevPrj.y - postHeight, postWidth, postHeight);
                // Right Post
                ctx.fillRect(prevPrj.x + prevPrj.w, prevPrj.y - postHeight, postWidth, postHeight);

                // Top Banner
                let bannerHeight = postHeight * 0.2;
                let bannerY = prevPrj.y - postHeight;
                ctx.fillStyle = '#ffaa00'; // Retro orange background
                ctx.fillRect(prevPrj.x - prevPrj.w, bannerY, prevPrj.w * 2, bannerHeight);

                // Hanging Flags (triangles)
                ctx.fillStyle = '#770000';
                let flagCount = 6;
                let flagWidth = (prevPrj.w * 2) / flagCount;
                for (let f = 0; f < flagCount; f++) {
                    ctx.beginPath();
                    let fx = (prevPrj.x - prevPrj.w) + (f * flagWidth);
                    ctx.moveTo(fx, bannerY + bannerHeight);
                    ctx.lineTo(fx + flagWidth, bannerY + bannerHeight);
                    ctx.lineTo(fx + flagWidth / 2, bannerY + bannerHeight + (bannerHeight * 0.5));
                    ctx.fill();
                }

                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Font size scales with banner
                ctx.font = `bold ${Math.max(10, Math.floor(bannerHeight * 0.6))}px 'VT323', monospace`;
                ctx.fillText("BOTTOM GEAR WC", prevPrj.x, bannerY + (bannerHeight / 2));
            }
        }
        maxy = segment.screen.y;
    }

    // Process and draw Racers
    let visibleRacers = [];
    let trackLength = track.length * SEGMENT_LENGTH;

    for (let r of racers) {
        let racerZ = r.z;
        // Fix for racers crossing the finish line wrapping around
        if (racerZ < cameraZ && cameraZ > trackLength - DRAW_DISTANCE * SEGMENT_LENGTH) {
            racerZ += trackLength;
        }

        let zDist = racerZ - cameraZ;
        if (zDist > 0 && zDist < DRAW_DISTANCE * SEGMENT_LENGTH) {
            let n = zDist / SEGMENT_LENGTH;
            let percent = ((cameraZ % SEGMENT_LENGTH) + SEGMENT_LENGTH) % SEGMENT_LENGTH / SEGMENT_LENGTH;
            // Interpolate projection X based on segment curve
            // For simplicity, find the road center at this distance
            let segmentIndex = (Math.floor(racerZ / SEGMENT_LENGTH) % track.length + track.length) % track.length;
            let segment = track[segmentIndex];

            if (segment.screen && segment.screen.y < height) {
                visibleRacers.push({
                    racer: r,
                    screen: segment.screen,
                    z: zDist
                });
            }
        }
    }

    // Sort far to near
    visibleRacers.sort((a, b) => b.z - a.z);

    for (let vr of visibleRacers) {
        // We use the road scale at that distance
        let scaleFactor = vr.screen.w / ROAD_WIDTH;

        // Racer x is relative to road (-1 to 1). We add it to the tracked road center.
        let racerScreenX = vr.screen.x + (vr.racer.x * vr.screen.w);

        drawOpponentCar(ctx, racerScreenX, vr.screen.y, scaleFactor, vr.racer.color);
    }

    // Draw Player Car Spacecraft / Doom Vehicle
    drawCar(ctx, width / 2, height - 30, speed, timeMs, nitroActive);

    // Draw Trees (from back to front)
    for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
        let segmentIndex = ((baseSegment + n) % track.length + track.length) % track.length;
        let segment = track[segmentIndex];
        if (segment.trees && segment.screen) {
            for (let treeData of segment.trees) {
                let scaleFactor = segment.screen.w / ROAD_WIDTH;
                let treeX = segment.screen.x + (treeData.x * segment.screen.w);
                drawSpookyTree(ctx, treeX, segment.screen.y, scaleFactor);
            }
        }
    }
}

function drawSpookyTree(ctx, x, y, roadScale) {
    if (roadScale < 0.002) return;
    let scale = roadScale * 25; // Base height scale remains the same

    ctx.strokeStyle = '#2a2015'; // Slightly lighter "ghostly brown" to stand out from black mountains
    ctx.lineWidth = 3 * scale; // Slightly thicker trunk
    ctx.lineCap = 'round';

    // Trunk
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 50 * scale);
    ctx.stroke();

    // Recursive dry branches
    function drawBranch(bx, by, len, angle, depth) {
        if (depth === 0) return;
        let ex = bx + Math.cos(angle) * len;
        let ey = by + Math.sin(angle) * len;

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.lineWidth = depth * 1.2 * scale; // Thicker branches
        ctx.stroke();

        let spread = 0.7; // Wider branch spread
        drawBranch(ex, ey, len * 0.7, angle - spread, depth - 1);
        drawBranch(ex, ey, len * 0.7, angle + spread, depth - 1);
    }

    drawBranch(x, y - 25 * scale, 18 * scale, -Math.PI / 2 - 0.6, 3);
    drawBranch(x, y - 35 * scale, 15 * scale, -Math.PI / 2 + 0.7, 3);
    drawBranch(x, y - 50 * scale, 12 * scale, -Math.PI / 2, 2);
}

function drawOpponentCar(ctx, x, y, roadScale, color) {
    if (roadScale < 0.005) return;
    let scale = roadScale * 8;

    // Car Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 45 * scale, y - 4 * scale, 90 * scale, 8 * scale);

    // 1. Lower Chassis / Bumpers
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 35 * scale, y - 12 * scale, 70 * scale, 10 * scale);

    // 2. Main Body (The "Rat Rod" shape)
    // Hood/Engine area
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(x - 28 * scale, y - 10 * scale);
    ctx.lineTo(x + 28 * scale, y - 10 * scale);
    ctx.lineTo(x + 25 * scale, y - 22 * scale);
    ctx.lineTo(x - 25 * scale, y - 22 * scale);
    ctx.fill();

    // Cabin
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.moveTo(x - 20 * scale, y - 22 * scale);
    ctx.lineTo(x + 20 * scale, y - 22 * scale);
    ctx.lineTo(x + 15 * scale, y - 35 * scale);
    ctx.lineTo(x - 15 * scale, y - 35 * scale);
    ctx.fill();

    // 3. Windows (Grimy/Dark)
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.moveTo(x - 12 * scale, y - 24 * scale);
    ctx.lineTo(x + 12 * scale, y - 24 * scale);
    ctx.lineTo(x + 10 * scale, y - 32 * scale);
    ctx.lineTo(x - 10 * scale, y - 32 * scale);
    ctx.fill();

    // 4. Detailed Armor Plates (Rusted & Bolted)
    ctx.fillStyle = color; // Team color
    ctx.globalAlpha = 0.6;
    // Front guard
    ctx.fillRect(x - 32 * scale, y - 15 * scale, 10 * scale, 8 * scale);
    // Side panel
    ctx.fillRect(x + 15 * scale, y - 20 * scale, 18 * scale, 12 * scale);
    ctx.globalAlpha = 1.0;

    // Bolts on armor
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 28 * scale, y - 18 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 18 * scale, y - 12 * scale, 2 * scale, 2 * scale);

    // 5. Headlights (Dull/Broken yellow)
    ctx.fillStyle = '#554400';
    ctx.fillRect(x - 24 * scale, y - 18 * scale, 4 * scale, 3 * scale);
    ctx.fillRect(x + 20 * scale, y - 18 * scale, 4 * scale, 3 * scale);

    //  headlamp glow (faint)
    ctx.fillStyle = 'rgba(255, 200, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(x - 22 * scale, y - 16.5 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.arc(x + 22 * scale, y - 16.5 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 6. Wheels (Chunky & Rusted)
    ctx.fillStyle = '#000'; // Tire
    ctx.fillRect(x - 42 * scale, y - 14 * scale, 12 * scale, 14 * scale);
    ctx.fillRect(x + 30 * scale, y - 14 * scale, 12 * scale, 14 * scale);

    ctx.fillStyle = '#332211'; // Rusted Rim
    ctx.fillRect(x - 39 * scale, y - 11 * scale, 6 * scale, 8 * scale);
    ctx.fillRect(x + 33 * scale, y - 11 * scale, 6 * scale, 8 * scale);

    // 7. Spikes & Exhaust
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1 * scale;
    // Spikes forward
    ctx.beginPath();
    ctx.moveTo(x - 30 * scale, y - 10 * scale);
    ctx.lineTo(x - 35 * scale, y + 2 * scale);
    ctx.moveTo(x + 30 * scale, y - 10 * scale);
    ctx.lineTo(x + 35 * scale, y + 2 * scale);
    ctx.stroke();

    // Exhaust smoke/heat (small)
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 10 * scale, y - 25 * scale, 4 * scale, 4 * scale);
}

function drawCar(ctx, x, y, speed, timeMs, nitroActive) {
    const scale = 2.0; // Slightly larger for detail
    let bob = (speed > 10) ? Math.sin(timeMs / 50) * 2 : 0;
    y += bob;

    // Car Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 50 * scale, y - 5 * scale, 100 * scale, 12 * scale);

    // 1. Lower Body / Chassis (The base muscle car)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    // Rear bumper to front
    ctx.moveTo(x - 45 * scale, y - 8 * scale);
    ctx.lineTo(x + 45 * scale, y - 8 * scale);
    ctx.lineTo(x + 42 * scale, y - 22 * scale);
    ctx.lineTo(x - 42 * scale, y - 22 * scale);
    ctx.fill();

    // 2. Upper Cabin / Roof
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(x - 30 * scale, y - 22 * scale);
    ctx.lineTo(x + 30 * scale, y - 22 * scale);
    ctx.lineTo(x + 22 * scale, y - 42 * scale);
    ctx.lineTo(x - 22 * scale, y - 42 * scale);
    ctx.fill();

    // 3. Windows with Reflection
    ctx.fillStyle = '#000'; // Window base
    ctx.beginPath();
    ctx.moveTo(x - 22 * scale, y - 24 * scale);
    ctx.lineTo(x + 22 * scale, y - 24 * scale);
    ctx.lineTo(x + 18 * scale, y - 38 * scale);
    ctx.lineTo(x - 18 * scale, y - 38 * scale);
    ctx.fill();

    // Glass reflection
    ctx.fillStyle = 'rgba(100, 100, 120, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x - 15 * scale, y - 25 * scale);
    ctx.lineTo(x + 5 * scale, y - 25 * scale);
    ctx.lineTo(x - 10 * scale, y - 36 * scale);
    ctx.fill();

    // 4. Detailed Blower (Engine intake)
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 12 * scale, y - 28 * scale, 24 * scale, 14 * scale); // Blower body
    ctx.fillStyle = '#000'; // Top intake
    ctx.fillRect(x - 9 * scale, y - 30 * scale, 18 * scale, 4 * scale);
    // Rotating belt detail (if moving)
    if (speed > 0) {
        ctx.fillStyle = '#222';
        let beltPos = (timeMs / 40) % 8;
        ctx.fillRect(x - 11 * scale, y - 26 * scale + beltPos, 22 * scale, 2 * scale);
    }

    // 5. External Roll Cage & Spikes
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    // Left pillar
    ctx.moveTo(x - 32 * scale, y - 22 * scale);
    ctx.lineTo(x - 25 * scale, y - 44 * scale);
    // Right pillar
    ctx.moveTo(x + 32 * scale, y - 22 * scale);
    ctx.lineTo(x + 25 * scale, y - 44 * scale);
    // Roof bar
    ctx.moveTo(x - 25 * scale, y - 44 * scale);
    ctx.lineTo(x + 25 * scale, y - 44 * scale);
    ctx.stroke();

    // 6. Rusted Armor & Spikes
    ctx.fillStyle = '#3a2515'; // Rust
    ctx.fillRect(x - 44 * scale, y - 18 * scale, 15 * scale, 10 * scale); // panel
    ctx.fillRect(x + 28 * scale, y - 20 * scale, 12 * scale, 12 * scale); // panel

    // Tail lights (Dull red)
    ctx.fillStyle = '#400';
    ctx.fillRect(x - 38 * scale, y - 14 * scale, 6 * scale, 3 * scale);
    ctx.fillRect(x + 32 * scale, y - 14 * scale, 6 * scale, 3 * scale);

    // 7. Wheels (Modern but messy)
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 52 * scale, y - 16 * scale, 16 * scale, 20 * scale);
    ctx.fillRect(x + 36 * scale, y - 16 * scale, 16 * scale, 20 * scale);

    // 8. Nitro & Engine Fire (Detailed)
    if (nitroActive) {
        // Cyan glow
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.fillRect(x - 38 * scale, y - 8 * scale, 18 * scale, 6 * scale);
        ctx.fillRect(x + 20 * scale, y - 8 * scale, 18 * scale, 6 * scale);
        ctx.shadowBlur = 0;
    } else {
        // Hot metal exhaust
        ctx.fillStyle = '#662200';
        ctx.fillRect(x - 38 * scale, y - 8 * scale, 15 * scale, 3 * scale);
        ctx.fillRect(x + 23 * scale, y - 8 * scale, 15 * scale, 3 * scale);
    }

    if (speed > 10) {
        let fireSize = (speed / 12) + Math.random() * 6;
        let fireColor = nitroActive ? '#ffffff' : '#ff4400';
        ctx.fillStyle = fireColor;
        ctx.beginPath();
        ctx.arc(x - 30 * scale, y + 2 * scale, fireSize, 0, Math.PI * 2);
        ctx.arc(x + 30 * scale, y + 2 * scale, fireSize, 0, Math.PI * 2);
        ctx.fill();
        // Inner core
        ctx.fillStyle = nitroActive ? '#00ffff' : '#ffaa00';
        ctx.beginPath();
        ctx.arc(x - 30 * scale, y + 2 * scale, fireSize * 0.5, 0, Math.PI * 2);
        ctx.arc(x + 30 * scale, y + 2 * scale, fireSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function renderMirror(ctx, width, height, track, cameraZ, playerX, racers) {
    let trackLengthTotal = track.length * SEGMENT_LENGTH;
    cameraZ = (cameraZ + 3800) % trackLengthTotal; // Start mirror camera from the visual Player Car position

    // Fill Sky
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, width, height);

    // Mountains? Too much detail, keeping simple for mirror or inverted parallax
    ctx.fillStyle = COLORS.mountains;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    let baseSegment = Math.floor(cameraZ / SEGMENT_LENGTH);
    // When looking backward, we're essentially at the end of the segment looking reversed
    let percent = 1 - (((cameraZ % SEGMENT_LENGTH) + SEGMENT_LENGTH) % SEGMENT_LENGTH / SEGMENT_LENGTH);
    let maxy = height;

    let dx = 0;
    let x = 0;

    let trackLen = track.length;
    let mirrorDrawDist = 120; // Shorter distance for mirror performance/look

    for (let n = 0; n < mirrorDrawDist; n++) {
        // Go backwards in the track
        let segmentIndex = (baseSegment - n);
        while (segmentIndex < 0) segmentIndex += trackLen;
        segmentIndex = segmentIndex % trackLen;

        let segment = track[segmentIndex];

        let p3D = {
            x: -playerX * ROAD_WIDTH - x, // Invert playerX visually
            y: CAMERA_HEIGHT,
            z: (n + 1 - percent) * SEGMENT_LENGTH
        };

        let scale = 0.8 / (Math.max(1, p3D.z) / CAMERA_HEIGHT);

        // Multipliers to adjust standard 640x480 aspect to the mirror canvas aspect
        let ratioX = width / 640;
        let ratioY = height / 480;

        let prj = {
            x: (width / 2) + p3D.x * scale * ratioX,
            y: (height / 2) + p3D.y * scale * ratioY,
            w: ROAD_WIDTH * scale * ratioX
        };

        segment.mirrorScreen = prj;

        dx += -segment.curve; // Looking backwards, left curve looks like right curve
        x += dx;

        if (prj.y >= maxy) continue;

        if (n > 0) {
            let prevIndex = (baseSegment - n + 1);
            while (prevIndex < 0) prevIndex += trackLen;
            prevIndex = prevIndex % trackLen;
            let prevPrj = track[prevIndex].mirrorScreen;

            // Recompute color mod looking backwards
            let colorMod = Math.floor(segmentIndex / 3) % 2;
            let grassColor = colorMod === 0 ? COLORS.grass1 : COLORS.grass2;
            let rumbleColor = colorMod === 0 ? COLORS.rumble1 : COLORS.rumble2;
            let roadColor = colorMod === 0 ? COLORS.road1 : COLORS.road2;

            ctx.fillStyle = grassColor;
            ctx.fillRect(0, prj.y, width, prevPrj.y - prj.y);

            drawQuad(ctx, rumbleColor, prevPrj.x, prevPrj.y, prevPrj.w * 1.2, prj.x, prj.y, prj.w * 1.2);
            drawQuad(ctx, roadColor, prevPrj.x, prevPrj.y, prevPrj.w, prj.x, prj.y, prj.w);
            if (colorMod === 0) {
                drawQuad(ctx, '#333333', prevPrj.x, prevPrj.y, prevPrj.w * 0.05, prj.x, prj.y, prj.w * 0.05);
            }

            // Start/Finish Line in Mirror (Checkered pattern)
            if (segmentIndex < 3 || segmentIndex > track.length - 2) {
                let checkerColor = (segmentIndex % 2 === 0) ? '#ffffff' : '#000000';
                drawQuad(ctx, checkerColor, prevPrj.x, prevPrj.y, prevPrj.w, prj.x, prj.y, prj.w);

                // Draw opposite colors to make checkerboard
                checkerColor = (segmentIndex % 2 === 0) ? '#000000' : '#ffffff';
                let halfW = prevPrj.w / 2;
                drawQuad(ctx, checkerColor, prevPrj.x - halfW, prevPrj.y, halfW, prj.x - (prj.w / 2), prj.y, prj.w / 2);
                drawQuad(ctx, checkerColor, prevPrj.x + halfW, prevPrj.y, halfW, prj.x + (prj.w / 2), prj.y, prj.w / 2);
            }

            // Start Posts in Mirror
            if (segmentIndex === 0) {
                let postWidth = prevPrj.w * 0.1;
                let postHeight = prevPrj.w * 1.5;
                ctx.fillStyle = '#330000';
                ctx.fillRect(prevPrj.x - prevPrj.w - postWidth, prevPrj.y - postHeight, postWidth, postHeight);
                ctx.fillRect(prevPrj.x + prevPrj.w, prevPrj.y - postHeight, postWidth, postHeight);

                let bannerHeight = postHeight * 0.2;
                let bannerY = prevPrj.y - postHeight;
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(prevPrj.x - prevPrj.w, bannerY, prevPrj.w * 2, bannerHeight);

                // Hanging Flags in Mirror
                ctx.fillStyle = '#770000';
                let flagCount = 6;
                let flagWidth = (prevPrj.w * 2) / flagCount;
                for (let f = 0; f < flagCount; f++) {
                    ctx.beginPath();
                    let fx = (prevPrj.x - prevPrj.w) + (f * flagWidth);
                    ctx.moveTo(fx, bannerY + bannerHeight);
                    ctx.lineTo(fx + flagWidth, bannerY + bannerHeight);
                    ctx.lineTo(fx + flagWidth / 2, bannerY + bannerHeight + (bannerHeight * 0.5));
                    ctx.fill();
                }
            }
        }
        maxy = prj.y;
    }

    // Process Racers behind us
    let visibleRacers = [];

    for (let r of racers) {
        let racerZ = r.z;
        // Fix for racers that are just behind the player who just crossed the start line
        if (racerZ > cameraZ && cameraZ < mirrorDrawDist * SEGMENT_LENGTH) {
            racerZ -= trackLengthTotal;
        }

        let zDist = cameraZ - racerZ; // Positive means behind the player
        if (zDist > 0 && zDist < mirrorDrawDist * SEGMENT_LENGTH) {
            let segmentIndex = Math.floor(racerZ / SEGMENT_LENGTH);
            while (segmentIndex < 0) segmentIndex += trackLen;
            segmentIndex = segmentIndex % trackLen;
            let segment = track[segmentIndex];

            if (segment.mirrorScreen && segment.mirrorScreen.y < height) {
                visibleRacers.push({
                    racer: r,
                    screen: segment.mirrorScreen,
                    z: zDist
                });
            }
        }
    }

    // Sort far to near
    visibleRacers.sort((a, b) => b.z - a.z);

    for (let vr of visibleRacers) {
        let scaleFactor = vr.screen.w / ROAD_WIDTH;

        // Mirror inverts X
        let racerScreenX = vr.screen.x - (vr.racer.x * vr.screen.w);

        drawOpponentCar(ctx, racerScreenX, vr.screen.y, scaleFactor, vr.racer.color);
    }

    // Draw Trees in Mirror (back to front relative to mirror camera)
    for (let n = mirrorDrawDist - 1; n >= 0; n--) {
        let segmentIndex = (baseSegment - n);
        while (segmentIndex < 0) segmentIndex += trackLen;
        segmentIndex = segmentIndex % trackLen;
        let segment = track[segmentIndex];
        if (segment.trees && segment.mirrorScreen) {
            for (let treeData of segment.trees) {
                let scaleFactor = segment.mirrorScreen.w / ROAD_WIDTH;
                // Invert X for mirror
                let treeX = segment.mirrorScreen.x - (treeData.x * segment.mirrorScreen.w);
                drawSpookyTree(ctx, treeX, segment.mirrorScreen.y, scaleFactor);
            }
        }
    }
}
