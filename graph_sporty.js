// --- GLOBAL STATE VARIABLES (NO DOM REFERENCES) ---

// Stores individual training part objects that are not part of any group.
let partesEntreno = []; 
// Stores group objects. Each group object contains an array of its member parts.
let groups = [];
// Stores training part objects that have been copied to the clipboard.
let clipboard = [];
// A Set to keep track of the IDs of currently selected training parts.
let selectedParts = new Set();

// Variables to manage state during drag-and-drop operations.
let draggedElement = null; // The DOM element being dragged.
let dropTarget = null;   // The potential DOM element to drop onto.
// Stores information about a pending drag-and-drop action, like creating a new group or adding to an existing one.
let pendingGroupAction = null; 
// A global variable to hold a reference to a pending drag action detected by Sortable.js's onMove.
window.pendingDragAction = null;

// --- DOM Element References (INITIALIZED IN DOMContentLoaded) ---
let form, grafico, lista, resetButton;
let rpeSliderDiv, zoneRangeSliderContainer, zoneRangeSlider, zoneRangeSlow, zoneRangeFast;
let sliderRPE, sliderValueRPE;
let ritmoUmbralInput, applyUmbralButton, intensityTypeToggle, durationTypeToggle;
let intensityLabel, intensityInfo;
let timeInputContainer, kmInputContainer, kmInput;
let modal, editForm, cancelEdit, editSlider, editSliderValue, editIntensityTypeToggle;
let editZoneRangeSliderContainer, editRpeSlider, editZoneRangeSlider;
let editZoneRangeFast, editZoneRangeSlow, editSliderRPE, editSliderValueRPE;
let editDurationTypeToggle, editTimeInputContainer, editKmInputContainer, editKmInput;
let clipboardContainer, clipboardCount;
let selectionToolbar, partsContainer;
let showJsonButton, jsonModal, jsonDataOutput, closeJsonModalButton;

// --- Constants for zone range ---
const ZONE_MIN = 70;  // Normal zone range
const ZONE_MAX = 150; // Normal zone range

// --- Constants for RPE mapping ---
const RPE_ZONE_MIN = 70;  // RPE maps to 165-85 range
const RPE_ZONE_MAX = 150; // RPE maps to 165-85 range

// --- Initialize noUiSlider instances ---
let zoneSliderInstance = null;
let workZoneSliderInstance = null;
let restZoneSliderInstance = null;
let editZoneSliderInstance = null;

// Utility function to generate UUID (fallback for browsers that don't support crypto.randomUUID)
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Initialize noUiSlider for zone range ---
function initZoneRangeSlider() {
    if (zoneSliderInstance) return;
    
    const slider = document.getElementById('zoneRangeSlider');
    if (!slider) {
        console.warn("Zone range slider element not found");
        return;
    }
    
    try {
        zoneSliderInstance = noUiSlider.create(slider, {
        start: [100, 100],
        connect: true,
        step: 0.1,
        range: {
            min: ZONE_MIN,
            max: ZONE_MAX
        },
            tooltips: [
                {
                    to: function(value) {
                        return parseFloat(value).toFixed(1) + '%';
                    },
                    from: function(value) {
                        return parseFloat(value);
                    }
                },
                {
                    to: function(value) {
                        return parseFloat(value).toFixed(1) + '%';
                    },
                    from: function(value) {
                        return parseFloat(value);
                    }
                }
            ],
        format: {
            to: v => parseFloat(v).toFixed(1),
            from: v => parseFloat(v)
            },
            pips: {
                mode: 'values',
                values: [70, 85, 100, 115, 130, 150],
                density: 4,
                stepped: true,
                format: {
                    to: function(value) {
                        return Math.round(value) + '%';
                    }
                }
            }
        });
        
        zoneSliderInstance.on('update', function(values, handle) {
            const fastValue = parseFloat(values[0]);
            const slowValue = parseFloat(values[1]);
            
            // Update display values
            if (zoneRangeFast) zoneRangeFast.textContent = fastValue.toFixed(1);
            if (zoneRangeSlow) zoneRangeSlow.textContent = slowValue.toFixed(1);
            
            // Add zone descriptions
            const fastZone = getZoneFromValue(fastValue);
            const slowZone = getZoneFromValue(slowValue);
            
            // Update tooltips with zone information
            const handles = slider.querySelectorAll('.noUi-handle');
            if (handles[0]) {
                handles[0].setAttribute('title', `Rápido: ${fastValue.toFixed(1)}% - ${fastZone}`);
            }
            if (handles[1]) {
                handles[1].setAttribute('title', `Lento: ${slowValue.toFixed(1)}% - ${slowZone}`);
            }
            
            // Update preview
        updatePreviewKms();
    });
        
        zoneSliderInstance.on('start', function() {
            slider.classList.add('slider-active');
        });
        
        zoneSliderInstance.on('end', function() {
            slider.classList.remove('slider-active');
        });
        
        console.log("✅ Zone range slider initialized successfully");
    } catch (error) {
        console.error("Failed to initialize zone range slider:", error);
    }
}

function initWorkZoneSlider() {
    if (workZoneSliderInstance) return;
    
    const slider = document.getElementById('workZoneRangeSlider');
    if (!slider) return;
    
    try {
        workZoneSliderInstance = noUiSlider.create(slider, {
            start: [95, 105],
            connect: true,
            step: 0.1,
            range: {
                min: ZONE_MIN,
                max: ZONE_MAX
            },
            tooltips: [true, true],
            format: {
                to: v => parseFloat(v).toFixed(1),
                from: v => parseFloat(v)
            }
        });
        
        workZoneSliderInstance.on('update', function(values) {
            const workZoneRangeFast = document.getElementById('workZoneRangeFast');
            const workZoneRangeSlow = document.getElementById('workZoneRangeSlow');
            if (workZoneRangeFast) workZoneRangeFast.textContent = values[0];
            if (workZoneRangeSlow) workZoneRangeSlow.textContent = values[1];
            updateSeriesPreview();
        });
    } catch (error) {
        console.error("Failed to initialize work zone slider:", error);
    }
}

function initRestZoneSlider() {
    if (restZoneSliderInstance) return;
    
    const slider = document.getElementById('restZoneRangeSlider');
    if (!slider) return;
    
    try {
        restZoneSliderInstance = noUiSlider.create(slider, {
            start: [130, 130],
            connect: true,
            step: 0.1,
            range: {
                min: ZONE_MIN,
                max: ZONE_MAX
            },
            tooltips: [true, true],
            format: {
                to: v => parseFloat(v).toFixed(1),
                from: v => parseFloat(v)
            }
        });
        
        restZoneSliderInstance.on('update', function(values) {
            const restZoneRangeFast = document.getElementById('restZoneRangeFast');
            const restZoneRangeSlow = document.getElementById('restZoneRangeSlow');
            if (restZoneRangeFast) restZoneRangeFast.textContent = values[0];
            if (restZoneRangeSlow) restZoneRangeSlow.textContent = values[1];
            updateSeriesPreview();
        });
    } catch (error) {
        console.error("Failed to initialize rest zone slider:", error);
    }
}

// --- Show/hide correct slider(s) based on mode ---
function updateSliderVisibility() {
    console.log("🔄 updateSliderVisibility called, toggle checked:", intensityTypeToggle?.checked);
    
    if (!intensityTypeToggle) {
        console.error("❌ intensityTypeToggle is null!");
        return;
    }
    
    if (!zoneRangeSliderContainer || !rpeSliderDiv) {
        console.error("❌ Slider containers not found:", {
            zoneRangeSliderContainer: !!zoneRangeSliderContainer,
            rpeSliderDiv: !!rpeSliderDiv
        });
        return;
    }
    
    if (intensityTypeToggle.checked) {
        // RPE mode
        console.log("🔴 Switching to RPE mode");
        zoneRangeSliderContainer.style.display = "none";
        rpeSliderDiv.style.display = "block";
        rpeSliderDiv.style.visibility = "visible";
        console.log("✅ RPE slider shown, zone slider hidden");
    } else {
        // Zone mode (default)
        console.log("🔵 Switching to Zone mode");
        zoneRangeSliderContainer.style.display = "block";
        zoneRangeSliderContainer.style.visibility = "visible";
        rpeSliderDiv.style.display = "none";
        console.log("✅ Zone slider shown, RPE slider hidden");
        
        // Initialize zone slider when switching to zone mode
        if (!zoneSliderInstance) {
            console.log("🎛️ Initializing zone slider...");
        initZoneRangeSlider();
        } else {
            console.log("✅ Zone slider already initialized");
    }
    }
    updatePreviewKms();
}

// --- Enhanced work slider visibility function ---
function updateWorkSliderVisibility() {
    const workZoneSlider = document.getElementById('workZoneSlider');
    const workRpeSlider = document.getElementById('workRpeSlider');
    const workIntensityToggle = document.getElementById('workIntensityType');
    
    if (!workZoneSlider || !workRpeSlider || !workIntensityToggle) return;
    
    if (workIntensityToggle.checked) {
        // RPE mode
        workZoneSlider.style.display = 'none';
        workRpeSlider.style.display = 'block';
    } else {
        // Zone mode
        workZoneSlider.style.display = 'block';
        workRpeSlider.style.display = 'none';
        
        // Initialize work zone slider if needed
        if (!workZoneSliderInstance) {
            initWorkZoneSlider();
        }
    }
    updateSeriesPreview();
}

// --- Enhanced rest slider visibility function ---
function updateRestSliderVisibility() {
    const restZoneSlider = document.getElementById('restZoneSlider');
    const restRpeSlider = document.getElementById('restRpeSlider');
    const restIntensityToggle = document.getElementById('restIntensityType');
    
    if (!restZoneSlider || !restRpeSlider || !restIntensityToggle) return;
    
    if (restIntensityToggle.checked) {
        // RPE mode
        restZoneSlider.style.display = 'none';
        restRpeSlider.style.display = 'block';
    } else {
        // Zone mode
        restZoneSlider.style.display = 'block';
        restRpeSlider.style.display = 'none';
        
        // Initialize rest zone slider if needed
        if (!restZoneSliderInstance) {
            initRestZoneSlider();
        }
    }
    updateSeriesPreview();
}

// --- Patch updatePreviewKms to use average of range slider values ---
function updatePreviewKms() {
    // Check if preview element exists
    const previewElement = document.getElementById('previewKms');
    if (!previewElement) {
        console.warn('previewKms element not found');
        return;
    }
    
    // Get form reference (could be in modal or main form)
    const form = document.getElementById('form');
    if (!form) {
        console.warn('Form element not found');
        return;
    }
    
    const nombre = form["nombre"]?.value.trim() || '';
    let indice, isRPE;
    let duracion = getCurrentDuration();
    
    // Get intensity values
    const intensityToggle = document.getElementById('intensityType');
    if (intensityToggle && intensityToggle.checked) {
        // RPE mode
        const rpeSlider = document.getElementById('indiceSliderRPE');
        indice = rpeSlider ? parseFloat(rpeSlider.value) : 5;
        isRPE = true;
    } else {
        // Zone mode: use average of range
        let values = [100, 100];
        if (zoneSliderInstance) {
            try {
                values = zoneSliderInstance.get().map(parseFloat);
            } catch (e) {
                console.warn('Error getting zone slider values:', e);
            }
        }
        const fast = values[0];
        const slow = values[1];
        indice = (slow + fast) / 2;
        isRPE = false;
    }
    
    let preview = '';
    
    // Check for missing data and provide helpful messages
    if (!nombre) {
        preview = '<span style="color: #ffc107;">⚠️ Introduce un nombre para la parte</span>';
    } else if (duracion === 0 || isNaN(duracion)) {
        const durationToggle = document.getElementById('durationType');
        if (durationToggle && durationToggle.checked) {
        preview = '<span style="color: #ffc107;">⚠️ Introduce los kilómetros (ej: 1.5)</span>';
        } else {
        preview = '<span style="color: #ffc107;">⚠️ Introduce la duración (ej: 5:30)</span>';
        }
    } else if (duracion <= 0) {
        const durationToggle = document.getElementById('durationType');
        if (durationToggle && durationToggle.checked) {
            preview = '<span style="color: #dc3545;">❌ Distancia inválida. Introduce km positivos</span>';
        } else {
            preview = '<span style="color: #dc3545;">❌ Formato de duración inválido. Usa mm:ss (ej: 5:30)</span>';
        }
    } else if (isNaN(indice)) {
        preview = '<span style="color: #dc3545;">❌ Intensidad inválida</span>';
    } else {
        // All data is valid, show calculations
        const part = { nombre, indice, duracion, isRPE };
        const kms = calculateApproxKms(part);
        const umbralPace = (document.getElementById('ritmoUmbral')?.value) || "5:00";
        const umbralPaceSeconds = paceToSeconds(umbralPace);
        let paceSeconds;
        
        if (isRPE) {
            // Map RPE 0-10 to 165-85 (inverted scale) - RPE specific range
            const zoneValue = RPE_ZONE_MAX - (indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
            paceSeconds = umbralPaceSeconds * (zoneValue / 100);
        } else {
            paceSeconds = umbralPaceSeconds * (indice / 100);
        }
        
        const paceStr = formatPaceMinKm(paceSeconds);
        const timeStr = formatDuration(duracion);
        
        // Always show time, distance, and pace
        preview = `<span style="color: #28a745;">
            ✅ <strong>Tiempo:</strong> ${timeStr} min | 
            <strong>Distancia:</strong> ~${kms.toFixed(2)} km | 
            <strong>Pace:</strong> ~${paceStr} min/km
        </span>`;
    }
    
    previewElement.innerHTML = preview;
}

// --- INITIALIZATION AND HELPER FUNCTIONS ---

// Function to initialize all DOM elements - moved to DOMContentLoaded
function initializeDOMElements() {
    // Main form for adding new training parts.
    form = document.getElementById("form");
    // Container for the visual graph.
    grafico = document.getElementById("grafico");
    // Unused list element, potentially from a previous version. Card-based rendering is used now.
    lista = document.getElementById("lista"); 
    // Button to reset/clear all training parts and groups.
    resetButton = document.getElementById("reset");

    // --- Main Form Input Elements ---
    // Container elements for sliders
    rpeSliderDiv = document.getElementById("rpeSlider");
    zoneRangeSliderContainer = document.getElementById("zoneRangeSliderContainer");
    zoneRangeSlider = document.getElementById("zoneRangeSlider");
    zoneRangeSlow = document.getElementById("zoneRangeSlow");
    zoneRangeFast = document.getElementById("zoneRangeFast");

    // RPE slider elements
    sliderRPE = document.getElementById("indiceSliderRPE");
    sliderValueRPE = document.getElementById("sliderValueRPE");

    // Input field for threshold pace.
    ritmoUmbralInput = document.getElementById("ritmoUmbral");
    // Button to apply the threshold pace.
    applyUmbralButton = document.getElementById("applyUmbral");
    // Toggle switch to select between RPE and Zone intensity modes.
    intensityTypeToggle = document.getElementById("intensityType");
    // Toggle switch to select between Time and Kilometers duration modes.
    durationTypeToggle = document.getElementById("durationType");
    // Label for the intensity input, changes based on RPE/Zone mode.
    intensityLabel = document.getElementById("intensityLabel");
    // Displays informational text about the current intensity mode.
    intensityInfo = document.getElementById("intensityInfo");

    // Duration input containers
    timeInputContainer = document.getElementById("timeInput");
    kmInputContainer = document.getElementById("kmInput");
    kmInput = document.getElementById("kilometrosInput");

    // --- Edit Modal Elements ---
    // Modal dialog for editing an existing training part.
    modal = document.getElementById("modal");
    // Form within the edit modal.
    editForm = document.getElementById("edit-form");
    // Button to cancel the edit operation.
    cancelEdit = document.getElementById("cancel-edit");
    // Slider for intensity within the edit modal.
    editSlider = editForm ? editForm["edit-indice"] : null;
    // Displays the current value of the edit modal's intensity slider.
    editSliderValue = document.getElementById("edit-slider-value");
    // Toggle switch to select between RPE and Zone intensity modes in the edit modal.
    editIntensityTypeToggle = document.getElementById("edit-intensityType");
    // Additional DOM element references for the edit modal zone range.
    editZoneRangeSliderContainer = document.getElementById("edit-zoneRangeSliderContainer");
    editRpeSlider = document.getElementById("edit-rpeSlider");
    editZoneRangeSlider = document.getElementById("edit-zoneRangeSlider");
    editZoneRangeFast = document.getElementById("edit-zoneRangeFast");
    editZoneRangeSlow = document.getElementById("edit-zoneRangeSlow");
    editSliderRPE = document.getElementById("edit-indiceSliderRPE");
    editSliderValueRPE = document.getElementById("edit-sliderValueRPE");

    // Edit modal duration elements
    editDurationTypeToggle = document.getElementById("edit-durationType");
    editTimeInputContainer = document.getElementById("edit-timeInput");
    editKmInputContainer = document.getElementById("edit-kmInput");
    editKmInput = document.getElementById("edit-kilometrosInput");

    // --- Clipboard UI Elements ---
    // Container for clipboard information and actions.
    clipboardContainer = document.getElementById("clipboard-container");
    // Displays the number of items currently in the clipboard.
    clipboardCount = document.getElementById("clipboard-count");

    // --- Selection Toolbar & Parts Container ---
    // Toolbar that appears when parts are selected, offering group/batch actions.
    selectionToolbar = document.getElementById("selectionToolbar");
    // Main container where all part cards and group cards are rendered.
    partsContainer = document.getElementById("partsContainer");

    // --- JSON Data Modal Elements ---
    // Button to show the JSON data modal.
    showJsonButton = document.getElementById('showJsonButton');
    // Modal dialog for displaying the current training data as JSON.
    jsonModal = document.getElementById('jsonModal');
    // Preformatted text area within the JSON modal to display the data.
    jsonDataOutput = document.getElementById('jsonDataOutput');
    // Button within the JSON modal to close it.
    closeJsonModalButton = jsonModal ? jsonModal.querySelector('.close-json-modal') : null;

    // Console log to confirm DOM elements are found
    console.log("🔍 DOM Elements Initialized:", {
        form: !!form,
        grafico: !!grafico,
        resetButton: !!resetButton,
        intensityTypeToggle: !!intensityTypeToggle,
        durationTypeToggle: !!durationTypeToggle
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM Content Loaded - Initializing enhanced application...");
    
    try {
        // FIRST: Initialize all DOM elements
        initializeDOMElements();
        
        if (!form) {
            console.error("CRITICAL: Form element with ID 'form' not found!");
            return;
        }
        
        // Initialize sliders and UI with enhanced error handling
        updateSliderVisibility();
        
        // Initialize all zone sliders if needed
        setTimeout(() => {
            initZoneRangeSlider();
            initWorkZoneSlider(); 
            initRestZoneSlider();
        }, 100);
        
        // Initialize form event listeners
        initializeFormEventListeners();
        
        // Initialize placeholders for advanced features
        initializeSortable();
        initializeModalEventListeners();
        initializeKeyboardShortcuts();
        
        // Initial render
        render();
        
        console.log("✅ Basic application initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing application:", error);
    }
});

// --- ESSENTIAL HELPER FUNCTIONS ---

// Get current duration from form inputs
function getCurrentDuration() {
    if (!form) return 0;
    
    const durationToggle = document.getElementById('durationType');
    
    if (durationToggle && durationToggle.checked) {
        // Kilometers mode
        const kmInput = document.getElementById('kilometrosInput');
        const km = kmInput ? parseFloat(kmInput.value) || 0 : 0;
        // Convert km to seconds (assuming 5 min/km pace as base)
        return km * 300; // 5 minutes = 300 seconds per km
    } else {
        // Time mode
        const minutesInput = form.querySelector('input[name="minutos"]');
        const secondsInput = form.querySelector('input[name="segundos"]');
        
        const minutes = minutesInput ? parseInt(minutesInput.value) || 0 : 0;
        const seconds = secondsInput ? parseInt(secondsInput.value) || 0 : 0;
        
        return (minutes * 60) + seconds;
    }
}

// Calculate approximate kilometers
function calculateApproxKms(part) {
    if (!part || !part.duracion) return 0;
    
    const umbralPace = document.getElementById('ritmoUmbral')?.value || "5:00";
    const umbralPaceSeconds = paceToSeconds(umbralPace);
    
    let paceSeconds;
    if (part.isRPE) {
        // Map RPE 0-10 to 165-85 (inverted scale)
        const zoneValue = RPE_ZONE_MAX - (part.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        paceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        paceSeconds = umbralPaceSeconds * (part.indice / 100);
    }
    
    // Calculate distance: time / pace = distance
    return part.duracion / paceSeconds;
}

// Convert pace string (mm:ss) to seconds
function paceToSeconds(paceStr) {
    if (!paceStr) return 300; // Default 5:00 min/km
    
    const parts = paceStr.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return (minutes * 60) + seconds;
}

// Format pace in min/km
function formatPaceMinKm(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format duration in mm:ss
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Get zone description from value
function getZoneFromValue(value) {
    if (value < 85) return "Z1 - Recuperación";
    if (value < 100) return "Z2 - Aeróbico";
    if (value < 115) return "Z3 - Tempo";
    if (value < 130) return "Z4 - Umbral";
    return "Z5 - VO2 Max";
}

// Placeholder for series preview update
function updateSeriesPreview() {
    // Placeholder function for series functionality
    console.log("Series preview update called");
}

// Basic notification function
function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// --- MAIN APPLICATION FUNCTIONS ---

// Add new training part
function addPart() {
    if (!form) {
        console.error("Form not found");
        return;
    }

    const nombre = form["nombre"]?.value?.trim();
    if (!nombre) {
        showNotification("Introduce un nombre para la parte", "error");
        return;
    }

    // Get intensity
    let indice, isRPE;
    if (intensityTypeToggle && intensityTypeToggle.checked) {
        // RPE mode
        indice = sliderRPE ? parseFloat(sliderRPE.value) : 5;
        isRPE = true;
    } else {
        // Zone mode: use average of range
        let values = [100, 100];
        if (zoneSliderInstance) {
            try {
                values = zoneSliderInstance.get().map(parseFloat);
            } catch (e) {
                console.warn('Error getting zone slider values:', e);
            }
        }
        indice = (values[0] + values[1]) / 2;
        isRPE = false;
    }

    // Get duration
    const duracion = getCurrentDuration();
    if (duracion <= 0) {
        showNotification("Introduce una duración válida", "error");
        return;
    }

    // Create new part
    const newPart = {
        id: generateUUID(),
        nombre,
        indice,
        duracion,
        isRPE,
        designedIn: durationTypeToggle && durationTypeToggle.checked ? 'distance' : 'time',
        originalValue: durationTypeToggle && durationTypeToggle.checked ? 
            parseFloat(document.getElementById('kilometrosInput')?.value || 0) : duracion,
        generalOrder: partesEntreno.length
    };

    partesEntreno.push(newPart);
    
    // Reset form
    form.reset();
    if (zoneSliderInstance) {
        zoneSliderInstance.set([100, 100]);
    }
    
    showNotification(`Parte "${nombre}" añadida correctamente`, "success");
    render();
}

// Render the application
function render() {
    renderGraph();
    renderSummaryBar();
}

// Render the visual graph
function renderGraph() {
    if (!grafico) return;
    
    grafico.innerHTML = '';
    
    if (partesEntreno.length === 0) {
        grafico.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No hay partes de entrenamiento. Añade una parte para comenzar.</div>';
        return;
    }

    // Calculate total duration for scaling
    const totalDuration = partesEntreno.reduce((sum, part) => sum + part.duracion, 0);
    
    partesEntreno.forEach((part, index) => {
        const widthPercent = (part.duracion / totalDuration) * 100;
        const intensity = part.isRPE ? 
            (RPE_ZONE_MAX - (part.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN)) :
            part.indice;
        
        // Create bar element
        const bar = document.createElement('div');
        bar.className = 'barra';
        bar.style.cssText = `
            width: ${widthPercent}%;
            height: ${Math.max(20, intensity * 2)}px;
            background: linear-gradient(to top, 
                ${getIntensityColor(intensity, 0.8)}, 
                ${getIntensityColor(intensity, 1)});
            margin: 2px;
            border-radius: 4px;
            border: 1px solid ${getIntensityColor(intensity, 1)};
            position: relative;
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        // Add hover effect
        bar.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        
        bar.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
        
        // Add label
        const label = document.createElement('div');
        label.className = 'graph-label';
        label.style.cssText = `
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            text-align: center;
            color: #666;
            white-space: nowrap;
        `;
        label.textContent = part.nombre;
        
        bar.appendChild(label);
        grafico.appendChild(bar);
    });
}

// Get color based on intensity
function getIntensityColor(intensity, alpha = 1) {
    if (intensity < 85) return `rgba(74, 144, 226, ${alpha})`; // Blue - Z1
    if (intensity < 100) return `rgba(80, 200, 120, ${alpha})`; // Green - Z2
    if (intensity < 115) return `rgba(255, 193, 7, ${alpha})`; // Yellow - Z3
    if (intensity < 130) return `rgba(255, 107, 53, ${alpha})`; // Orange - Z4
    return `rgba(220, 53, 69, ${alpha})`; // Red - Z5
}

// Render summary bar
function renderSummaryBar() {
    const summaryBar = document.getElementById('summaryBar');
    if (!summaryBar) return;
    
    if (partesEntreno.length === 0) {
        summaryBar.innerHTML = '<div style="text-align: center; color: #666;">Añade partes para ver el resumen</div>';
        return;
    }
    
    const totalDuration = partesEntreno.reduce((sum, part) => sum + part.duracion, 0);
    const totalKms = partesEntreno.reduce((sum, part) => sum + calculateApproxKms(part), 0);
    
    summaryBar.innerHTML = `
        <div class="summary-stats">
            <div class="summary-stat">
                <span class="stat-label">Duración Total:</span>
                <span class="stat-value">${formatDuration(totalDuration)}</span>
            </div>
            <div class="summary-stat">
                <span class="stat-label">Distancia Total:</span>
                <span class="stat-value">~${totalKms.toFixed(2)} km</span>
            </div>
            <div class="summary-stat">
                <span class="stat-label">Partes:</span>
                <span class="stat-value">${partesEntreno.length}</span>
            </div>
        </div>
    `;
}

// Initialize form event listeners
function initializeFormEventListeners() {
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addPart();
    });
    
    // Duration toggle
    if (durationTypeToggle) {
        durationTypeToggle.addEventListener('change', function() {
            if (timeInputContainer && kmInputContainer) {
                if (this.checked) {
                    timeInputContainer.style.display = 'none';
                    kmInputContainer.style.display = 'block';
                } else {
                    timeInputContainer.style.display = 'block';
                    kmInputContainer.style.display = 'none';
                }
            }
            updatePreviewKms();
        });
    }
    
    // Intensity toggle
    if (intensityTypeToggle) {
        intensityTypeToggle.addEventListener('change', updateSliderVisibility);
    }
    
    // RPE slider
    if (sliderRPE && sliderValueRPE) {
        sliderRPE.addEventListener('input', function() {
            sliderValueRPE.textContent = this.value;
            updatePreviewKms();
        });
    }
    
    // Form inputs for preview updates
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', updatePreviewKms);
        input.addEventListener('change', updatePreviewKms);
    });
    
    // Threshold pace button
    if (applyUmbralButton) {
        applyUmbralButton.addEventListener('click', function() {
            showNotification('Ritmo umbral aplicado', 'success');
            render();
        });
    }
    
    // Reset button
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que quieres reiniciar todo?')) {
                partesEntreno = [];
                groups = [];
                render();
                showNotification('Entrenamiento reiniciado', 'success');
            }
        });
    }
    
    // JSON button
    if (showJsonButton) {
        showJsonButton.addEventListener('click', function() {
            const jsonData = {
                partesEntreno,
                groups,
                ritmoUmbral: ritmoUmbralInput?.value || '5:00'
            };
            
            if (jsonDataOutput) {
                jsonDataOutput.textContent = JSON.stringify(jsonData, null, 2);
            }
            
            if (jsonModal) {
                jsonModal.classList.remove('hidden');
            }
        });
    }
    
    // Close JSON modal
    if (closeJsonModalButton) {
        closeJsonModalButton.addEventListener('click', function() {
            if (jsonModal) {
                jsonModal.classList.add('hidden');
            }
        });
    }
}

// Basic sortable initialization (placeholder)
function initializeSortable() {
    console.log("Sortable functionality would be initialized here");
}

// Basic modal initialization (placeholder) 
function initializeModalEventListeners() {
    console.log("Modal event listeners would be initialized here");
}

// Basic keyboard shortcuts (placeholder)
function initializeKeyboardShortcuts() {
    console.log("Keyboard shortcuts would be initialized here");
}
