// --- MODULAR TRENCH ALGORITHMS ---
export const TrenchAlgorithms = {
    sapperTrench: {
        Node: function (x, y, parent, g, h) { this.x = x; this.y = y; this.parent = parent; this.g = g; this.h = h; this.f = g + h; this.direction = parent ? { x: x - parent.x, y: y - parent.y } : { x: 0, y: 0 }; },
        findPath: function (grid, start, end) {
            let openList = []; let closedList = new Set();
            openList.push(new this.Node(start.x, start.y, null, 0, this.heuristic(start, end)));
            while (openList.length > 0) {
                let lowInd = 0;
                for (let i = 1; i < openList.length; i++) { if (openList[i].f < openList[lowInd].f) { lowInd = i; } }
                let currentNode = openList[lowInd];
                if (currentNode.x === end.x && currentNode.y === end.y) {
                    let path = []; let curr = currentNode;
                    while (curr.parent) { path.push({ x: curr.x, y: curr.y }); curr = curr.parent; }
                    return path.reverse();
                }
                openList.splice(lowInd, 1); closedList.add(`${currentNode.x},${currentNode.y}`);
                let neighbors = this.getNeighbors(grid, currentNode);
                for (let neighborPos of neighbors) {
                    if (closedList.has(`${neighborPos.x},${neighborPos.y}`)) continue;
                    let gScore = currentNode.g + 1;
                    if (grid[neighborPos.y][neighborPos.x] === 2) { gScore += 100; }
                    if (grid[neighborPos.y][neighborPos.x] === 3) { gScore -= 0.5; }
                    let hScore = this.heuristic(neighborPos, end);
                    let neighborNode = new this.Node(neighborPos.x, neighborPos.y, currentNode, gScore, hScore);
                    if (currentNode.parent && neighborNode.direction.x === currentNode.direction.x && neighborNode.direction.y === currentNode.direction.y) { neighborNode.g += 15; }
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    let existingNode = openList.find(n => n.x === neighborPos.x && n.y === neighborPos.y);
                    if (!existingNode || neighborNode.g < existingNode.g) {
                        if (existingNode) { openList.splice(openList.indexOf(existingNode), 1); }
                        openList.push(neighborNode);
                    }
                }
            }
            return null;
        },
        heuristic: function (pos0, pos1) { return Math.abs(pos1.x - pos0.x) + Math.abs(pos1.y - pos0.y); },
        getNeighbors: function (grid, node) {
            let ret = []; let x = node.x; let y = node.y;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let newX = x + dx; let newY = y + dy;
                    if (newX >= 0 && newX < grid[0].length && newY >= 0 && newY < grid.length && grid[newY][newX] !== 1) {
                        ret.push({ x: newX, y: newY });
                    }
                }
            }
            return ret;
        }
    },
    directApproach: {
        findPath: function (grid, start, end) {
            let path = [];
            let current = { x: start.x, y: start.y };
            path.push({ x: current.x, y: current.y });
            while (current.x !== end.x || current.y !== end.y) {
                let dx = Math.sign(end.x - current.x);
                let dy = Math.sign(end.y - current.y);
                current.x += dx;
                current.y += dy;
                if (grid[current.y] && grid[current.y][current.x] === 1) break;
                path.push({ x: current.x, y: current.y });
            }
            return path;
        }
    }
};