
        document.addEventListener('DOMContentLoaded', function() {
            const hexContainer = document.getElementById('hexContainer');
            const hexGrid = document.getElementById('hexGrid');
            const spreadsheetData = document.getElementById('spreadsheetData');
            const csvUrl = document.getElementById('csvUrl');
            const loadFromUrlBtn = document.getElementById('loadFromUrl');
            const refreshDataBtn = document.getElementById('refreshData');
            const applyDataBtn = document.getElementById('applyData');
            const copyCSVBtn = document.getElementById('copyCSV');
            const copySuccess = document.getElementById('copySuccess');
            const resetBtn = document.getElementById('resetBtn');
            const toggleGridBtn = document.getElementById('toggleGridBtn');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const resetViewBtn = document.getElementById('resetViewBtn');
            const zoomLevelDisplay = document.getElementById('zoomLevel');
            const loadingIndicator = document.getElementById('loadingIndicator');
            const errorMessage = document.getElementById('errorMessage');
            const column1Filters = document.getElementById('column1Filters');
            const column2Filters = document.getElementById('column2Filters');
            const column1FilterCount = document.getElementById('column1FilterCount');
            const column2FilterCount = document.getElementById('column2FilterCount');
            const visibleCount = document.getElementById('visibleCount');
            
            // Column indices (0-based internally)
            const COLUMN_ID = 0;
            const COLUMN_1 = 0;  // First column for filtering
            const COLUMN_2 = 1;  // Second column for filtering
            const COLUMN_TITLE = 3;  // 4th column
            const COLUMN_CONTENT = 4; // 5th column
            const COLUMN_X_POS = 5;   // 7th column
            const COLUMN_Y_POS = 6;   // 8th column
            
            let showGrid = true;
            let hexTiles = [];
            let gridPoints = [];
            let gridPointsMap = new Map(); // Map to store grid points by coordinates
            let activeHex = null;
            let offsetX = 0;
            let offsetY = 0;
            let hexData = [];
            let currentUrl = '';
            let visibleHexagons = 0;
            let isDragging = false;
            
            // Filter state
            let column1Values = new Set();
            let column2Values = new Set();
            let activeColumn1Filters = new Set();
            let activeColumn2Filters = new Set();
            
            // Pan and zoom variables
            let isPanning = false;
            let startPoint = { x: 0, y: 0 };
            let endPoint = { x: 0, y: 0 };
            let scale = 1;
            let originX = 2500;
            let originY = 2500;
            
            // Hex grid parameters
            const hexWidth = 220;
            const hexHeight = 250;
            const horizontalSpacing = hexWidth * 0.9;
            const verticalSpacing = hexHeight * 0.8;
            
            // Colors for the hexagons
            const colors = [
                '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
                '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b',
                '#27ae60', '#8e44ad', '#2980b9', '#f1c40f', '#e67e22'
            ];
            
            // Initialize the grid position
            updateGridTransform();
            
            // Toggle filter section visibility
            window.toggleFilterSection = function(contentId) {
                const content = document.getElementById(contentId);
                const header = content.previousElementSibling;
                const chevron = header.querySelector('.chevron');
                
                if (content.classList.contains('hidden')) {
                    content.classList.remove('hidden');
                    chevron.classList.add('open');
                } else {
                    content.classList.add('hidden');
                    chevron.classList.remove('open');
                }
            };
            
            // Select all filters for a column
            window.selectAllFilters = function(columnType) {
                const checkboxes = document.querySelectorAll(`#${columnType}Filters input[type="checkbox"]`);
                checkboxes.forEach(checkbox => {
                    checkbox.checked = true;
                });
                
                if (columnType === 'column1') {
                    activeColumn1Filters = new Set([...column1Values]);
                } else if (columnType === 'column2') {
                    activeColumn2Filters = new Set([...column2Values]);
                }
                
                applyFilters();
            };
            
            // Clear all filters for a column
            window.clearAllFilters = function(columnType) {
                const checkboxes = document.querySelectorAll(`#${columnType}Filters input[type="checkbox"]`);
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                if (columnType === 'column1') {
                    activeColumn1Filters.clear();
                } else if (columnType === 'column2') {
                    activeColumn2Filters.clear();
                }
                
                applyFilters();
            };
            
            // Create filter checkboxes for a column
            function createFilterCheckboxes(columnValues, containerId, columnType, activeFilters) {
                const container = document.getElementById(containerId);
                container.innerHTML = '';
                
                // Sort values alphabetically
                const sortedValues = [...columnValues].sort();
                
                sortedValues.forEach(value => {
                    const checkboxDiv = document.createElement('div');
                    checkboxDiv.className = 'filter-checkbox';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `${columnType}-${value}`;
                    checkbox.value = value;
                    checkbox.checked = activeFilters.has(value);
                    
                    checkbox.addEventListener('change', function() {
                        if (this.checked) {
                            activeFilters.add(value);
                        } else {
                            activeFilters.delete(value);
                        }
                        applyFilters();
                    });
                    
                    const label = document.createElement('label');
                    label.htmlFor = `${columnType}-${value}`;
                    label.textContent = value || '(empty)';
                    
                    checkboxDiv.appendChild(checkbox);
                    checkboxDiv.appendChild(label);
                    container.appendChild(checkboxDiv);
                });
                
                // Update filter count badge
                const countElement = document.getElementById(`${columnType}FilterCount`);
                countElement.textContent = columnValues.size;
            }
            
            // Apply filters to hexagons
            function applyFilters() {
                // Clear all existing hexagons from the grid
                hexTiles.forEach(tile => {
                    if (tile.parentNode) {
                        tile.parentNode.removeChild(tile);
                    }
                });
                hexTiles = [];
                
                // Count visible hexagons
                visibleHexagons = 0;
                
                // Create only the hexagons that match the filter criteria
                hexData.forEach((item, index) => {
                    const column1Value = item.allValues[COLUMN_1] || '';
                    const column2Value = item.allValues[COLUMN_2] || '';
                    
                    const passesColumn1Filter = activeColumn1Filters.size === 0 || activeColumn1Filters.has(column1Value);
                    const passesColumn2Filter = activeColumn2Filters.size === 0 || activeColumn2Filters.has(column2Value);
                    
                    if (passesColumn1Filter && passesColumn2Filter) {
                        createHexTile(item, index);
                        visibleHexagons++;
                    }
                });
                
                // Update visible count display
                updateVisibleCount();
                
                // Create grid points around visible hexagons
                createGridPoints();
            }
            
            // Update visible count display
            function updateVisibleCount() {
                visibleCount.textContent = `Showing ${visibleHexagons} of ${hexData.length} hexagons`;
            }
            
            // Create a single hex tile
            function createHexTile(item, index) {
                const hexTile = document.createElement('div');
                hexTile.className = 'hex-tile';
                hexTile.dataset.index = index;
                hexTile.dataset.id = item.id;
                hexTile.dataset.column1 = item.allValues[COLUMN_1] || '';
                hexTile.dataset.column2 = item.allValues[COLUMN_2] || '';
                
                // Position based on stored coordinates or default spiral
                let x, y;
                
                if (item.x && item.y) {
                    x = item.x;
                    y = item.y;
                } else {
                    // Fallback to spiral pattern if no coordinates
                    const angle = (index / hexData.length) * Math.PI * 6;
                    const spiralFactor = 1 + (index / hexData.length) * 2;
                    const radius = 250 * spiralFactor;
                    x = Math.cos(angle) * radius + originX;
                    y = Math.sin(angle) * radius + originY;
                    
                    // Update the data with these coordinates
                    item.x = x;
                    item.y = y;
                }
                
                hexTile.style.left = `${x - hexWidth/2}px`;
                hexTile.style.top = `${y - hexHeight/2}px`;
                
                const hexShape = document.createElement('div');
                hexShape.className = 'hex-shape';
                hexShape.style.backgroundColor = colors[index % colors.length];
                
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'hex-content-wrapper';
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'hex-content';
                
                if (item.title) {
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'hex-title';
                    titleDiv.textContent = item.title;
                    contentDiv.appendChild(titleDiv);
                }
                
                if (item.content) {
                    const paragraphDiv = document.createElement('div');
                    paragraphDiv.className = 'hex-paragraph';
                    paragraphDiv.textContent = item.content;
                    contentDiv.appendChild(paragraphDiv);
                    
                    // Adjust font size based on content length
                    adjustFontSize(contentDiv, item.content);
                }
                
                contentWrapper.appendChild(contentDiv);
                hexShape.appendChild(contentWrapper);
                hexTile.appendChild(hexShape);
                hexGrid.appendChild(hexTile);
                hexTiles.push(hexTile);
                
                // Add drag functionality
                hexTile.addEventListener('mousedown', startDrag);
                hexTile.addEventListener('touchstart', startDrag);
            }
            
            // Generate a unique key for grid point coordinates
            function getGridPointKey(x, y) {
                return `${Math.round(x)},${Math.round(y)}`;
            }
            
            // Create a single grid point if it doesn't exist
            function createGridPoint(x, y) {
                const key = getGridPointKey(x, y);
                
                // Check if this grid point already exists
                if (gridPointsMap.has(key)) {
                    return gridPointsMap.get(key);
                }
                
                const gridPoint = document.createElement('div');
                gridPoint.className = 'grid-point';
                gridPoint.style.left = `${x}px`;
                gridPoint.style.top = `${y}px`;
                gridPoint.dataset.x = x;
                gridPoint.dataset.y = y;
                gridPoint.style.display = showGrid ? 'block' : 'none';
                
                hexGrid.appendChild(gridPoint);
                gridPoints.push(gridPoint);
                gridPointsMap.set(key, gridPoint);
                
                return gridPoint;
            }
            
            // Create grid points around visible hexagons
            function createGridPoints() {
                // Clear existing grid points
                gridPoints.forEach(point => point.remove());
                gridPoints = [];
                gridPointsMap.clear();
                
                // If no hexagons are visible, create a default grid
                if (visibleHexagons === 0) {
                    createDefaultGrid();
                    return;
                }
                
                // Find the bounds of visible hexagons
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                
                hexTiles.forEach(tile => {
                    const x = parseFloat(tile.style.left) + hexWidth/2;
                    const y = parseFloat(tile.style.top) + hexHeight/2;
                    
                    minX = Math.min(minX, x - horizontalSpacing * 3);
                    maxX = Math.max(maxX, x + horizontalSpacing * 3);
                    minY = Math.min(minY, y - verticalSpacing * 3);
                    maxY = Math.max(maxY, y + verticalSpacing * 3);
                });
                
                // Create grid points within the bounds
                const gridStepX = horizontalSpacing;
                const gridStepY = verticalSpacing;
                
                for (let y = minY; y <= maxY; y += gridStepY) {
                    const rowOffset = Math.floor((y - minY) / gridStepY) % 2 === 0 ? 0 : gridStepX / 2;
                    
                    for (let x = minX + rowOffset; x <= maxX; x += gridStepX) {
                        createGridPoint(x, y);
                    }
                }
            }
            
            // Create a default grid around the origin
            function createDefaultGrid() {
                const gridSize = 10; // Number of grid points in each direction
                const gridStepX = horizontalSpacing;
                const gridStepY = verticalSpacing;
                
                for (let row = -gridSize; row <= gridSize; row++) {
                    const rowOffset = row % 2 === 0 ? 0 : gridStepX / 2;
                    
                    for (let col = -gridSize; col <= gridSize; col++) {
                        const x = originX + col * gridStepX + rowOffset;
                        const y = originY + row * gridStepY;
                        
                        createGridPoint(x, y);
                    }
                }
            }
            
            // Generate grid points around a specific position
            function generateGridPointsAroundPosition(x, y, radius = 3) {
                const gridStepX = horizontalSpacing;
                const gridStepY = verticalSpacing;
                
                // Calculate grid coordinates
                const centerGridY = Math.round(y / gridStepY) * gridStepY;
                const isEvenRow = Math.round((centerGridY - originY) / gridStepY) % 2 === 0;
                const centerGridX = Math.round((x - (isEvenRow ? 0 : gridStepX / 2)) / gridStepX) * gridStepX + (isEvenRow ? 0 : gridStepX / 2);
                
                // Generate grid points in a radius around the center
                for (let row = -radius; row <= radius; row++) {
                    for (let col = -radius; col <= radius; col++) {
                        const rowOffset = (isEvenRow ? row : row + 1) % 2 === 0 ? 0 : gridStepX / 2;
                        const gridX = centerGridX + col * gridStepX + rowOffset;
                        const gridY = centerGridY + row * gridStepY;
                        
                        createGridPoint(gridX, gridY);
                    }
                }
            }
            
            // Load CSV data from URL
            async function loadCSVFromUrl(url) {
                if (!url) {
                    showError("Please enter a URL");
                    return;
                }
                
                showLoading(true);
                currentUrl = url;
                
                try {
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    
                    const csvText = await response.text();
                    spreadsheetData.value = csvText;
                    hideError();
                    createHexTiles();
                } catch (error) {
                    console.error("Error loading CSV:", error);
                    showError("Failed to load CSV data. Please check the URL and try again.");
                } finally {
                    showLoading(false);
                }
            }
            
            // Show loading indicator
            function showLoading(show) {
                loadingIndicator.style.display = show ? 'block' : 'none';
            }
            
            // Show error message
            function showError(message) {
                errorMessage.textContent = message;
                errorMessage.style.display = 'block';
            }
            
            // Hide error message
            function hideError() {
                errorMessage.style.display = 'none';
            }
            
            // Parse CSV data from textarea
            function parseCSVData() {
                const rawData = spreadsheetData.value;
                const rows = rawData.split('\n').filter(row => row.trim() !== '');
                
                // Reset filter values
                column1Values.clear();
                column2Values.clear();
                
                const parsedData = rows.map(row => {
                    // Handle quoted values with commas inside them
                    let inQuote = false;
                    let currentValue = '';
                    let values = [];
                    
                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];
                        
                        if (char === '"' && (i === 0 || row[i-1] !== '\\')) {
                            inQuote = !inQuote;
                        } else if (char === ',' && !inQuote) {
                            values.push(currentValue);
                            currentValue = '';
                        } else {
                            currentValue += char;
                        }
                    }
                    
                    // Add the last value
                    values.push(currentValue);
                    
                    // Clean up quotes
                    values = values.map(val => {
                        if (val.startsWith('"') && val.endsWith('"')) {
                            return val.substring(1, val.length - 1);
                        }
                        return val;
                    });
                    
                    // Ensure we have enough columns
                    while (values.length <= COLUMN_Y_POS) {
                        values.push('');
                    }
                    
                    // Add values to filter sets
                    column1Values.add(values[COLUMN_1] || '');
                    column2Values.add(values[COLUMN_2] || '');
                    
                    // Parse position values or use defaults
                    const xPos = parseFloat(values[COLUMN_X_POS]) || 2500;
                    const yPos = parseFloat(values[COLUMN_Y_POS]) || 2500;
                    
                    return {
                        id: values[COLUMN_ID] || '',
                        title: values[COLUMN_TITLE] || '',
                        content: values[COLUMN_CONTENT] || '',
                        x: xPos,
                        y: yPos,
                        // Store all values to preserve data in other columns
                        allValues: values
                    };
                }).filter(item => item.title.trim() !== '' || item.content.trim() !== '');
                
                // Initialize active filters with all values if they're empty
                if (activeColumn1Filters.size === 0) {
                    activeColumn1Filters = new Set([...column1Values]);
                }
                if (activeColumn2Filters.size === 0) {
                    activeColumn2Filters = new Set([...column2Values]);
                }
                
                // Create filter checkboxes
                createFilterCheckboxes(column1Values, 'column1Filters', 'column1', activeColumn1Filters);
                createFilterCheckboxes(column2Values, 'column2Filters', 'column2', activeColumn2Filters);
                
                return parsedData;
            }
            
            // Create hexagonal tiles from CSV data
            function createHexTiles() {
                // Clear existing tiles
                hexTiles.forEach(tile => {
                    if (tile.parentNode) {
                        tile.parentNode.removeChild(tile);
                    }
                });
                hexTiles = [];
                
                // Get data from textarea
                hexData = parseCSVData();
                
                // Apply filters to create only the visible hexagons
                applyFilters();
                
                // Update the CSV data in the textarea
                updateCSVData();
            }
            
            // Update CSV data in the textarea
            function updateCSVData() {
                const csvRows = hexData.map(item => {
                    // Make a copy of all values
                    const values = [...item.allValues];
                    
                    // Update the specific columns
                    values[COLUMN_ID] = item.id;
                    values[COLUMN_TITLE] = escapeCSVValue(item.title);
                    values[COLUMN_CONTENT] = escapeCSVValue(item.content);
                    values[COLUMN_X_POS] = Math.round(item.x);
                    values[COLUMN_Y_POS] = Math.round(item.y);
                    
                    return values.join(',');
                });
                
                spreadsheetData.value = csvRows.join('\n');
            }
            
            // Escape CSV value if it contains commas
            function escapeCSVValue(value) {
                if (value && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }
            
            // Copy CSV data to clipboard
            function copyCSVToClipboard() {
                spreadsheetData.select();
                document.execCommand('copy');
                
                // Show success message
                copySuccess.style.display = 'block';
                setTimeout(() => {
                    copySuccess.style.display = 'none';
                }, 2000);
            }
            
            // Adjust font size based on content length
            function adjustFontSize(contentDiv, content) {
                const paragraphDiv = contentDiv.querySelector('.hex-paragraph');
                if (!paragraphDiv) return;
                
                if (content.length > 300) {
                    paragraphDiv.style.fontSize = '0.75rem';
                    paragraphDiv.style.lineHeight = '1.3';
                } else if (content.length > 200) {
                    paragraphDiv.style.fontSize = '0.8rem';
                    paragraphDiv.style.lineHeight = '1.35';
                } else if (content.length > 100) {
                    paragraphDiv.style.fontSize = '0.85rem';
                    paragraphDiv.style.lineHeight = '1.4';
                }
            }
            
            // Start dragging a hex tile
            function startDrag(e) {
                e.preventDefault();
                activeHex = this;
                isDragging = true;
                
                // Bring the active hex to the front
                hexTiles.forEach(tile => tile.style.zIndex = 1);
                activeHex.style.zIndex = 10;
                
                // Calculate the offset from the mouse position to the hex position
                const rect = activeHex.getBoundingClientRect();
                
                if (e.type === 'mousedown') {
                    offsetX = e.clientX - rect.left;
                    offsetY = e.clientY - rect.top;
                    
                    document.addEventListener('mousemove', drag);
                    document.addEventListener('mouseup', endDrag);
                } else if (e.type === 'touchstart') {
                    offsetX = e.touches[0].clientX - rect.left;
                    offsetY = e.touches[0].clientY - rect.top;
                    
                    document.addEventListener('touchmove', drag);
                    document.addEventListener('touchend', endDrag);
                }
            }
            
            // Drag the active hex tile
            function drag(e) {
                if (!activeHex || !isDragging) return;
                
                let clientX, clientY;
                
                if (e.type === 'mousemove') {
                    clientX = e.clientX;
                    clientY = e.clientY;
                } else if (e.type === 'touchmove') {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                }
                
                const hexGridRect = hexGrid.getBoundingClientRect();
                
                // Calculate new position relative to the hex grid, accounting for scale
                const x = (clientX - hexGridRect.left) / scale;
                const y = (clientY - hexGridRect.top) / scale;
                
                // Update position
                activeHex.style.left = `${x - offsetX / scale}px`;
                activeHex.style.top = `${y - offsetY / scale}px`;
                
                // Dynamically generate grid points around the current position
                // Only do this occasionally to avoid performance issues
                if (Math.random() < 0.05) { // 5% chance each drag event
                    generateGridPointsAroundPosition(x, y);
                }
            }
            
            // Find the closest grid point to a position
            function findClosestGridPoint(x, y) {
                // First check if there are any grid points nearby
                let closestPoint = null;
                let minDistance = Infinity;
                
                gridPoints.forEach(point => {
                    const pointX = parseFloat(point.dataset.x);
                    const pointY = parseFloat(point.dataset.y);
                    
                    const distance = Math.sqrt(
                        Math.pow(x - pointX, 2) + 
                        Math.pow(y - pointY, 2)
                    );
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = { x: pointX, y: pointY };
                    }
                });
                
                // If no grid points are found or the closest is too far, generate new ones
                if (!closestPoint || minDistance > horizontalSpacing) {
                    // Calculate the nearest grid position
                    const gridStepX = horizontalSpacing;
                    const gridStepY = verticalSpacing;
                    
                    // Determine if we're on an even or odd row
                    const nearestGridY = Math.round(y / gridStepY) * gridStepY;
                    const isEvenRow = Math.round((nearestGridY - originY) / gridStepY) % 2 === 0;
                    
                    // Calculate the nearest x-coordinate, accounting for the offset on odd rows
                    const rowOffset = isEvenRow ? 0 : gridStepX / 2;
                    const nearestGridX = Math.round((x - rowOffset) / gridStepX) * gridStepX + rowOffset;
                    
                    // Create the grid point
                    createGridPoint(nearestGridX, nearestGridY);
                    
                    // Generate additional grid points around this position
                    generateGridPointsAroundPosition(nearestGridX, nearestGridY);
                    
                    return { x: nearestGridX, y: nearestGridY };
                }
                
                return closestPoint;
            }
            
            // End dragging and snap to grid
            function endDrag() {
                if (!activeHex || !isDragging) return;
                isDragging = false;
                
                // Find the center of the hex
                const hexRect = activeHex.getBoundingClientRect();
                const hexGridRect = hexGrid.getBoundingClientRect();
                
                const hexCenterX = (hexRect.left + hexRect.width / 2 - hexGridRect.left) / scale;
                const hexCenterY = (hexRect.top + hexRect.height / 2 - hexGridRect.top) / scale;
                
                // Find or create the closest grid point
                const closestPoint = findClosestGridPoint(hexCenterX, hexCenterY);
                
                if (closestPoint) {
                    // Snap to the closest grid point
                    activeHex.style.left = `${closestPoint.x - hexWidth / 2}px`;
                    activeHex.style.top = `${closestPoint.y - hexHeight / 2}px`;
                    
                    // Update the data with new position
                    const index = parseInt(activeHex.dataset.index);
                    if (hexData[index]) {
                        hexData[index].x = closestPoint.x;
                        hexData[index].y = closestPoint.y;
                        
                        // Update the CSV data
                        updateCSVData();
                    }
                }
                
                activeHex = null;
                
                // Remove event listeners
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', endDrag);
                document.removeEventListener('touchmove', drag);
                document.removeEventListener('touchend', endDrag);
            }
            
            // Reset tile positions
            function resetPositions() {
                // Clear existing tiles
                hexTiles.forEach(tile => {
                    if (tile.parentNode) {
                        tile.parentNode.removeChild(tile);
                    }
                });
                hexTiles = [];
                
                // Reset positions in data
                hexData.forEach((item, index) => {
                    const angle = (index / hexData.length) * Math.PI * 6;
                    const spiralFactor = 1 + (index / hexData.length) * 2;
                    const radius = 250 * spiralFactor;
                    const x = Math.cos(angle) * radius + originX;
                    const y = Math.sin(angle) * radius + originY;
                    
                    item.x = x;
                    item.y = y;
                });
                
                // Update the CSV data
                updateCSVData();
                
                // Recreate visible hexagons
                applyFilters();
            }
            
            // Toggle grid visibility
            function toggleGrid() {
                showGrid = !showGrid;
                gridPoints.forEach(point => {
                    point.style.display = showGrid ? 'block' : 'none';
                });
            }
            
            // Update grid transform based on pan and zoom
            function updateGridTransform() {
                hexGrid.style.transform = `translate(${-originX * scale + hexContainer.offsetWidth / 2}px, ${-originY * scale + hexContainer.offsetHeight / 2}px) scale(${scale})`;
                zoomLevelDisplay.textContent = `Zoom: ${Math.round(scale * 100)}%`;
            }
            
            // Start panning the grid
            function startPan(e) {
                if (activeHex || e.target.closest('.hex-tile')) return; // Don't pan if dragging a hex
                
                isPanning = true;
                
                if (e.type === 'mousedown') {
                    startPoint = { x: e.clientX, y: e.clientY };
                } else if (e.type === 'touchstart') {
                    startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
                
                hexContainer.style.cursor = 'grabbing';
            }
            
            // Pan the grid
            function pan(e) {
                if (!isPanning) return;
                
                if (e.type === 'mousemove') {
                    endPoint = { x: e.clientX, y: e.clientY };
                } else if (e.type === 'touchmove') {
                    endPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
                
                const dx = (endPoint.x - startPoint.x) / scale;
                const dy = (endPoint.y - startPoint.y) / scale;
                
                originX -= dx;
                originY -= dy;
                
                updateGridTransform();
                
                startPoint = { x: endPoint.x, y: endPoint.y };
            }
            
            // End panning
            function endPan() {
                isPanning = false;
                hexContainer.style.cursor = 'default';
            }
            
            // Zoom with mouse wheel
            function zoom(e) {
                e.preventDefault();
                
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                const newScale = Math.max(0.1, Math.min(2, scale + delta));
                
                // Adjust the origin to zoom toward mouse position
                if (scale !== newScale) {
                    const rect = hexContainer.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    
                    const beforeX = (mouseX - hexContainer.offsetWidth / 2) / scale + originX;
                    const beforeY = (mouseY - hexContainer.offsetHeight / 2) / scale + originY;
                    
                    scale = newScale;
                    
                    const afterX = (mouseX - hexContainer.offsetWidth / 2) / scale + originX;
                    const afterY = (mouseY - hexContainer.offsetHeight / 2) / scale + originY;
                    
                    originX += (beforeX - afterX);
                    originY += (beforeY - afterY);
                    
                    updateGridTransform();
                }
            }
            
            // Zoom in button
            function zoomIn() {
                const newScale = Math.min(2, scale + 0.1);
                if (scale !== newScale) {
                    scale = newScale;
                    updateGridTransform();
                }
            }
            
            // Zoom out button
            function zoomOut() {
                const newScale = Math.max(0.1, scale - 0.1);
                if (scale !== newScale) {
                    scale = newScale;
                    updateGridTransform();
                }
            }
            
            // Reset view
            function resetView() {
                scale = 1;
                originX = 2500;
                originY = 2500;
                updateGridTransform();
            }
            
            // Refresh data from current URL
            function refreshData() {
                if (currentUrl) {
                    loadCSVFromUrl(currentUrl);
                } else {
                    showError("No URL to refresh from. Please load from URL first.");
                }
            }
            
            // Initialize
            createHexTiles();
            
            // Event listeners for buttons
            loadFromUrlBtn.addEventListener('click', () => loadCSVFromUrl(csvUrl.value));
            refreshDataBtn.addEventListener('click', refreshData);
            applyDataBtn.addEventListener('click', createHexTiles);
            copyCSVBtn.addEventListener('click', copyCSVToClipboard);
            resetBtn.addEventListener('click', resetPositions);
            toggleGridBtn.addEventListener('click', toggleGrid);
            zoomInBtn.addEventListener('click', zoomIn);
            zoomOutBtn.addEventListener('click', zoomOut);
            resetViewBtn.addEventListener('click', resetView);
            
            // Event listeners for panning
            hexContainer.addEventListener('mousedown', startPan);
            hexContainer.addEventListener('mousemove', pan);
            hexContainer.addEventListener('mouseup', endPan);
            hexContainer.addEventListener('mouseleave', endPan);
            hexContainer.addEventListener('touchstart', startPan);
            hexContainer.addEventListener('touchmove', pan);
            hexContainer.addEventListener('touchend', endPan);
            
            // Event listener for zooming
            hexContainer.addEventListener('wheel', zoom);
            
            // Handle window resize
            window.addEventListener('resize', updateGridTransform);
            
            // Handle Enter key in URL input
            csvUrl.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    loadCSVFromUrl(csvUrl.value);
                }
            });
            
            // Open filter sections by default
            document.querySelectorAll('.filter-content').forEach(content => {
                content.classList.remove('hidden');
                const header = content.previousElementSibling;
                const chevron = header.querySelector('.chevron');
                chevron.classList.add('open');
            });
        });
