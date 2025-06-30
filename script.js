const labels = [
  'Alpha', 'Beta', 'Gamma', 'Delta',
  'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota',
  'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi',
  'Omicron', 'Pi', 'Rho', 'Sigma'
];

const hexGrid = document.getElementById('hexGrid');

// Hexagon dimensions
const hexWidth = 115;
const hexHeight = 115;

// Tiling offsets
const colSpacing = hexWidth;
const rowSpacing = hexHeight;

// Grid size
const gridCols = 6;
const gridRows = 6;

// Store grid as [row][col]
const grid = Array.from({ length: gridRows }, () =>
  Array(gridCols).fill(null)
);

function getGridPosition(col, row) {
  const x = col * hexWidth;
  const y = row * hexHeight + (col % 2 === 1 ? rowSpacing / 2 : 0);
  return { x, y };
}

function getClosestGridCell(x, y) {
  let closest = { col: 0, row: 0, dist: Infinity };

  for (let col = 0; col < gridCols; col++) {
    for (let row = 0; row < gridRows; row++) {
      const { x: gx, y: gy } = getGridPosition(col, row);
      const dx = gx - x;
      const dy = gy - y;
      const dist = dx * dx + dy * dy;

      if (dist < closest.dist) {
        closest = { col, row, dist };
      }
    }
  }

  return closest;
}

function placeHexes() {
  let labelIndex = 0;

  for (let col = 0; col < gridCols; col++) {
    for (let row = 0; row < gridRows; row++) {
      if (labelIndex >= labels.length) return;

      const label = labels[labelIndex++];
      const hex = document.createElement('div');
      hex.className = 'hex';
      hex.textContent = label;
      hex.draggable = true;

      const { x, y } = getGridPosition(col, row);
      hex.style.left = `${x}px`;
      hex.style.top = `${y}px`;

      hex.dataset.col = col;
      hex.dataset.row = row;

      grid[row][col] = hex;

      // Drag events
      hex.addEventListener('dragstart', handleDragStart);
      hex.addEventListener('dragend', handleDragEnd);

      hexGrid.appendChild(hex);
    }
  }
}

let draggedTile = null;

function handleDragStart(e) {
  draggedTile = this;
  this.classList.add('dragging');

  const prevCol = +this.dataset.col;
  const prevRow = +this.dataset.row;
  if (grid[prevRow] && grid[prevRow][prevCol] === this) {
    grid[prevRow][prevCol] = null;
  }

  e.dataTransfer.setData('text/plain', null); // Firefox fix
}

function handleDragEnd(e) {
  this.classList.remove('dragging');

  const gridRect = hexGrid.getBoundingClientRect();
  const mouseX = e.clientX - gridRect.left;
  const mouseY = e.clientY - gridRect.top;

  const { col, row } = getClosestGridCell(mouseX, mouseY);

  if (
    col >= gridCols || row >= gridRows ||
    col < 0 || row < 0 ||
    grid[row]?.[col]
  ) {
    // Snap back
    const originalCol = +this.dataset.col;
    const originalRow = +this.dataset.row;
    const { x, y } = getGridPosition(originalCol, originalRow);
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    grid[originalRow][originalCol] = this;
    return;
  }

  // Snap to new position
  const { x, y } = getGridPosition(col, row);
  this.style.left = `${x}px`;
  this.style.top = `${y}px`;
  this.dataset.col = col;
  this.dataset.row = row;
  grid[row][col] = this;
}

placeHexes();
