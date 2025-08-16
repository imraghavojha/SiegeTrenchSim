import { TrenchAlgorithms } from './trenchAlgorithms.js';

// --- Global Variables and State ---
let sketch;
let canvas;

const state = {
    currentTool: 'select',
    fortType: 'square',
    walls: [],
    trenches: [],
    water: [],
    cannons: [],
    cannonballs: [],
    isDrawing: false,
    currentPath: [],
    selectedCannon: null,
    trenchStartPoint: null,
    infoMessage: 'Welcome! Use the tools to design your siege.',
};

// --- p5.js Sketch ---
const sketchFactory = (p) => {
    p.setup = () => {
        const container = document.getElementById('canvas-container');
        const containerSize = container.getBoundingClientRect();
        canvas = p.createCanvas(containerSize.width, containerSize.height);
        canvas.parent('canvas-container');
        p.background('#0f172a');
        p.strokeCap(p.ROUND);
        generateFort();
        updateInfoPanel();
    };

    p.draw = () => {
        p.background('#0f172a');
        drawGrid();
        drawWater();
        drawWalls();
        drawTrenches();
        drawCannons();

        state.cannonballs.forEach((ball, index) => {
            ball.update();
            ball.draw();
            if (ball.isOffscreen()) {
                state.cannonballs.splice(index, 1);
            }
        });

        if (state.isDrawing && state.currentPath.length > 1) {
            let color = '#94a3b8';
            if (state.currentTool === 'trench') color = '#a16207';
            if (state.currentTool === 'water') color = '#38bdf8';
            p.stroke(color);
            p.strokeWeight(state.currentTool === 'water' ? 20 : (state.currentTool === 'trench' ? 6 : 10));
            p.noFill();
            p.beginShape();
            state.currentPath.forEach(pt => p.vertex(pt.x, pt.y));
            p.endShape();
        }

        if (state.trenchStartPoint) {
            p.noFill();
            p.stroke(255, 255, 0, 200);
            p.strokeWeight(2);
            p.ellipse(state.trenchStartPoint.x, state.trenchStartPoint.y, 15, 15);
            p.line(state.trenchStartPoint.x - 10, state.trenchStartPoint.y, state.trenchStartPoint.x + 10, state.trenchStartPoint.y);
            p.line(state.trenchStartPoint.x, state.trenchStartPoint.y - 10, state.trenchStartPoint.x, state.trenchStartPoint.y + 10);
        }
    };

    const drawGrid = () => {
        p.stroke(255, 255, 255, 10); p.strokeWeight(1);
        for (let x = 0; x < p.width; x += 20) { p.line(x, 0, x, p.height); }
        for (let y = 0; y < p.height; y += 20) { p.line(0, y, p.width, y); }
    }

    const drawWater = () => {
        p.stroke(14, 116, 144, 150);
        p.fill(56, 189, 248, 100);
        p.strokeWeight(1);
        state.water.forEach(body => {
            p.beginShape();
            body.forEach(pt => p.vertex(pt.x, pt.y));
            p.endShape(p.CLOSE);
        });
    }

    const drawWalls = () => {
        p.stroke('#64748b'); p.strokeWeight(12); p.noFill();
        state.walls.forEach(wall => {
            p.beginShape();
            wall.forEach(pt => p.vertex(pt.x, pt.y));
            p.endShape(state.fortType !== 'custom' ? p.CLOSE : p.OPEN);
        });
    };

    const drawTrenches = () => {
        p.stroke('#a16207'); p.strokeWeight(8); p.noFill();
        state.trenches.forEach(trench => {
            p.beginShape();
            trench.forEach(pt => p.vertex(pt.x, pt.y));
            p.endShape();
        });
    };

    const drawCannons = () => {
        state.cannons.forEach((cannon, index) => {
            p.push();
            p.translate(cannon.x, cannon.y);
            if (state.selectedCannon === index) {
                p.noFill();
                p.stroke('#0ea5e9');
                p.strokeWeight(2);
                p.ellipse(0, 0, 45, 45);
            }
            p.rotate(p.radians(cannon.angle));
            p.fill('#334155'); p.noStroke(); p.ellipse(-5, 0, 30, 30);
            p.fill('#1e293b'); p.rect(0, -4, 25, 8);
            p.pop();
        });
    };

    p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        if (state.currentTool === 'select') {
            let clickedOnCannon = false;
            for (let i = state.cannons.length - 1; i >= 0; i--) {
                const cannon = state.cannons[i];
                if (p.dist(p.mouseX, p.mouseY, cannon.x, cannon.y) < 20) {
                    state.selectedCannon = i;
                    updateSlidersForSelectedCannon();
                    setInfo(`Cannon ${i + 1} selected. Adjust its settings.`);
                    clickedOnCannon = true;
                    break;
                }
            }
            if (!clickedOnCannon) {
                state.selectedCannon = null;
                setInfo('No cannon selected. Click one to modify it.');
            }
        } else if (state.currentTool === 'trench' || state.currentTool === 'wall' || state.currentTool === 'water') {
            state.isDrawing = true; state.currentPath = [{ x: p.mouseX, y: p.mouseY }];
        } else if (state.currentTool === 'cannon') {
            const angle = parseFloat(document.getElementById('cannon-angle').value);
            const power = parseFloat(document.getElementById('cannon-power').value);
            state.cannons.push({ x: p.mouseX, y: p.mouseY, angle: angle, power: power });
            setInfo(`Cannon placed. Place more or fire them all!`);
        } else if (state.currentTool === 'generateTrenchStart') {
            state.trenchStartPoint = { x: p.mouseX, y: p.mouseY };
            setTool('generateTrenchEnd');
        } else if (state.currentTool === 'generateTrenchEnd') {
            p.runTrenchGeneration(state.trenchStartPoint, { x: p.mouseX, y: p.mouseY });
            state.trenchStartPoint = null;
            setTool('select');
        } else if (state.currentTool === 'remove') {
            p.removeClosestElement();
        }
    };

    p.mouseDragged = () => { if (state.isDrawing) state.currentPath.push({ x: p.mouseX, y: p.mouseY }); };

    p.mouseReleased = () => {
        if (state.isDrawing) {
            state.isDrawing = false;
            if (state.currentPath.length > 1) {
                if (state.currentTool === 'trench') state.trenches.push(state.currentPath);
                else if (state.currentTool === 'wall') state.walls.push(state.currentPath);
                else if (state.currentTool === 'water') state.water.push(state.currentPath);
            }
            state.currentPath = [];
        }
    };

    p.windowResized = () => {
        const container = document.getElementById('canvas-container');
        const containerSize = container.getBoundingClientRect();
        p.resizeCanvas(containerSize.width, containerSize.height);
    };

    class Cannonball {
        constructor(x, y, angle, power, p5) {
            this.p = p5;
            this.pos = this.p.createVector(x, y);
            this.vel = this.p.constructor.Vector.fromAngle(this.p.radians(angle));
            this.vel.mult(power * 0.25);
            this.gravity = this.p.createVector(0, 0.2);
            this.path = [];
            this.stopped = false;

            this.willHit = this.predictHit();
            this.mode = this.willHit ? 'arc' : 'direct';
        }

        predictHit() {
            const lookAhead = 2000;
            const endPoint = this.p.createVector(this.pos.x + this.vel.x * lookAhead, this.pos.y + this.vel.y * lookAhead);
            const allObstacles = [...state.walls, ...state.trenches, ...state.water];
            for (const obstacle of allObstacles) {
                for (let i = 0; i < obstacle.length - 1; i++) {
                    const pt1 = obstacle[i];
                    const pt2 = obstacle[i + 1];
                    if (this.lineIntersect(this.pos.x, this.pos.y, endPoint.x, endPoint.y, pt1.x, pt1.y, pt2.x, pt2.y)) {
                        return true;
                    }
                }
            }
            return false;
        }

        update() {
            if (this.stopped) return;
            this.path.push(this.pos.copy());

            if (this.mode === 'arc') {
                this.vel.add(this.gravity);
            }

            this.pos.add(this.vel);
            this.checkCollisions();
        }

        checkCollisions() {
            if (this.path.length < 2) return;
            const lastPos = this.path[this.path.length - 2];
            const currentPos = this.pos;
            const allObstacles = [...state.walls, ...state.trenches, ...state.water];

            for (const obstacle of allObstacles) {
                for (let i = 0; i < obstacle.length - 1; i++) {
                    const pt1 = obstacle[i];
                    const pt2 = obstacle[i + 1];
                    if (this.lineIntersect(lastPos.x, lastPos.y, currentPos.x, currentPos.y, pt1.x, pt1.y, pt2.x, pt2.y)) {
                        this.stopped = true;
                        this.impactEffect();
                        return;
                    }
                }
            }
        }

        lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
            const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (den == 0) return false;
            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
            return t > 0 && t < 1 && u > 0 && u < 1;
        }
        impactEffect() { this.p.fill(251, 146, 60, 150); this.p.noStroke(); this.p.ellipse(this.pos.x, this.pos.y, 30, 30); }
        draw() {
            this.p.noStroke(); this.p.fill(255); this.p.ellipse(this.pos.x, this.pos.y, 10, 10);

            if (this.mode === 'arc') {
                this.p.stroke(255, 0, 0, 100); this.p.strokeWeight(2); this.p.noFill(); this.p.beginShape();
                this.path.forEach(pt => this.p.vertex(pt.x, pt.y));
                this.p.endShape();
            }
        }
        isOffscreen() { return (this.pos.y > this.p.height || this.pos.x < 0 || this.pos.x > this.p.width || this.pos.y < 0); }
    }

    p.fireAllCannons = () => {
        if (state.cannons.length > 0) {
            state.cannonballs = [];
            state.cannons.forEach(cannon => {
                state.cannonballs.push(new Cannonball(cannon.x, cannon.y, cannon.angle, cannon.power, p));
            });
            setInfo(`Volley of ${state.cannons.length} fired!`);
        } else { setInfo('You must place cannons first!'); }
    };

    p.runTrenchGeneration = (startCoords, endCoords) => {
        const selectedAlgorithm = document.getElementById('algorithm-select').value;
        const algorithm = TrenchAlgorithms[selectedAlgorithm];
        if (!algorithm) {
            setInfo(`Error: Algorithm '${selectedAlgorithm}' not found.`);
            return;
        }
        setInfo('Calculating path...');
        setTimeout(() => {
            const gridSize = 20; const gridW = Math.floor(p.width / gridSize); const gridH = Math.floor(p.height / gridSize);
            let grid = Array(gridH).fill(0).map(() => Array(gridW).fill(0));

            const markObstacles = (paths) => {
                paths.forEach(path => {
                    for (let i = 0; i < path.length - 1; i++) {
                        let ptsOnLine = p.dist(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y) / 5;
                        for (let j = 0; j <= ptsOnLine; j++) {
                            let x = p.lerp(path[i].x, path[i + 1].x, j / ptsOnLine); let y = p.lerp(path[i].y, path[i + 1].y, j / ptsOnLine);
                            let gx = Math.floor(x / gridSize); let gy = Math.floor(y / gridSize);
                            if (grid[gy] && grid[gy][gx] !== undefined) grid[gy][gx] = 1;
                        }
                    }
                });
            }
            markObstacles(state.walls);
            markObstacles(state.water);

            const dangerRadius = 5;
            state.cannons.forEach(cannon => {
                const gx = Math.floor(cannon.x / gridSize); const gy = Math.floor(cannon.y / gridSize);
                for (let y = gy - dangerRadius; y <= gy + dangerRadius; y++) {
                    for (let x = gx - dangerRadius; x <= gx + dangerRadius; x++) {
                        if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
                            if (p.dist(x, y, gx, gy) <= dangerRadius && grid[y][x] === 0) { grid[y][x] = 2; }
                        }
                    }
                }
            });
            state.trenches.forEach(trench => {
                for (let i = 0; i < trench.length - 1; i++) {
                    let ptsOnLine = p.dist(trench[i].x, trench[i].y, trench[i + 1].x, trench[i + 1].y) / 5;
                    for (let j = 0; j <= ptsOnLine; j++) {
                        let x = p.lerp(trench[i].x, trench[i + 1].x, j / ptsOnLine); let y = p.lerp(trench[i].y, trench[i + 1].y, j / ptsOnLine);
                        let gx = Math.floor(x / gridSize); let gy = Math.floor(y / gridSize);
                        if (grid[gy] && grid[gy][gx] === 0) grid[gy][gx] = 3;
                    }
                }
            });
            const start = { x: Math.floor(startCoords.x / gridSize), y: Math.floor(startCoords.y / gridSize) };
            const end = { x: Math.floor(endCoords.x / gridSize), y: Math.floor(endCoords.y / gridSize) };

            if (grid[start.y] && grid[start.y][start.x] === 1) { setInfo('Cannot start trench inside an obstacle!'); return; }
            if (grid[end.y] && grid[end.y][end.x] === 1) { setInfo('Cannot end trench inside an obstacle!'); return; }

            const path = algorithm.findPath(grid, start, end);
            if (path) {
                const canvasPath = path.map(node => ({ x: node.x * gridSize + gridSize / 2, y: node.y * gridSize + gridSize / 2 }));
                state.trenches.push(canvasPath);
                setInfo('Trench path generated!');
            } else { setInfo('Could not find a path!'); }
        }, 50);
    };

    p.removeClosestElement = () => {
        let closest = { distSq: Infinity, type: null, index: -1 };
        const clickPos = p.createVector(p.mouseX, p.mouseY);

        state.cannons.forEach((cannon, index) => {
            const dSq = p.dist(clickPos.x, clickPos.y, cannon.x, cannon.y) ** 2;
            if (dSq < closest.distSq) {
                closest = { distSq: dSq, type: 'cannons', index: index };
            }
        });

        const findClosestInPaths = (paths, type) => {
            paths.forEach((path, index) => {
                for (let i = 0; i < path.length - 1; i++) {
                    const dSq = distToSegment(clickPos, path[i], path[i + 1]);
                    if (dSq < closest.distSq) {
                        closest = { distSq: dSq, type: type, index: index };
                    }
                }
            });
        };
        findClosestInPaths(state.trenches, 'trenches');
        findClosestInPaths(state.walls, 'walls');
        findClosestInPaths(state.water, 'water');

        if (closest.distSq < 400) {
            const typeName = closest.type.slice(0, -1);
            if (closest.type === 'cannons') {
                if (state.selectedCannon === closest.index) {
                    state.selectedCannon = null;
                } else if (state.selectedCannon > closest.index) {
                    state.selectedCannon--;
                }
            }
            state[closest.type].splice(closest.index, 1);
            setInfo(`${typeName.charAt(0).toUpperCase() + typeName.slice(1)} removed.`);
        } else {
            setInfo('Nothing to remove. Click closer to an element.');
        }
    };

    function distSq(v, w) { return p.pow(v.x - w.x, 2) + p.pow(v.y - w.y, 2) }
    function distToSegment(click, v, w) {
        const l2 = distSq(v, w);
        if (l2 == 0) return distSq(click, v);
        let t = ((click.x - v.x) * (w.x - v.x) + (click.y - v.y) * (w.y - v.y)) / l2;
        t = p.max(0, p.min(1, t));
        return distSq(click, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
    }
};

// --- Helper Functions and Event Listeners ---
function setTool(tool) {
    state.currentTool = tool;
    document.querySelectorAll('#controls .btn').forEach(b => {
        b.classList.remove('btn-active');
        b.classList.remove('btn-danger-active');
    });

    let elementToActivate;
    if (tool === 'generateTrenchStart' || tool === 'generateTrenchEnd') {
        elementToActivate = document.getElementById('generate-trench-button');
    } else {
        elementToActivate = document.getElementById(`tool-${tool}`);
    }

    if (elementToActivate) {
        if (tool === 'remove') {
            elementToActivate.classList.add('btn-danger-active');
        } else {
            elementToActivate.classList.add('btn-active');
        }
    }

    if (tool === 'generateTrenchStart') { setInfo('Click a starting point for the trench.'); }
    else if (tool === 'generateTrenchEnd') { setInfo('Click an ending point for the trench.'); }
    else if (tool === 'wall' && state.fortType !== 'custom') {
        state.fortType = 'custom'; document.getElementById('fort-select').value = 'custom'; state.walls = [];
        setInfo('Switched to Custom fort. Draw your walls!');
    } else {
        setInfo(`Tool selected: ${tool}.`);
    }
}

function setInfo(message) { state.infoMessage = message; updateInfoPanel(); }
function updateInfoPanel() { document.getElementById('info-panel').textContent = state.infoMessage; }

function updateSlidersForSelectedCannon() {
    if (state.selectedCannon !== null && state.cannons[state.selectedCannon]) {
        const cannon = state.cannons[state.selectedCannon];
        document.getElementById('cannon-angle').value = cannon.angle;
        document.getElementById('angle-value').textContent = Math.round(cannon.angle);
        document.getElementById('cannon-power').value = cannon.power;
        document.getElementById('power-value').textContent = cannon.power;
    }
}

function generateFort() {
    state.walls = [];
    const w = sketch ? sketch.width : document.getElementById('canvas-container').getBoundingClientRect().width;
    const h = sketch ? sketch.height : document.getElementById('canvas-container').getBoundingClientRect().height;
    const cx = w / 2; const cy = h / 2; let size = Math.min(w, h) * 0.3;
    switch (state.fortType) {
        case 'square': state.walls.push([{ x: cx - size / 2, y: cy - size / 2 }, { x: cx + size / 2, y: cy - size / 2 }, { x: cx + size / 2, y: cy + size / 2 }, { x: cx - size / 2, y: cy + size / 2 }]); break;
        case 'circular':
            let circlePoints = [];
            for (let a = 0; a <= 360; a += 10) {
                // FIX: Use the 'sketch' instance to call radians()
                let rad = sketch.radians(a);
                circlePoints.push({ x: cx + (size / 2) * Math.cos(rad), y: cy + (size / 2) * Math.sin(rad) });
            }
            state.walls.push(circlePoints);
            break;
        case 'star':
            let starPoints = []; const outerRadius = size / 2; const innerRadius = size / 4; const points = 5;
            for (let i = 0; i <= points * 2; i++) {
                let radius = i % 2 === 0 ? outerRadius : innerRadius;
                // FIX: Use the 'sketch' instance to call radians()
                let angle = sketch.radians(i * (360 / (points * 2)) - 90);
                starPoints.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
            }
            state.walls.push(starPoints);
            break;
    }
}

function resetSimulation() {
    state.trenches = []; state.walls = []; state.water = []; state.cannons = []; state.cannonballs = []; state.selectedCannon = null; state.trenchStartPoint = null;
    if (state.fortType !== 'custom') { generateFort(); } else { state.walls = []; }
    setInfo('Simulation reset. Rebuild your defenses!');
    setTool('select');
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    // This creates the p5 instance and assigns it to our global 'sketch' variable
    sketch = new p5(sketchFactory);

    document.getElementById('tool-select').addEventListener('click', () => setTool('select'));
    document.getElementById('tool-trench').addEventListener('click', () => setTool('trench'));
    document.getElementById('tool-wall').addEventListener('click', () => setTool('wall'));
    document.getElementById('tool-cannon').addEventListener('click', () => setTool('cannon'));
    document.getElementById('tool-water').addEventListener('click', () => setTool('water'));
    document.getElementById('tool-remove').addEventListener('click', () => setTool('remove'));
    document.getElementById('fort-select').addEventListener('change', (e) => {
        state.fortType = e.target.value; resetSimulation();
        setInfo(`Loaded ${e.target.options[e.target.selectedIndex].text}. Start designing!`);
    });
    document.getElementById('cannon-angle').addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('angle-value').textContent = value;
        if (state.selectedCannon !== null && state.cannons[state.selectedCannon]) {
            state.cannons[state.selectedCannon].angle = parseFloat(value);
        }
    });
    document.getElementById('cannon-power').addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('power-value').textContent = value;
        if (state.selectedCannon !== null && state.cannons[state.selectedCannon]) {
            state.cannons[state.selectedCannon].power = parseFloat(value);
        }
    });
    document.getElementById('fire-button').addEventListener('click', () => sketch.fireAllCannons());
    document.getElementById('reset-button').addEventListener('click', () => resetSimulation());
    document.getElementById('generate-trench-button').addEventListener('click', () => {
        setTool('generateTrenchStart');
    });

    setTool('select');
});