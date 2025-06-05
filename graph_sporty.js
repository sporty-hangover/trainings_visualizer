// --- GLOBAL STATE AND DOM ELEMENT REFERENCES ---

// Stores individual training part objects that are not part of any group.
let partesEntreno = []; 
// Stores group objects. Each group object contains an array of its member parts.
let groups = [];
// Stores the ID of the part being edited
let editingPartId = null;
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

// --- DOM Element References ---

// Main form for adding new training parts.
const form = document.getElementById("form");
// Container for the visual graph.
const grafico = document.getElementById("grafico");
// Unused list element, potentially from a previous version. Card-based rendering is used now.
const lista = document.getElementById("lista"); 
// Button to reset/clear all training parts and groups.
const resetButton = document.getElementById("reset");

// --- Main Form Input Elements ---
// Container elements for sliders
const rpeSliderDiv = document.getElementById("rpeSlider");
const zoneRangeSliderContainer = document.getElementById("zoneRangeSliderContainer");
const zoneRangeSlider = document.getElementById("zoneRangeSlider");
const zoneRangeSlow = document.getElementById("zoneRangeSlow");
const zoneRangeFast = document.getElementById("zoneRangeFast");

// RPE slider elements
const sliderRPE = document.getElementById("indiceSliderRPE");
const sliderValueRPE = document.getElementById("sliderValueRPE");

// Input field for threshold pace.
const ritmoUmbralInput = document.getElementById("ritmoUmbral");
// Button to apply the threshold pace.
const applyUmbralButton = document.getElementById("applyUmbral");
// Toggle switch to select between RPE and Zone intensity modes.
const intensityTypeToggle = document.getElementById("intensityType");
// Toggle switch to select between Time and Kilometers duration modes.
const durationTypeToggle = document.getElementById("durationType");
// Label for the intensity input, changes based on RPE/Zone mode.
const intensityLabel = document.getElementById("intensityLabel");
// Displays informational text about the current intensity mode.
const intensityInfo = document.getElementById("intensityInfo");

// Duration input containers
const timeInputContainer = document.getElementById("timeInput");
const kmInputContainer = document.getElementById("kmInput");
const kmInput = document.getElementById("kilometrosInput");

// --- Edit Modal Elements ---
// Modal dialog for editing an existing training part.
const modal = document.getElementById("modal");
// Form within the edit modal.
const editForm = document.getElementById("edit-form");
// Button to cancel the edit operation.
const cancelEdit = document.getElementById("cancel-edit");
// Slider for intensity within the edit modal.
const editSlider = editForm["edit-indice"];
// Displays the current value of the edit modal's intensity slider.
const editSliderValue = document.getElementById("edit-slider-value");
// Toggle switch to select between RPE and Zone intensity modes in the edit modal.
const editIntensityTypeToggle = document.getElementById("edit-intensityType");
// Additional DOM element references for the edit modal zone range.
const editZoneRangeSliderContainer = document.getElementById("edit-zoneRangeSliderContainer");
const editRpeSlider = document.getElementById("edit-rpeSlider");
const editZoneRangeSlider = document.getElementById("edit-zoneRangeSlider");
const editZoneRangeFast = document.getElementById("edit-zoneRangeFast");
const editZoneRangeSlow = document.getElementById("edit-zoneRangeSlow");
const editSliderRPE = document.getElementById("edit-indiceSliderRPE");
const editSliderValueRPE = document.getElementById("edit-sliderValueRPE");

// Edit modal duration elements
const editDurationTypeToggle = document.getElementById("edit-durationType");
const editTimeInputContainer = document.getElementById("edit-timeInput");
const editKmInputContainer = document.getElementById("edit-kmInput");
const editKmInput = document.getElementById("edit-kilometrosInput");

// --- Clipboard UI Elements ---
// Container for clipboard information and actions.
const clipboardContainer = document.getElementById("clipboard-container");
// Displays the number of items currently in the clipboard.
const clipboardCount = document.getElementById("clipboard-count");

// --- Selection Toolbar & Parts Container ---
// Toolbar that appears when parts are selected, offering group/batch actions.
const selectionToolbar = document.getElementById("selectionToolbar");
// Main container where all part cards and group cards are rendered.
const partsContainer = document.getElementById("partsContainer");

// --- JSON Data Modal Elements ---
// Button to show the JSON data modal.
const showJsonButton = document.getElementById('showJsonButton');
// Modal dialog for displaying the current training data as JSON.
const jsonModal = document.getElementById('jsonModal');
// Preformatted text area within the JSON modal to display the data.
const jsonDataOutput = document.getElementById('jsonDataOutput');
// Button within the JSON modal to close it.
const closeJsonModalButton = jsonModal.querySelector('.close-json-modal');

// --- Constants for zone range ---
const ZONE_MIN = 70;  // Normal zone range
const ZONE_MAX = 150; // Normal zone range

// --- Constants for RPE mapping ---
const RPE_ZONE_MIN = 70;  // RPE maps to 165-85 range
const RPE_ZONE_MAX = 150; // RPE maps to 165-85 range

// --- Additional DOM Element References ---
// These are now declared above with other DOM elements
// const zoneRangeSliderContainer = document.getElementById("zoneRangeSliderContainer");
// const zoneRangeSlider = document.getElementById("zoneRangeSlider");
// const zoneRangeSlow = document.getElementById("zoneRangeSlow");
// const zoneRangeFast = document.getElementById("zoneRangeFast");

// --- Initialize noUiSlider for zone range ---
let zoneSliderInstance = null;
let workZoneSliderInstance = null;
let restZoneSliderInstance = null;
let editZoneSliderInstance = null;

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

// Console log to confirm the main form element is found on page load.
// This helps in early debugging if the form ID is incorrect or the element isn't rendered.
if (!form) {
    console.error("CRITICAL: Form element with ID 'form' not found!");
} else {
    console.log("Form element with ID 'form' successfully found:", form);
}

/**
 * Converts a numeric zone value to its corresponding descriptive name.
 * @param {number} value - The numeric zone value (e.g., from the slider).
 * @returns {string} The descriptive name of the training zone.
 */
function getZoneFromValue(value) {
    if (value >= 135) return 'Zona 1 (Regenerativo)';
    if (value >= 120) return 'Zona 2 (Fondo Extensivo)';
    if (value >= 110) return 'Zona 3 (Fondo Medio)';
    if (value >= 100) return 'Zona 4 (Umbral)';
    if (value >= 90) return 'Zona 5a (VO2max)';
    if (value >= 82) return 'Zona 5b (Capacidad Anaeróbica)';
    return 'Zona 5c (Potencia Anaeróbica)'; // Default for values below 82
}

/**
 * Updates the display text of the main form's intensity slider.
 * Shows RPE value directly or Zone values with their descriptive names.
 */
function updateSliderValue() {
    if (intensityTypeToggle && intensityTypeToggle.checked) {
        // RPE mode
        if (sliderValueRPE && sliderRPE) {
        sliderValueRPE.textContent = sliderRPE.value;
        }
    } else {
        // Zone mode - values are updated by noUiSlider
        if (zoneSliderInstance) {
            const values = zoneSliderInstance.get();
            if (zoneRangeFast) zoneRangeFast.textContent = values[0];
            if (zoneRangeSlow) zoneRangeSlow.textContent = values[1];
        }
    }
}

/**
 * Calculates the visual height percentage for a graph bar based on intensity.
 * @param {number} indice - The intensity value (RPE or Zone).
 * @param {boolean} isRPE - True if the intensity is RPE, false if it's Zone-based.
 * @returns {number} A percentage value (0-100) for the bar height. Higher for RPE, inverted for Zones.
 */
const calcularVisual = (indice, isRPE) => {
    if (isRPE) {
        // For RPE (0-10), scale it to 0-100 for graph height.
        return (indice * 10);
    } else {
        // For Zones (72-130, lower is harder), invert and scale.
        // 130 (easiest) maps to lower graph bar, 72 (hardest) maps to higher.
        const porcentaje = ((130 - indice) / (130 - 70)) * 100; // Max zone val - current / range
        const limitado = Math.max(0, Math.min(porcentaje, 100)); // Clamp between 0 and 100
        return Math.max(limitado, 3); // Ensure a minimum height for visibility
    }
};

/**
 * Converts a pace string (e.g., "5:00") to total seconds.
 * @param {string} pace - Pace string in "mm:ss" format.
 * @returns {number} Total seconds.
 */
function paceToSeconds(pace) {
    const [min, sec] = pace.split(":").map(Number);
    return min * 60 + (sec || 0);
}

/**
 * Converts total seconds to a pace string (e.g., "5:00").
 * @param {number} s - Total seconds.
 * @returns {string} Pace string in "m:ss" format.
 */
function secondsToPace(s) {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`; // Ensures two digits for seconds
}

/**
 * Parses a duration string (e.g., "3:30") into total seconds.
 * @param {string} d - Duration string in "mm:ss" format.
 * @returns {number} Total seconds for the duration.
 */
function parseDuration(d) {
    const [min, sec] = d.split(":").map(Number);
    return min * 60 + (sec || 0);
}

/**
 * Formats total seconds into a duration string (e.g., "3:30").
 * @param {number} seconds - Total seconds of duration.
 * @returns {string} Duration string in "m:ss" format.
 */
function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Validates if the threshold pace input string is in "m:ss" format.
 * @param {string} value - The pace string to validate.
 * @returns {boolean} True if the format is valid, false otherwise.
 */
function validateUmbralFormat(value) {
    return /^\d+:\d{2}$/.test(value); // Regex for one or more digits, colon, exactly two digits
}


// --- CORE DATA MANIPULATION FUNCTIONS (PARTS AND GROUPS) ---

/**
 * Creates a new training part object.
 * @param {string} nombre - Name of the training part.
 * @param {number} indice - Intensity value (RPE or Zone).
 * @param {number} duracion - Duration in seconds.
 * @param {boolean} [isRPE=false] - True if intensity is RPE, false if Zone.
 * @param {number} [originalValue=null] - Store the original input value (km or time in seconds).
 * @param {string} [designedIn='time'] - Store how it was designed: 'time' or 'distance'.
 * @returns {object} The newly created training part object.
 */
function createParte(nombre, indice, duracion, isRPE = false, originalValue = null, designedIn = 'time') {
    const newPart = {
        id: generateUUID(), // Generate a unique ID
        nombre,
        indice,
        duracion: Math.round(duracion), // Always round to integer seconds
        isRPE,
        originalValue, // Store the original input value (km or time in seconds)
        designedIn, // Store how it was designed: 'time' or 'distance'
        generalOrder: partesEntreno.length + groups.length + 1, // Initial general order considering both parts and groups
        innerOrder: null, // Single parts don't have inner order
        order: partesEntreno.length + groups.length + 1 // For backwards compatibility
    };
    partesEntreno.push(newPart);
    return newPart;
}

/**
 * Creates a new series object with work and rest phases.
 * @param {string} nombre - Name of the series.
 * @param {object} workConfig - Configuration for work phase: {indice, duracion, isRPE, originalValue, designedIn}.
 * @param {object} restConfig - Configuration for rest phase: {indice, duracion, isRPE, originalValue, designedIn}.
 * @param {number} repetitions - Number of repetitions (work + rest cycles).
 * @returns {object} The newly created series object.
 */
function createSeries(nombre, workConfig, restConfig, repetitions) {
    const newSeries = {
        id: generateUUID(),
        nombre,
        type: 'series',
        workConfig: {
            indice: workConfig.indice,
            duracion: Math.round(workConfig.duracion),
            isRPE: workConfig.isRPE,
            originalValue: workConfig.originalValue,
            designedIn: workConfig.designedIn
        },
        restConfig: {
            indice: restConfig.indice,
            duracion: Math.round(restConfig.duracion),
            isRPE: restConfig.isRPE,
            originalValue: restConfig.originalValue,
            designedIn: restConfig.designedIn
        },
        repetitions: repetitions,
        generalOrder: partesEntreno.length + groups.length + 1,
        innerOrder: null,
        order: partesEntreno.length + groups.length + 1
    };
    partesEntreno.push(newSeries);
    return newSeries;
}

/**
 * Gets the total duration of a series (work + rest) * repetitions.
 * Uses effective duration calculation to account for distance-designed parts.
 * @param {object} series - The series object.
 * @returns {number} Total duration in seconds.
 */
function getSeriesTotalDuration(series) {
    if (series.type !== 'series') {
        // For regular parts, calculate effective duration
        return calculateEffectiveDurationForSinglePhase(series);
    }
    
    // For series, calculate effective duration for each phase
    const workDuration = calculateEffectiveDurationForSinglePhase(series.workConfig);
    const restDuration = calculateEffectiveDurationForSinglePhase(series.restConfig);
    const cycleDuration = workDuration + restDuration;
    return cycleDuration * series.repetitions;
}

/**
 * Gets all individual parts that compose a series for visualization.
 * Uses effective duration calculation for proper threshold pace handling.
 * @param {object} series - The series object.
 * @returns {Array} Array of individual parts (work and rest phases).
 */
function expandSeriesForVisualization(series) {
    if (series.type !== 'series') return [series];
    
    const expandedParts = [];
    
    // Calculate effective durations for work and rest phases
    const workEffectiveDuration = calculateEffectiveDurationForSinglePhase(series.workConfig);
    const restEffectiveDuration = calculateEffectiveDurationForSinglePhase(series.restConfig);
    
    for (let i = 0; i < series.repetitions; i++) {
        // Work phase
        expandedParts.push({
            id: `${series.id}-work-${i}`,
            nombre: `${series.nombre} - Trabajo ${i + 1}`,
            indice: series.workConfig.indice,
            duracion: workEffectiveDuration, // Use effective duration
            isRPE: series.workConfig.isRPE,
            originalValue: series.workConfig.originalValue,
            designedIn: series.workConfig.designedIn,
            seriesParent: series.id,
            seriesType: 'work',
            seriesRepetition: i + 1
        });
        
        // Rest phase
        expandedParts.push({
            id: `${series.id}-rest-${i}`,
            nombre: `${series.nombre} - Descanso ${i + 1}`,
            indice: series.restConfig.indice,
            duracion: restEffectiveDuration, // Use effective duration
            isRPE: series.restConfig.isRPE,
            originalValue: series.restConfig.originalValue,
            designedIn: series.restConfig.designedIn,
            seriesParent: series.id,
            seriesType: 'rest',
            seriesRepetition: i + 1
        });
    }
    return expandedParts;
}

/**
 * Creates a new group object.
 * @param {string} name - Name of the group.
 * @param {Array<object>} [parts=[]] - Array of training part objects to include in the group.
 * @returns {object} The newly created group object.
 */
function createGroup(name, parts = []) {
    const newGroup = {
        id: generateUUID(),
        name: name || 'Nuevo Grupo',
        parts: parts.map((part, index) => ({
            ...part,
            generalOrder: null, // Parts in groups don't have general order
            innerOrder: index + 1, // Position within group
            order: (groups.length + 1) * 1000 + index + 1 // For backwards compatibility
        })),
        type: 'group',
        generalOrder: partesEntreno.length + groups.length + 1 // Initial general order considering all items
    };
    return newGroup;
}

/**
 * Duplicates an existing group along with all its member parts.
 * The new parts within the duplicated group get new unique IDs.
 * @param {string} groupId - The ID of the group to duplicate.
 */
function duplicateGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        const newGroup = {
            ...createGroup(group.name + ' (copia)'), // Create a base new group
            // Map over original parts, create new objects with new IDs
            parts: group.parts.map(part => ({
                ...part, // Spread original part properties
                id: generateUUID() // Assign a new unique ID
            }))
        };
        groups.push(newGroup); // Add the duplicated group to the list of groups
        render(); // Re-render the UI
    }
}

/**
 * Duplicates a single training part.
 * @param {string} partId - The ID of the part to duplicate.
 */
function duplicateSinglePart(partId) {
    const originalPart = findPartByIdGlobal(partId, partesEntreno, groups);
    if (!originalPart) return; // Part not found

    const newPartData = { 
        ...originalPart, 
        id: generateUUID(), 
        nombre: `${originalPart.nombre} (copia)`,
        order: 0 // Will be set by updateGlobalOrderNumbers during render
    };
    partesEntreno.push(newPartData); // Add to the list of loose parts
    render();
}

/**
 * Deletes a single training part from wherever it exists (loose or in a group).
 * Note: This function seems to only filter `partesEntreno`. If parts are only in groups,
 * this might not delete them correctly unless `rebuildStateFromDOM` or other logic handles it.
 * A more robust delete would need to check groups as well or ensure parts are always in `allPartsData`.
 * @param {string} partId - The ID of the part to delete.
 */
function deleteSinglePart(partId) {
    if (confirm("¿Estás seguro de que quieres eliminar esta parte?")) {
        // Filter out the part from the main list of loose parts
        partesEntreno = partesEntreno.filter(p => p.id !== partId);
        // Also need to remove from any group it might be in
        groups.forEach(group => {
            group.parts = group.parts.filter(p => p.id !== partId);
        });
        render();
    }
}


/**
 * Deletes a group. Member parts are moved back to the main `partesEntreno` list.
 * @param {string} groupId - The ID of the group to delete.
 */
function deleteGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        if (confirm(`¿Estás seguro de que quieres eliminar el grupo "${group.name}"?`)) {
            // Move all parts from the deleted group back to the main partesEntreno list
            partesEntreno = partesEntreno.concat(group.parts);
            // Filter out the deleted group from the groups array
            groups = groups.filter(g => g.id !== groupId);
            render();
        }
    }
}

// --- CLIPBOARD FUNCTIONS ---

/**
 * Adds copies of the provided parts to the clipboard.
 * Each copied part gets a new unique ID.
 * @param {Array<object>} partsToAdd - Array of part objects to copy.
 */
function copyParts(partsToAdd) {
    clipboard = clipboard.concat(
        partsToAdd.map(part => ({
            ...part,
            id: generateUUID() // Ensure copied parts get new IDs
        }))
    );
    clipboardCount.textContent = clipboard.length; // Update clipboard UI
    clipboardContainer.classList.add('active');
}

/**
 * Pastes parts from the clipboard into the main `partesEntreno` list.
 * The parts are concatenated, effectively adding them to the end of the current list.
 */
function pasteElements() {
    if (clipboard.length > 0) {
        partesEntreno = partesEntreno.concat(clipboard); // Add clipboard items to main list
        // Clipboard items are already new objects with new IDs from copyParts.
        render();
    }
}

/**
 * Clears all items from the clipboard and updates the UI.
 */
function clearClipboard() {
    clipboard = [];
    clipboardCount.textContent = "0";
    clipboardContainer.classList.remove('active');
}

// --- SELECTION AND GROUPING FUNCTIONS ---

/**
 * Creates a new group from the currently selected parts.
 * Prompts the user for a group name.
 * Selected parts are moved from `partesEntreno` into the new group.
 * @param {Array<object>} partsToGroup - An array of part objects that are selected. (Note: original function signature was empty, implying it used global `selectedParts`)
 */
function createGroupFromSelection() {
    console.log("createGroupFromSelection called. Selected parts:", Array.from(selectedParts));
    
    if (selectedParts.size < 2) {
        alert("Selecciona al menos dos elementos para crear un grupo.");
            return;
        }
        
    const groupName = prompt('Nombre del grupo:', 'Nuevo Grupo');
    if (!groupName) return; // User cancelled

    const partsArray = [];
    const partsToRemove = new Set();

    // Collect all selected parts and their current locations
    selectedParts.forEach(partId => {
        const part = findPartByIdGlobal(partId, partesEntreno, groups);
        if (part) {
            partsArray.push(part);
            partsToRemove.add(partId);
        }
    });

    if (partsArray.length < 2) {
        alert("No se encontraron suficientes elementos válidos para crear un grupo.");
        return;
    }

    // Create the new group
    const newGroup = createGroup(groupName, partsArray);
    groups.push(newGroup);

    // Remove parts from their original locations
    partesEntreno = partesEntreno.filter(p => !partsToRemove.has(p.id));
    groups.forEach(g => {
        if (g.id !== newGroup.id) {
            g.parts = g.parts.filter(p => !partsToRemove.has(p.id));
        }
    });

    // Clear selection and update UI
    selectedParts.clear();
    updateSelectionToolbar();
    render();
}

/**
 * Creates a new group from two specific parts, typically after a drag-and-drop action.
 * @param {Array<string>} partIds - An array containing the IDs of the two parts to group.
 */
function createNewGroup(partIds) {
    console.log("[createNewGroup] Called with partIds:", JSON.parse(JSON.stringify(partIds)));
    const partObjects = partIds.map(id => findPartByIdGlobal(id, partesEntreno, groups)).filter(p => p); // Get actual part objects
    console.log("[createNewGroup] Resolved partObjects:", JSON.parse(JSON.stringify(partObjects)));
    if (partObjects.length < 2) {
        console.warn("[createNewGroup] Not enough valid parts to create a new group. Found:", partObjects.length);
        render(); // Re-render to reset any visual drag cues
        return;
    }

    const groupName = prompt("Nombre del nuevo grupo:", "Nuevo Grupo");
    if (groupName) {
        const newGroup = createGroup(groupName, partObjects);
        groups.push(newGroup);

        // Remove these parts from the main partesEntreno list
        partesEntreno = partesEntreno.filter(p => !partIds.includes(p.id));
        // Also remove from any other existing group they might have been part of
        groups.forEach(g => {
            if (g.id !== newGroup.id) { // Don't touch the new group itself
                g.parts = g.parts.filter(p => !partIds.includes(p.id));
            }
        });
        render();
    } else {
        render(); // If user cancelled prompt, re-render to clean up drag visuals
    }
}

/**
 * Adds a part to an existing group, typically after a drag-and-drop action.
 * @param {string} partId - The ID of the part to add.
 * @param {string} groupId - The ID of the group to add the part to.
 */
function addToGroup(partId, groupId) {
    const part = findPartByIdGlobal(partId, partesEntreno, groups);
    const group = findGroupByIdGlobal(groupId, groups);

    if (part && group) {
        // Avoid adding if already in the target group (e.g., from a quick drag out and back in)
        if (!group.parts.find(p => p.id === partId)) {
            group.parts.push(part);
        }
        
        // Remove the part from its original location (either partesEntreno or another group)
        partesEntreno = partesEntreno.filter(p => p.id !== partId);
        groups.forEach(g => {
            if (g.id !== groupId) { // Don't remove from the target group
                g.parts = g.parts.filter(p => p.id !== partId);
            }
        });
        render();
    } else {
        console.warn("Part or group not found for addToGroup action.");
        render(); // Re-render to clean up if action failed
    }
}

/**
 * Finds a training part by its ID from all possible locations (loose or within groups).
 * @param {string} partId - The ID of the part to find.
 * @param {Array<object>} currentPartesEntreno - The current array of loose parts.
 * @param {Array<object>} currentGroups - The current array of groups.
 * @returns {object|null} The found part object, or null if not found.
 */
function findPartByIdGlobal(partId, currentPartesEntreno, currentGroups) {
    let part = currentPartesEntreno.find(p => p && p.id === partId);
    if (part) return part;
    for (const group of currentGroups) {
        if (group && group.parts) {
            part = group.parts.find(p => p && p.id === partId);
            if (part) return part;
        }
    }
    return null;
}

/**
 * Finds a group by its ID.
 * @param {string} groupId - The ID of the group to find.
 * @param {Array<object>} currentGroups - The current array of groups.
 * @returns {object|null} The found group object, or null if not found.
 */
function findGroupByIdGlobal(groupId, currentGroups) {
    return currentGroups.find(g => g && g.id === groupId);
}


// --- RENDERING FUNCTIONS ---

/**
 * Creates or retrieves the main container element where sortable cards are placed.
 * This container uses `display: contents` to allow its children to be direct flex items
 * of its parent (`#partsContainer`).
 * @returns {HTMLElement|null} The main order container element, or null if #partsContainer is missing.
 */
function createMainOrderContainer() {
    let container = document.querySelector('.main-order-container');
    if (!container) {
        const partsTable = document.getElementById('partsContainer');
        if (partsTable) {
            // Defensive check if it somehow exists as a child already but wasn't caught by the first querySelector
            container = partsTable.querySelector('.main-order-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'main-order-container';
                partsTable.appendChild(container);
                console.log(".main-order-container created and appended to #partsContainer");
            }
        } else {
            console.error("#partsContainer (the flex table) not found. Cannot create .main-order-container for cards.");
            return null; 
        }
    }
    return container;
}

/**
 * Updates the global order numbers for all items in the application.
 * This function is crucial for maintaining the correct display order of items.
 * @param {boolean} preserveExistingOrder - If true, don't recalculate orders that are already set
 */
function updateGlobalOrderNumbers(preserveExistingOrder = false) {
    const allItemsForPosCalculation = [];

    // 1. Process groups: ensure parts have correct innerOrder and collect them.
    //    Groups themselves are also noted for sorting allItemsForPosCalculation correctly.
    groups.forEach(group => {
        if (group) {
            // Ensure group.generalOrder exists (it should be set by rebuildStateFromDOM or creation)
            if (group.generalOrder === undefined || group.generalOrder === null) {
                // This is a fallback, ideally generalOrder is always set before this function.
                // Assign a high number to sort it towards the end if it's orphaned.
                // Or, if we expect rebuildStateFromDOM to be comprehensive, this might indicate an issue.
                // For now, let's assume it's set. If not, it might mis-sort.
                console.warn(`Group ${group.name} has undefined generalOrder.`);
            }

                if (group.parts) {
                group.parts.forEach((partInGroup, partIndex) => {
                    if (partInGroup) {
                        partInGroup.innerOrder = partIndex + 1; // Assign/Re-assign innerOrder
                        partInGroup.generalOrder = null;      // Parts in groups derive GO from parent

                        allItemsForPosCalculation.push({
                            ...partInGroup, // Spread part properties
                            // Use a distinct property for the GO of the container (group or standalone part itself)
                            // This avoids confusion with partInGroup.generalOrder which is null.
                            containerGeneralOrder: group.generalOrder, 
                            actualInnerOrder: partInGroup.innerOrder // Use a distinct property for clarity
                            });
                        }
                    });
                }
            }
        });

    // 2. Collect standalone parts.
        partesEntreno.forEach(part => {
            if (part) {
            part.innerOrder = null; // Standalone parts have no innerOrder
            
            // Ensure part.generalOrder exists
            if (part.generalOrder === undefined || part.generalOrder === null) {
                console.warn(`Standalone part ${part.nombre} has undefined generalOrder.`);
            }

            allItemsForPosCalculation.push({
                ...part, // Spread part properties
                containerGeneralOrder: part.generalOrder, // For standalone, its own GO is the container GO
                actualInnerOrder: null // Standalone parts have no inner order
                });
            }
        });

    // Sort allItemsForPosCalculation:
    // Primary key: containerGeneralOrder (group's GO for grouped parts, or part's own GO for standalone)
    // Secondary key: actualInnerOrder (for parts within the same group container)
    allItemsForPosCalculation.sort((a, b) => {
        const goA = a.containerGeneralOrder !== undefined && a.containerGeneralOrder !== null ? a.containerGeneralOrder : Infinity;
        const goB = b.containerGeneralOrder !== undefined && b.containerGeneralOrder !== null ? b.containerGeneralOrder : Infinity;

        if (goA !== goB) {
            return goA - goB;
        }
        
        // If containerGeneralOrder is the same, sort by actualInnerOrder.
        // Standalone parts have actualInnerOrder = null.
        // Parts in groups have actualInnerOrder >= 1.
        // A part with null innerOrder (standalone) should effectively come before any part with innerOrder > 0
        // if they somehow shared a containerGeneralOrder (which shouldn't happen if GO is unique for top-level items).
        // However, if two items are from the same group, their containerGeneralOrder will be the same,
        // and actualInnerOrder will distinguish them.
        const ioA = a.actualInnerOrder !== null ? a.actualInnerOrder : 0; // Treat null as 0 for comparison logic here
        const ioB = b.actualInnerOrder !== null ? b.actualInnerOrder : 0; // if standalone items were mixed
        
        return ioA - ioB;
    });

    // Assign sequential 'order' (pos) to all activity parts in allItemsForPosCalculation
    allItemsForPosCalculation.forEach((itemProxy, index) => {
        const originalPart = findPartByIdGlobal(itemProxy.id, partesEntreno, groups);
        if (originalPart) {
            originalPart.order = index + 1; // This is the 'pos'
            
            // Ensure the original part in partesEntreno or group.parts also has correct GO/IO
            // if the proxy was based on potentially modified versions.
            // This is more about syncing back to the canonical objects if itemProxy held intermediate states.
            if (itemProxy.actualInnerOrder !== null) { // It was part of a group
                 originalPart.innerOrder = itemProxy.actualInnerOrder;
                 originalPart.generalOrder = null; 
            } else { // It was a standalone part
                 originalPart.generalOrder = itemProxy.containerGeneralOrder;
                 originalPart.innerOrder = null;
            }
        } else {
            console.warn("updateGlobalOrderNumbers (pos assignment): Original part not found for item:", itemProxy.id);
        }
    });
    
    // Update group.order to be the 'pos' of its first child part, or its generalOrder as fallback
    groups.forEach(group => {
        if (group.parts && group.parts.length > 0) {
            const firstPartInGroup = findPartByIdGlobal(group.parts[0].id, partesEntreno, groups);
            if (firstPartInGroup && firstPartInGroup.order !== undefined) {
                group.order = firstPartInGroup.order; 
            } else {
                group.order = group.generalOrder; 
            }
        } else {
             group.order = group.generalOrder; 
        }
    });

    // Enhanced Logging
    console.log("updateGlobalOrderNumbers: Final calculated 'pos' for parts:", 
        JSON.parse(JSON.stringify(
            allItemsForPosCalculation.map(p => {
                const op = findPartByIdGlobal(p.id, partesEntreno, groups);
                return { id: p.id, name: p.name, containerGO: p.containerGeneralOrder, IO: p.actualInnerOrder, pos: op ? op.order : 'N/A' };
            })
        ))
    );
    console.log("Final partesEntreno state:", 
        JSON.parse(JSON.stringify(
            partesEntreno.map(p => ({id:p.id, name:p.name, GO:p.generalOrder, IO:p.innerOrder, pos:p.order }))
        ))
    );
    console.log("Final groups state:", 
        JSON.parse(JSON.stringify(
            groups.map(g => ({
                id:g.id, name:g.name, GO:g.generalOrder, groupPosAlign:g.order, 
                parts: g.parts.map(p => ({id:p.id, name:p.name, IO:p.innerOrder, pos:p.order }))
            }))
        ))
    );
}

/**
 * Migrates existing data to the new order format with generalOrder and innerOrder
 */
function migrateToNewOrderFormat() {
    console.log("migrateToNewOrderFormat called");
    console.log("Current partesEntreno:", JSON.parse(JSON.stringify(partesEntreno)));
    console.log("Current groups:", JSON.parse(JSON.stringify(groups)));
    
    let needsMigration = false;
    
    // Check if migration is needed
    if (partesEntreno.some(part => part.generalOrder === undefined)) {
        console.log("Migration needed for partesEntreno");
        needsMigration = true;
    }
    if (groups.some(group => group.generalOrder === undefined || 
                    (group.parts && group.parts.some(part => part.innerOrder === undefined)))) {
        console.log("Migration needed for groups");
        needsMigration = true;
    }
    
    if (!needsMigration) {
        console.log("No migration needed");
        return;
    }
    
    console.log("STARTING MIGRATION - Converting data to new order format...");
    
    // Migrate single parts
    partesEntreno.forEach((part, index) => {
        if (part.generalOrder === undefined) {
            part.generalOrder = index + 1;
            console.log(`Set generalOrder ${part.generalOrder} for part: ${part.nombre}`);
        }
        if (part.innerOrder === undefined) {
            part.innerOrder = null; // Single parts don't have inner order
        }
    });
    
    // Migrate groups and their parts
    groups.forEach((group, groupIndex) => {
        if (group.generalOrder === undefined) {
            group.generalOrder = partesEntreno.length + groupIndex + 1;
            console.log(`Set generalOrder ${group.generalOrder} for group: ${group.name}`);
        }
        
        if (group.parts) {
            group.parts.forEach((part, partIndex) => {
                if (part.generalOrder === undefined) {
                    part.generalOrder = null; // Parts in groups don't have general order
                    console.log(`Set generalOrder null for grouped part: ${part.nombre}`);
                }
                if (part.innerOrder === undefined) {
                    part.innerOrder = partIndex + 1; // Position within group
                    console.log(`Set innerOrder ${part.innerOrder} for grouped part: ${part.nombre}`);
                }
            });
        }
    });
    
    console.log("MIGRATION COMPLETED. Updated data:", {
        partesEntreno: JSON.parse(JSON.stringify(partesEntreno)),
        groups: JSON.parse(JSON.stringify(groups))
    });
}

/**
 * Renders only the UI components without recalculating order numbers.
 * Used after drag-and-drop operations where order has already been set.
 */
function renderUI() {
    console.log("renderUI called - rendering visual components only");
    
    if (!grafico) {
        console.error("renderUI: Grafico element not found - cannot render graph");
        return;
    }
    
    grafico.innerHTML = ""; // Clear the main graph area

    // Get or create the container for sortable items (cards and group cards)
    const mainOrderContainer = createMainOrderContainer(); 
    if (!mainOrderContainer) {
        console.error("renderUI: Main order container not found or created. Cannot render cards.");
        return; // Stop rendering if the main container is missing
    }
    mainOrderContainer.innerHTML = ''; // Clear previous cards

    // Collect all main-level items (single parts and groups) and sort by generalOrder
    const mainLevelItems = [];
    
    // Add single parts
    partesEntreno.forEach(item => {
        if(item && item.id && !item.parts) { 
            mainLevelItems.push({
                type: 'part',
                item: item,
                generalOrder: item.generalOrder || 999 // Fallback for items without order
            });
        }
    });

    // Add groups
    groups.forEach(group => {
        if(group && group.id) {
            mainLevelItems.push({
                type: 'group',
                item: group,
                generalOrder: group.generalOrder || 999 // Fallback for items without order
            });
        }
    });

    // Sort by generalOrder
    mainLevelItems.sort((a, b) => a.generalOrder - b.generalOrder);

    // Render items in the correct order
    mainLevelItems.forEach(({ type, item }) => {
        if (type === 'part') {
            const card = createPartCard(item);
            mainOrderContainer.appendChild(card);
        } else if (type === 'group') {
            const groupCard = createGroupCard(item);
            mainOrderContainer.appendChild(groupCard);
        }
    });
    
    // --- Graph Rendering Logic ---
    // Collect all parts that should be displayed on the graph.
    // This includes loose parts and parts from ALL groups (collapsed or expanded).
    const allGraphParts = [];
    
    // Create a mapping to track order for expanded series parts
    const orderMapping = [];
    
    partesEntreno.forEach(p => {
        if (p && p.id && !p.parts) { // It's a loose part
            if (p.type === 'series') {
                // Expand series into individual work/rest parts for visualization
                const expandedParts = expandSeriesForVisualization(p);
                expandedParts.forEach((expandedPart, index) => {
                    // Preserve order from parent series
                    expandedPart.order = p.order;
                    expandedPart.subOrder = index; // For sub-ordering within the series
                    allGraphParts.push(expandedPart);
                });
            } else {
                allGraphParts.push(p);
            }
        }
    });
    
    groups.forEach(g => {
        if (g && g.parts) { // Include parts from all groups
            g.parts.forEach(pInGroup => {
                if (pInGroup && pInGroup.id) { // Ensure part in group is valid
                    if (pInGroup.type === 'series') {
                        // Expand series into individual work/rest parts for visualization
                        const expandedParts = expandSeriesForVisualization(pInGroup);
                        expandedParts.forEach((expandedPart, index) => {
                            // Preserve order from parent series
                            expandedPart.order = pInGroup.order;
                            expandedPart.subOrder = index; // For sub-ordering within the series
                            allGraphParts.push(expandedPart);
                        });
                    } else {
                        allGraphParts.push(pInGroup);
                    }
                }
            });
        }
    });
    
    // Sort all parts for the graph based on their global order and sub-order
    allGraphParts.sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // If same order (i.e., parts of the same series), sort by subOrder
        return (a.subOrder || 0) - (b.subOrder || 0);
    });
    
    console.log("📊 Graph parts for rendering:", allGraphParts.map(p => ({
        name: p.nombre,
        order: p.order,
        subOrder: p.subOrder,
        seriesParent: p.seriesParent,
        seriesType: p.seriesType
    })));
    
    // Calculate total duration of all parts to be graphed for relative bar widths.
    const totalDurationForGraph = allGraphParts.reduce((acc, p) => acc + (p.duracion || 0), 0);
    
    allGraphParts.forEach(parte => {
        if (!parte || typeof parte.duracion === 'undefined') return; // Defensive check

        const barra = document.createElement("div");
        const altura = calcularVisual(parte.indice, parte.isRPE); // Use updated calcularVisual
        const ancho = totalDurationForGraph > 0 ? (parte.duracion / totalDurationForGraph) * 100 : 0;

        barra.className = "barra";
        
        // Add special styling for series parts
        if (parte.seriesParent) {
            barra.classList.add('series-part');
            if (parte.seriesType === 'work') {
                barra.classList.add('work-part');
            } else if (parte.seriesType === 'rest') {
                barra.classList.add('rest-part');
            }
        }
        
        // Use percentage of container height (450px minus padding)
        const containerHeight = 450 - 32; // 450px - 2rem padding (16px each side)
        barra.style.height = `${(altura / 100) * containerHeight}px`;
        barra.style.width = `${ancho}%`;

        const ritmoUmbralSecs = paceToSeconds(ritmoUmbralInput.value || "5:00");
        const ritmoDisplay = parte.isRPE ? 
            `RPE ${parte.indice}` : 
            `${secondsToPace((parte.indice / 100) * ritmoUmbralSecs)} min/km`;

        // Enhanced tooltip for series parts
        const phaseInfo = parte.seriesParent ? ` • ${parte.seriesType === 'work' ? 'Trabajo' : 'Descanso'} ${parte.seriesRepetition}` : '';
        barra.title = `${parte.nombre}${phaseInfo} • ${parte.isRPE ? 'RPE' : 'Zona'} ${parte.indice} • ${formatDuration(parte.duracion)} min`;
        
        // Shorter display name for series parts in the graph
        const displayName = parte.seriesParent ? 
            `${parte.seriesType === 'work' ? '🏃‍♂️' : '😴'} ${parte.seriesRepetition}` : 
            parte.nombre;
        
        barra.innerHTML = `<strong>${displayName}</strong><br>${ritmoDisplay}`;
        grafico.appendChild(barra);
    });

    // Add graph axis labels (re-add them if cleared by grafico.innerHTML)
    const intensidadLabel = document.createElement("div");
    intensidadLabel.className = "graph-label intensidad";
    intensidadLabel.textContent = "Intensidad";
    grafico.appendChild(intensidadLabel);

    const duracionLabel = document.createElement("div");
    duracionLabel.className = "graph-label duracion";
    duracionLabel.textContent = "Duración";
    grafico.appendChild(duracionLabel);

    // Defer Sortable initialization to ensure DOM is fully updated.
    // This helps prevent issues with Sortable attaching to elements that might be re-rendered.
    setTimeout(initializeSortable, 0); 
    updateSelectionToolbar(); // Update the visibility and count of the selection toolbar.
}

/**
 * Main rendering function for the application.
 * It clears and redraws the training part cards, group cards, and the visual graph.
 * This function is the single source of truth for updating the UI based on the current data state.
 */
function render() {
    console.log("Render called. Current partesEntreno (before migration):", JSON.parse(JSON.stringify(partesEntreno)), "Current groups (before migration):", JSON.parse(JSON.stringify(groups)));
    
    // Migrate existing data to new format if needed
    migrateToNewOrderFormat();
    
    updateGlobalOrderNumbers(); // Ensure all parts have correct global order numbers
    console.log("Render: State of partesEntreno immediately after updateGlobalOrderNumbers:", JSON.parse(JSON.stringify(partesEntreno)));

    // Call renderUI to handle the visual rendering
    renderUI();
    
    // Force update summary bar 
    console.log("🔄 FORCING updateSummaryBar from render()");
    updateSummaryBar();
}


/**
 * Calculates the approximate kilometers for a part based on its intensity and duration.
 * @param {object} parte - The training part object.
 * @returns {number} Approximate kilometers.
 */
function calculateApproxKms(parte) {
    // Handle series
    if (parte.type === 'series') {
        const workKms = calculateApproxKmsForSinglePhase(parte.workConfig);
        const restKms = calculateApproxKmsForSinglePhase(parte.restConfig);
        return (workKms + restKms) * parte.repetitions;
    }
    
    // Handle regular parts
    return calculateApproxKmsForSinglePhase(parte);
}

/**
 * Calculates approximate kilometers for a single phase (work, rest, or regular part).
 * @param {object} phaseConfig - Configuration object with indice, duracion, isRPE, etc.
 * @returns {number} Approximate kilometers.
 */
function calculateApproxKmsForSinglePhase(phaseConfig) {
    // Si fue diseñada por distancia, usar el valor original directamente
    if (phaseConfig.designedIn === 'distance' && phaseConfig.originalValue !== null && phaseConfig.originalValue !== undefined) {
        return phaseConfig.originalValue;
    }
    
    // Si fue diseñada por tiempo, calcular distancia aproximada
    const umbralPace = ritmoUmbralInput.value || "5:00";
    const umbralPaceSeconds = paceToSeconds(umbralPace);
    let paceSeconds;
    
    if (phaseConfig.isRPE) {
        // Map RPE 0-10 to 165-85 (inverted scale) - RPE specific range
        const zoneValue = RPE_ZONE_MAX - (phaseConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        paceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        paceSeconds = umbralPaceSeconds * (phaseConfig.indice / 100);
    }
    
    const speed = 1000 / paceSeconds;
    const distanceKm = (phaseConfig.duracion * speed) / 1000;
    return distanceKm;
}

/**
 * Calculates the current effective duration for a single phase, taking into account if it was designed by distance.
 * This updates the duration based on current threshold pace for distance-designed parts.
 * @param {object} phaseConfig - Configuration object with indice, duracion, isRPE, etc.
 * @returns {number} Effective duration in seconds.
 */
function calculateEffectiveDurationForSinglePhase(phaseConfig) {
    // Si fue diseñada por tiempo, usar la duración original directamente
    if (phaseConfig.designedIn !== 'distance' || phaseConfig.originalValue === null || phaseConfig.originalValue === undefined) {
        return phaseConfig.duracion;
    }
    
    // Si fue diseñada por distancia, recalcular duración basada en el ritmo umbral actual
    const umbralPace = ritmoUmbralInput.value || "5:00";
    const umbralPaceSeconds = paceToSeconds(umbralPace);
    let paceSeconds;
    
    if (phaseConfig.isRPE) {
        // Map RPE 0-10 to 165-85 (inverted scale) - RPE specific range
        const zoneValue = RPE_ZONE_MAX - (phaseConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        paceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        paceSeconds = umbralPaceSeconds * (phaseConfig.indice / 100);
    }
    
    // Calcular duración: distancia (km) * pace (s/km) = tiempo (s)
    const effectiveDuration = phaseConfig.originalValue * paceSeconds;
    return Math.round(effectiveDuration);
}

/**
 * Creates the HTML structure for a single training part card.
 * @param {object} parte - The training part object.
 * @returns {HTMLElement} The created card element.
 */
function createPartCard(parte) {
    // Handle series differently
    if (parte.type === 'series') {
        return createSeriesCard(parte);
    }
    
    const { id, nombre, indice, duracion, isRPE, generalOrder, innerOrder, order } = parte; // Destructure part properties
    const ritmoUmbral = paceToSeconds(ritmoUmbralInput.value || "5:00");
    const ritmoZona = isRPE ? `RPE ${indice}` : secondsToPace((indice / 100) * ritmoUmbral);

    // Debug logging for order properties
    console.log(`createPartCard for ${nombre}:`, { 
        id, generalOrder, innerOrder, order, 
        generalOrderType: typeof generalOrder, 
        innerOrderType: typeof innerOrder 
    });

    // Determine display order - use new system if available, fallback to old system
    let displayOrder;
    if (generalOrder !== undefined && generalOrder !== null) {
        displayOrder = `G${generalOrder}`;
        console.log(`Using generalOrder for ${nombre}: ${displayOrder}`);
    } else if (innerOrder !== undefined && innerOrder !== null) {
        displayOrder = `I${innerOrder}`;
        console.log(`Using innerOrder for ${nombre}: ${displayOrder}`);
    } else if (order !== undefined) {
        displayOrder = order; // Fallback to old system
        console.log(`Using fallback order for ${nombre}: ${displayOrder}`);
    } else {
        displayOrder = '-';
        console.log(`No order found for ${nombre}, using dash`);
    }

    // Calculate approx KMs
    const approxKms = calculateApproxKms(parte);
    
    // Calculate approx pace for display
    const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
    let paceSeconds;
    if (isRPE) {
        // Map RPE 0-10 to RPE zone range (currently 150-70)
        const zoneValue = RPE_ZONE_MAX - (indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        paceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        paceSeconds = umbralPaceSeconds * (indice / 100);
    }
    const approxPace = formatPaceMinKm(paceSeconds);

    // Determine what to show based on how the part was designed
    let principalInfo = '';
    let approximateInfo = '';
    
    if (parte.designedIn === 'distance') {
        // Designed by distance - show distance as principal, time as approximate
        const effectiveDuration = calculateEffectiveDurationForSinglePhase(parte);
        principalInfo = `${(parte.originalValue || approxKms).toFixed(2)} km`;
        approximateInfo = `~${formatDuration(effectiveDuration)} min | ~${approxPace} min/km`;
    } else {
        // Designed by time (default) - show time as principal, distance as approximate
        principalInfo = `${formatDuration(duracion)} min`;
        approximateInfo = `~${approxKms.toFixed(2)} km | ~${approxPace} min/km`;
    }

    const card = document.createElement("div");
    card.className = "part-card";
    card.setAttribute("data-part-id", id); // Store ID for Sortable.js and event handling
    card.setAttribute("data-id", id);       // For Sortable.js compatibility if it expects data-id
    card.setAttribute("data-type", "part"); // Distinguish from group cards
    card.draggable = true; // Make the card draggable (though Sortable.js handles this)

    card.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="custom-checkbox" 
                   onchange="togglePartSelection('${id}')" 
                   ${selectedParts.has(id) ? 'checked' : ''}>
        </div>
        <div class="part-card-header">
            <span class="part-card-title">${nombre} <small style="opacity: 0.7; font-size: 0.8em;">(diseñado por ${(parte.designedIn === 'distance') ? 'distancia' : 'tiempo'})</small></span>
        </div>
        <div class="part-card-body">
            <div class="part-card-stat approximate">
                <span>Duración aprox:</span>
                <span>${parte.designedIn === 'distance' ? `~${formatDuration(calculateEffectiveDurationForSinglePhase(parte))}` : formatDuration(duracion)} min</span>
            </div>
            <div class="part-card-stat approximate">
                <span>Kms aprox:</span>
                <span>~${approxKms.toFixed(2)} km</span>
            </div>
            <div class="part-card-stat order-display">
                <span>Orden:</span>
                <span>${displayOrder}</span>
            </div>
            <div class="part-card-stat">
                <span>Intensidad:</span>
                <span>${isRPE ? 'RPE' : 'Zona'} ${indice}</span>
            </div>
            <div class="part-card-stat">
                <span>${parte.designedIn === 'distance' ? 'Distancia' : 'Duración'}:</span>
                <span>${principalInfo}</span>
            </div>
            <div class="part-card-stat">
                <span>Ritmo:</span>
                <span>${ritmoZona} min/km</span>
            </div>
        </div>
        <div class="part-card-actions">
            <button onclick="editParte('${id}')" class="tooltip">✏️ <span class="tooltiptext">Editar</span></button>
            <button onclick="duplicateSinglePart('${id}')" class="tooltip">📋 <span class="tooltiptext">Duplicar</span></button>
            <button onclick="deleteSinglePart('${id}')" class="tooltip">🗑️ <span class="tooltiptext">Eliminar</span></button>
        </div>
    `;
    return card;
}

/**
 * Creates the HTML structure for a series card.
 * @param {object} series - The series object.
 * @returns {HTMLElement} The created series card element.
 */
function createSeriesCard(series) {
    const { id, nombre, workConfig, restConfig, repetitions, generalOrder, innerOrder, order } = series;
    
    // Determine display order
    let displayOrder;
    if (generalOrder !== undefined && generalOrder !== null) {
        displayOrder = `G${generalOrder}`;
    } else if (innerOrder !== undefined && innerOrder !== null) {
        displayOrder = `I${innerOrder}`;
    } else if (order !== undefined) {
        displayOrder = order;
    } else {
        displayOrder = '-';
    }

    // Calculate total series info
    const totalDuration = getSeriesTotalDuration(series);
    const totalKms = calculateApproxKms(series);
    
    // Calculate work and rest info
    const workKms = calculateApproxKmsForSinglePhase(workConfig);
    const restKms = calculateApproxKmsForSinglePhase(restConfig);
    
    // Calculate effective durations for display
    const workEffectiveDuration = calculateEffectiveDurationForSinglePhase(workConfig);
    const restEffectiveDuration = calculateEffectiveDurationForSinglePhase(restConfig);
    
    const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
    
    // Work pace
    let workPaceSeconds;
    if (workConfig.isRPE) {
        const zoneValue = RPE_ZONE_MAX - (workConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        workPaceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        workPaceSeconds = umbralPaceSeconds * (workConfig.indice / 100);
    }
    const workPace = formatPaceMinKm(workPaceSeconds);
    
    // Rest pace
    let restPaceSeconds;
    if (restConfig.isRPE) {
        const zoneValue = RPE_ZONE_MAX - (restConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        restPaceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        restPaceSeconds = umbralPaceSeconds * (restConfig.indice / 100);
    }
    const restPace = formatPaceMinKm(restPaceSeconds);

    const card = document.createElement("div");
    card.className = "part-card series-card";
    card.setAttribute("data-part-id", id);
    card.setAttribute("data-id", id);
    card.setAttribute("data-type", "part");
    card.draggable = true;

    card.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="custom-checkbox" 
                   onchange="togglePartSelection('${id}')" 
                   ${selectedParts.has(id) ? 'checked' : ''}>
        </div>
        <div class="part-card-header">
            <span class="part-card-title">⚡ ${nombre} <small style="opacity: 0.7; font-size: 0.8em;">(serie x${repetitions})</small></span>
        </div>
        <div class="part-card-body">
            <div class="part-card-stat approximate">
                <span>Total Duración:</span>
                <span>${formatDuration(totalDuration)} min</span>
            </div>
            <div class="part-card-stat approximate">
                <span>Total Distancia:</span>
                <span>~${totalKms.toFixed(2)} km</span>
            </div>
            <div class="part-card-stat order-display">
                <span>Orden:</span>
                <span>${displayOrder}</span>
            </div>
            <div class="series-totals">
            </div>
            <div class="series-details">
                <div class="series-phase work-phase">
                    <h6>🏃‍♂️ Trabajo</h6>
                    <div class="part-card-stat">
                        <span>Intensidad:</span>
                        <span>${workConfig.isRPE ? 'RPE' : 'Zona'} ${workConfig.indice}</span>
                    </div>
                    <div class="part-card-stat">
                        <span>Duración:</span>
                        <span>${formatDuration(workEffectiveDuration)} min</span>
                    </div>
                    <div class="part-card-stat">
                        <span>Pace:</span>
                        <span>~${workPace} min/km</span>
                    </div>
                    <div class="part-card-stat approximate">
                        <span>Distancia:</span>
                        <span>~${workKms.toFixed(2)} km</span>
                    </div>
                </div>
                <div class="series-phase rest-phase">
                    <h6>😴 Descanso</h6>
                    <div class="part-card-stat">
                        <span>Intensidad:</span>
                        <span>${restConfig.isRPE ? 'RPE' : 'Zona'} ${restConfig.indice}</span>
                    </div>
                    <div class="part-card-stat">
                        <span>Duración:</span>
                        <span>${formatDuration(restEffectiveDuration)} min</span>
                    </div>
                    <div class="part-card-stat">
                        <span>Pace:</span>
                        <span>~${restPace} min/km</span>
                    </div>
                    <div class="part-card-stat approximate">
                        <span>Distancia:</span>
                        <span>~${restKms.toFixed(2)} km</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="part-card-actions">
            <button onclick="editParte('${id}')" class="tooltip">✏️ <span class="tooltiptext">Editar</span></button>
            <button onclick="duplicateSinglePart('${id}')" class="tooltip">📋 <span class="tooltiptext">Duplicar</span></button>
            <button onclick="deleteSinglePart('${id}')" class="tooltip">🗑️ <span class="tooltiptext">Eliminar</span></button>
        </div>
    `;
    return card;
}

/**
 * Initializes Sortable.js for drag-and-drop functionality on the main order container.
 * This function sets up the sortable interface with proper event handlers and visual feedback.
 */
function initializeSortableJS() {
    console.log("🎯 Initializing Enhanced Sortable.js...");
    
    const mainOrderContainer = document.querySelector('.main-order-container');
    if (!mainOrderContainer) {
        console.warn("Main order container not found, skipping Sortable initialization");
        return;
    }

    // Destroy existing Sortable instance if it exists
    if (window.mainSortableInstance) {
        window.mainSortableInstance.destroy();
        console.log("🗑️ Destroyed existing Sortable instance");
    }

    // Initialize Sortable with enhanced options
    window.mainSortableInstance = new Sortable(mainOrderContainer, {
        group: 'main-items',
        animation: 200, // Increased animation duration for smoother transitions
        easing: "cubic-bezier(0.4, 0, 0.2, 1)", // Material Design easing
        forceFallback: true,
        fallbackClass: 'sortable-fallback',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        fallbackOnBody: true,
        swapThreshold: 0.65, // More responsive swap detection
        invertSwap: true, // Better swap behavior
        
        // Only allow items with data-part-id or data-group-id to be sorted
        filter: function(evt, item) {
            return !item.hasAttribute('data-part-id') && !item.hasAttribute('data-group-id');
        },

        onStart: function(evt) {
            console.log("🎯 Enhanced drag started for item:", evt.item);
            
            // Add enhanced dragging states
            const partsTable = document.querySelector('.parts-table');
            if (partsTable) {
                partsTable.classList.add('dragging');
            }
            
            document.body.classList.add('is-dragging');
            evt.item.classList.add('dragging', 'drag-source');
            
            // Add drop zone indicators to all valid targets
            const allCards = mainOrderContainer.querySelectorAll('.part-card, .group-card');
            allCards.forEach(card => {
                if (card !== evt.item) {
                    card.classList.add('drop-zone-indicator');
                }
            });
            
            // Store original index for potential rollback
            evt.item.dataset.originalIndex = evt.oldIndex;
        },

        onMove: function(evt) {
            const related = evt.related;
            const dragged = evt.dragged;
            
            // Enhanced visual feedback during move
            if (related) {
                // Clear all existing indicators
                const allCards = mainOrderContainer.querySelectorAll('.part-card, .group-card');
                allCards.forEach(card => {
                    card.classList.remove('drop-above', 'drop-below', 'drop-target-active');
                });
                
                // Determine drop position
                const rect = related.getBoundingClientRect();
                const draggedRect = dragged.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                if (draggedRect.top < midpoint) {
                    related.classList.add('drop-above');
                } else {
                    related.classList.add('drop-below');
                }
                
                related.classList.add('drop-target-active');
            }
            
            return true; // Allow the move
        },

        onEnd: function(evt) {
            console.log("🎯 Enhanced drag ended");
            
            // Remove all drag-related classes
            const partsTable = document.querySelector('.parts-table');
            if (partsTable) {
                partsTable.classList.remove('dragging');
            }
            
            document.body.classList.remove('is-dragging');
            evt.item.classList.remove('dragging', 'drag-source');
            
            // Clean up all drop indicators
            const allCards = mainOrderContainer.querySelectorAll('.part-card, .group-card');
            allCards.forEach(card => {
                card.classList.remove('drop-zone-indicator', 'drop-above', 'drop-below', 'drop-target-active');
            });
            
            // Check if order actually changed
            const newIndex = evt.newIndex;
            const oldIndex = parseInt(evt.item.dataset.originalIndex);
            
            if (newIndex !== oldIndex) {
                console.log(`📦 Item moved from position ${oldIndex} to ${newIndex}`);
                
                // Add success feedback
                evt.item.classList.add('drop-success');
                setTimeout(() => {
                    evt.item.classList.remove('drop-success');
                }, 600);
            
            // Re-order items based on new positions
            rebuildStateFromDOM();
            
            // Re-render to update order numbers and graph
            render();
                
                // Show success notification
                showNotification('Orden actualizado correctamente', 'success');
            }
            
            // Clean up
            delete evt.item.dataset.originalIndex;
        },

        onChange: function(evt) {
            console.log("🔄 Order changed during drag");
            // Real-time feedback during drag operations
        },

        onSort: function(evt) {
            console.log("📊 Sort event triggered");
            // Can be used for analytics or additional logic
        }
    });

    console.log("✅ Enhanced Sortable.js initialized successfully");
}

/**
 * Rebuilds the application state (partesEntreno and groups arrays) from the DOM order.
 * This is called after drag-and-drop operations to sync the data with the visual order.
 */
function rebuildStateFromDOM() {
    console.log("🔄 Rebuilding state from DOM...");
    
    const mainOrderContainer = document.querySelector('.main-order-container');
    if (!mainOrderContainer) {
        console.warn("Main order container not found");
        return;
    }

    const cards = Array.from(mainOrderContainer.children);
    const newPartesEntreno = [];
    const newGroups = [];

    cards.forEach((card, index) => {
        const partId = card.getAttribute('data-part-id');
        const groupId = card.getAttribute('data-group-id');
        
        if (partId) {
            // It's a single part
            const part = findPartByIdGlobal(partId, partesEntreno, groups);
            if (part) {
                part.generalOrder = index + 1;
                part.innerOrder = null;
                newPartesEntreno.push(part);
            }
        } else if (groupId) {
            // It's a group
            const group = findGroupByIdGlobal(groupId, groups);
            if (group) {
                group.generalOrder = index + 1;
                newGroups.push(group);
            }
        }
    });

    // Update global arrays
    partesEntreno.length = 0;
    partesEntreno.push(...newPartesEntreno);
    
    groups.length = 0;
    groups.push(...newGroups);

    console.log("✅ State rebuilt from DOM order");
}

/**
 * Creates the HTML structure for a group card, including its member part cards.
 * @param {object} group - The group object.
 * @returns {HTMLElement} The created group card element.
 */
function createGroupCard(group) {
    const { id, name, parts = [], generalOrder, order } = group;
    
    // Determine display order
    let displayOrder;
    if (generalOrder !== undefined && generalOrder !== null) {
        displayOrder = `G${generalOrder}`;
    } else if (order !== undefined) {
        displayOrder = order;
    } else {
        displayOrder = '-';
    }

    // Calculate group totals
    let totalDuration = 0;
    let totalKms = 0;
    parts.forEach(part => {
        if (part.type === 'series') {
            totalDuration += getSeriesTotalDuration(part);
        } else {
            totalDuration += part.duracion || 0;
        }
        totalKms += calculateApproxKms(part);
    });

    const groupCard = document.createElement("div");
    groupCard.className = "group-card";
    groupCard.setAttribute("data-group-id", id);
    groupCard.setAttribute("data-id", id);
    groupCard.setAttribute("data-type", "group");
    groupCard.draggable = true;

    // Create enhanced parts list HTML with detailed info and actions
    const partsListHTML = parts.map((part, index) => {
        const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
        let paceSeconds, paceDisplay;
        
        if (part.type === 'series') {
            // For series, show work phase pace
            if (part.workConfig.isRPE) {
                const zoneValue = RPE_ZONE_MAX - (part.workConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
                paceSeconds = umbralPaceSeconds * (zoneValue / 100);
            } else {
                paceSeconds = umbralPaceSeconds * (part.workConfig.indice / 100);
            }
            paceDisplay = formatPaceMinKm(paceSeconds);
        } else {
            // For regular parts
            if (part.isRPE) {
                const zoneValue = RPE_ZONE_MAX - (part.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
                paceSeconds = umbralPaceSeconds * (zoneValue / 100);
            } else {
                paceSeconds = umbralPaceSeconds * (part.indice / 100);
            }
            paceDisplay = formatPaceMinKm(paceSeconds);
        }
        
        const approxKms = calculateApproxKms(part);
        
        return `
        <div class="group-part-item enhanced" data-part-id="${part.id}">
            <div class="group-part-header">
                <span class="group-part-number">I${index + 1}.</span>
            <span class="group-part-name">${part.nombre}</span>
                <div class="group-part-actions">
                    <button onclick="editParte('${part.id}')" class="btn-mini tooltip" title="Editar parte">✏️</button>
                    <button onclick="movePartOutOfGroup('${part.id}', '${id}')" class="btn-mini tooltip" title="Sacar del grupo">↗️</button>
                    <button onclick="deleteSinglePart('${part.id}')" class="btn-mini tooltip" title="Eliminar parte">🗑️</button>
                </div>
            </div>
            <div class="group-part-details">
                ${part.type === 'series' ? 
                    `<div class="series-info">
                        <span class="part-type">⚡ Serie x${part.repetitions}</span>
                        <span class="duration-info">${formatDuration(getSeriesTotalDuration(part))} min total</span>
                        <span class="pace-info">~${paceDisplay} min/km</span>
                        <span class="distance-info">~${approxKms.toFixed(2)} km</span>
                    </div>` : 
                    `<div class="part-info">
                        <span class="intensity-info">${part.isRPE ? 'RPE' : 'Zona'} ${part.indice}</span>
                        <span class="duration-info">${formatDuration(part.duracion)} min</span>
                        <span class="pace-info">~${paceDisplay} min/km</span>
                        <span class="distance-info">~${approxKms.toFixed(2)} km</span>
                    </div>`
                }
        </div>
        </div>
    `;
    }).join('');

    groupCard.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="custom-checkbox" 
                   onchange="togglePartSelection('${id}')" 
                   ${selectedParts.has(id) ? 'checked' : ''}>
        </div>
        <div class="group-card-header">
            <span class="group-card-title">📁 ${name} <small style="opacity: 0.7; font-size: 0.8em;">(${parts.length} partes)</small></span>
        </div>
        <div class="group-card-body">
            <div class="part-card-stat order-display">
                <span>Orden:</span>
                <span>${displayOrder}</span>
            </div>
            <div class="group-totals">
                <div class="part-card-stat">
                    <span>Total Duración:</span>
                    <span>${formatDuration(totalDuration)} min</span>
                </div>
                <div class="part-card-stat">
                    <span>Total Distancia:</span>
                    <span>~${totalKms.toFixed(2)} km</span>
                </div>
            </div>
            <div class="group-parts-list">
                <h6>Partes del grupo:</h6>
                ${partsListHTML}
            </div>
        </div>
        <div class="group-actions">
            <button onclick="editGroup('${id}')" class="tooltip">✏️ <span class="tooltiptext">Editar grupo</span></button>
            <button onclick="duplicateGroup('${id}')" class="tooltip">📋 <span class="tooltiptext">Duplicar grupo</span></button>
            <button onclick="deleteGroup('${id}')" class="tooltip">🗑️ <span class="tooltiptext">Eliminar grupo</span></button>
        </div>
    `;
    
    return groupCard;
}

// --- MISSING ESSENTIAL FUNCTIONS ---

/**
 * Toggles the selection state of a training part or group.
 * @param {string} partId - The ID of the part or group to toggle.
 */
function togglePartSelection(partId) {
    if (selectedParts.has(partId)) {
        selectedParts.delete(partId);
    } else {
        selectedParts.add(partId);
    }
    updateSelectionToolbar();
}

/**
 * Updates the selection toolbar visibility and content based on current selection.
 */
function updateSelectionToolbar() {
    if (!selectionToolbar) return;
    
    if (selectedParts.size > 0) {
        selectionToolbar.classList.add('active');
        const selectionCount = selectionToolbar.querySelector('.selection-count');
        if (selectionCount) {
            selectionCount.textContent = `${selectedParts.size} elemento${selectedParts.size > 1 ? 's' : ''} seleccionado${selectedParts.size > 1 ? 's' : ''}`;
        }
    } else {
        selectionToolbar.classList.remove('active');
    }
}

/**
 * Updates the summary bar with current training data.
 */
function updateSummaryBar() {
    console.log("[updateSummaryBar] Attempting to update summary bar...");
    const summaryBar = document.getElementById('summaryBar');

    if (!summaryBar) {
        console.error("[updateSummaryBar] CRITICAL: #summaryBar element NOT FOUND in the DOM. Cannot update summary.");
        return;
    }
    console.log("[updateSummaryBar] #summaryBar element found:", summaryBar);

    // DEBUG: Log current state
    console.log("[updateSummaryBar] Current state:", {
        partesEntreno: partesEntreno,
        groups: groups
    });

    // Calculate totals and weighted pace
    let totalDuration = 0;
    let totalDistance = 0;
    let weightedPaceSum = 0; // Sum of (duration * pace_in_seconds)

    // Get threshold pace more robustly
    const ritmoUmbralElement = document.getElementById('ritmoUmbral');
    const umbralPaceSeconds = paceToSeconds((ritmoUmbralElement?.value) || "5:00");
    
    console.log("[updateSummaryBar] Using umbral pace:", ritmoUmbralElement?.value || "5:00");

    // Helper function to process a single part
    function processPartForSummary(part) {
        console.log("[updateSummaryBar] Processing part:", {
            nombre: part?.nombre,
            type: part?.type,
            duracion: part?.duracion,
            hasWorkConfig: !!part?.workConfig,
            hasRestConfig: !!part?.restConfig,
            repetitions: part?.repetitions
        });
        
        if (!part) {
            console.warn("[updateSummaryBar] Skipping null/undefined part");
            return;
        }

        // Check if it's a series first
        if (part.type === 'series' && part.workConfig && part.restConfig && part.repetitions) {
            console.log("[updateSummaryBar] 🔥 PROCESSING SERIES:", part.nombre, "repetitions:", part.repetitions);
            
            // For series, calculate total duration directly using the dedicated function
            const seriesTotalDuration = getSeriesTotalDuration(part);
            
            // Calculate total distance for the series
            const workDistance = calculateApproxKmsForSinglePhase(part.workConfig);
            const restDistance = calculateApproxKmsForSinglePhase(part.restConfig);
            const seriesTotalDistance = (workDistance + restDistance) * part.repetitions;
            
            console.log("[updateSummaryBar] 🎯 Series totals:", {
                duration: seriesTotalDuration,
                distance: seriesTotalDistance,
                workDistance,
                restDistance,
                repetitions: part.repetitions
            });
            
            // For weighted pace, we need to calculate based on work and rest phases separately
            let seriesWeightedPaceSum = 0;
            
            // Work phases contribution
            let workPaceSeconds;
            if (part.workConfig.isRPE) {
                const zoneValue = RPE_ZONE_MAX - (part.workConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
                workPaceSeconds = umbralPaceSeconds * (zoneValue / 100);
        } else {
                workPaceSeconds = umbralPaceSeconds * (part.workConfig.indice / 100);
            }
            
            // Rest phases contribution
            let restPaceSeconds;
            if (part.restConfig.isRPE) {
                const zoneValue = RPE_ZONE_MAX - (part.restConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
                restPaceSeconds = umbralPaceSeconds * (zoneValue / 100);
            } else {
                restPaceSeconds = umbralPaceSeconds * (part.restConfig.indice / 100);
            }
            
            // Calculate weighted pace sum for the entire series
            const workTotalDuration = calculateEffectiveDurationForSinglePhase(part.workConfig) * part.repetitions;
            const restTotalDuration = calculateEffectiveDurationForSinglePhase(part.restConfig) * part.repetitions;
            
            seriesWeightedPaceSum = (workTotalDuration * workPaceSeconds) + (restTotalDuration * restPaceSeconds);
            
            console.log("[updateSummaryBar] 📊 Series pace calculation:", {
                workPace: workPaceSeconds,
                restPace: restPaceSeconds,
                workTotalDuration,
                restTotalDuration,
                seriesWeightedPaceSum
            });
            
            totalDuration += seriesTotalDuration;
            totalDistance += seriesTotalDistance;
            weightedPaceSum += seriesWeightedPaceSum;
            
            console.log("[updateSummaryBar] ✅ SERIES ADDED - Running totals:", {
                totalDuration,
                totalDistance,
                weightedPaceSum
            });
            
        } else if (part.duracion !== undefined) {
            // Regular part - use effective duration
            const partDuration = calculateEffectiveDurationForSinglePhase(part);
            const partDistance = calculateApproxKms(part);
            
            // Calculate pace for this part
            let paceSeconds;
            if (part.isRPE) {
                const zoneValue = RPE_ZONE_MAX - (part.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
                paceSeconds = umbralPaceSeconds * (zoneValue / 100);
                } else {
                paceSeconds = umbralPaceSeconds * (part.indice / 100);
            }
            
            console.log("[updateSummaryBar] 📝 Regular part calculation:", {
                name: part.nombre,
                originalDuration: part.duracion,
                effectiveDuration: partDuration,
                distance: partDistance,
                pace: paceSeconds,
                isRPE: part.isRPE,
                indice: part.indice,
                designedIn: part.designedIn
            });
            
            totalDuration += partDuration;
            totalDistance += partDistance;
            weightedPaceSum += partDuration * paceSeconds; // Weight by effective duration
            
        } else {
            console.warn("[updateSummaryBar] ❌ Skipping invalid part - no duracion and not a series:", part);
        }
    }

    // Add individual parts from partesEntreno
    console.log("[updateSummaryBar] 🔍 Calculating totals from partesEntreno:", partesEntreno.length, "parts");
    partesEntreno.forEach((part, index) => {
        console.log(`[updateSummaryBar] Processing partesEntreno[${index}]:`, part);
        processPartForSummary(part);
    });

    // Add group parts
    console.log("[updateSummaryBar] 🔍 Calculating totals from groups:", groups.length, "groups");
    groups.forEach((group, groupIndex) => {
        if (group && group.parts) {
            console.log(`[updateSummaryBar] Processing group[${groupIndex}]:`, group.name, "with", group.parts.length, "parts");
            group.parts.forEach((part, partIndex) => {
                console.log(`[updateSummaryBar] Processing group[${groupIndex}].parts[${partIndex}]:`, part);
                processPartForSummary(part);
            });
        }
    });

    // Calculate weighted average pace
    const weightedAveragePaceSeconds = totalDuration > 0 ? weightedPaceSum / totalDuration : 0;
    const weightedAveragePace = formatPaceMinKm(weightedAveragePaceSeconds);

    console.log("[updateSummaryBar] 🏁 FINAL CALCULATED TOTALS: ", {
        totalDurationRaw: totalDuration,
        totalDistanceRaw: totalDistance,
        weightedPaceSum,
        weightedAveragePaceSeconds,
        weightedAveragePace,
        formattedDuration: formatDuration(totalDuration),
        formattedDistance: totalDistance.toFixed(2)
    });

    const formattedDuration = formatDuration(totalDuration);
    const formattedDistance = totalDistance.toFixed(2);

    // Update the summary display
    const summaryStats = summaryBar.querySelector('.summary-stats');
    
    if (summaryStats) {
        console.log("[updateSummaryBar] .summary-stats element found. Updating its innerHTML.");
        summaryStats.innerHTML = `
            <div class="summary-stat">
                <div class="summary-stat-value">${formattedDuration}</div>
                <div class="summary-stat-label">Duración Total</div>
            </div>
            <div class="summary-stat">
                <div class="summary-stat-value">${formattedDistance} km</div>
                <div class="summary-stat-label">Distancia Total</div>
            </div>
            <div class="summary-stat">
                <div class="summary-stat-value">${weightedAveragePace}</div>
                <div class="summary-stat-label">Ritmo Medio Ponderado</div>
            </div>
        `;
        console.log("[updateSummaryBar] Summary bar updated successfully.");
    } else {
        console.error("[updateSummaryBar] CRITICAL: .summary-stats element NOT FOUND within #summaryBar. The summary display will not be updated.");
        // Optionally, provide direct feedback in the UI if summaryStats is missing
        summaryBar.innerHTML = '<p style="color:red; font-weight:bold;">Error: Contenedor de resumen (.summary-stats) no encontrado. El resumen no se puede mostrar.</p>';
    }
}

/**
 * Formats pace in minutes per kilometer.
 * @param {number} paceInSeconds - Pace in seconds per kilometer.
 * @returns {string} Formatted pace string.
 */
function formatPaceMinKm(paceInSeconds) {
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.round(paceInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Gets the current duration from the form, handling both time and distance modes.
 * @returns {number} Duration in seconds.
 */
function getCurrentDuration() {
    const durationToggle = document.getElementById('durationType');
    const kmInput = document.getElementById('kilometrosInput');
    const ritmoUmbralInput = document.getElementById('ritmoUmbral');
    
    if (durationToggle && durationToggle.checked) {
        // Distance mode - convert km to time
        const km = kmInput ? parseFloat(kmInput.value || 0) : 0;
        if (km <= 0) return 0;
        
        // Calculate time based on current intensity and threshold pace
        const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput?.value || "5:00");
        let paceSeconds;
        
        const intensityToggle = document.getElementById('intensityType');
        if (intensityToggle && intensityToggle.checked) {
            // RPE mode
            const rpeSlider = document.getElementById('indiceSliderRPE');
            const rpeValue = rpeSlider ? parseFloat(rpeSlider.value) : 5;
            const zoneValue = RPE_ZONE_MAX - (rpeValue / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
            paceSeconds = umbralPaceSeconds * (zoneValue / 100);
        } else {
            // Zone mode
            let values = [100, 100];
            if (zoneSliderInstance) {
                try {
                values = zoneSliderInstance.get().map(parseFloat);
                } catch (e) {
                    console.warn('Error getting zone slider values in getCurrentDuration:', e);
                }
            }
            const avgZone = (values[0] + values[1]) / 2;
            paceSeconds = umbralPaceSeconds * (avgZone / 100);
        }
        
        return Math.round(km * paceSeconds);
    } else {
        // Time mode
        const form = document.getElementById('form');
        const durationInput = form?.querySelector('[name="duracion"]');
        const durationValue = durationInput?.value.trim();
        
        if (!durationValue) return 0;
        
        try {
            return parseDuration(durationValue);
        } catch (e) {
            console.warn('Error parsing duration:', e);
            return 0;
        }
    }
}

/**
 * Placeholder functions for edit operations that would be implemented based on needs.
 */
function editParte(partId) {
    const part = findPartByIdGlobal(partId, partesEntreno, groups);
    if (!part) {
        showNotification('No se pudo encontrar la parte seleccionada', 'error');
        return;
    }
    
    // Store the part being edited
    editingPartId = partId;
    
    // Populate the form with existing values
    populateFormForEdit(part);
    
    // Change modal title and button text
    const modal = document.getElementById('addTrainingModal');
    const modalTitle = modal.querySelector('.modal-title');
    const submitBtn = modal.querySelector('.submit-btn');
    
    modalTitle.textContent = 'Editar Parte de Entrenamiento';
    submitBtn.textContent = 'Actualizar Parte';
    
    // Add editing flag to the modal
    modal.setAttribute('data-editing', 'true');
    
    // Show the modal
    showAddTrainingModal();
}

/**
 * Populates the form with existing part data for editing
 */
function populateFormForEdit(part) {
    // Reset form first
    resetForm();
    
    // Fill in basic info
    const nombreField = document.getElementById('nombre');
    if (nombreField) {
        nombreField.value = part.nombre || '';
    }
    
    // Check if it's a series or single part
    if (part.type === 'series') {
        // Set part type to series
        const partTypeField = document.getElementById('partType');
        if (partTypeField) {
            partTypeField.checked = true; // It's a checkbox/toggle
        }
        updatePartTypeVisibility();
        
        // Fill series data
        const repetitionsField = document.getElementById('repetitionsInput');
        if (repetitionsField) {
            repetitionsField.value = part.repetitions || 1;
        }
        
        // Populate work phase
        if (part.workConfig) {
            populatePhaseForm(part.workConfig, 'work');
        }
        
        // Populate rest phase
        if (part.restConfig) {
            populatePhaseForm(part.restConfig, 'rest');
        }
        
    } else {
        // Single part
        const partTypeField = document.getElementById('partType');
        if (partTypeField) {
            partTypeField.checked = false; // It's a checkbox/toggle
        }
        updatePartTypeVisibility();
        
        // Fill single part data
        populatePhaseForm(part, 'single');
    }
    
    // Update all UI elements
    updateDurationInputVisibility();
    updateSliderVisibility();
}

/**
 * Populates form fields for a specific phase (work, rest, or single)
 */
function populatePhaseForm(config, phaseType) {
    console.log('Populating phase form:', phaseType, config);
    
    if (phaseType === 'single') {
        // Handle single part
        
        // Set intensity type
        const intensityToggle = document.getElementById('intensityType');
        if (intensityToggle) {
            intensityToggle.checked = config.isRPE || false;
        }
        
        // Set duration type
        const durationToggle = document.getElementById('durationType');
        if (durationToggle) {
            durationToggle.checked = config.designedIn === 'distance';
        }
        
        // Set duration value
        if (config.designedIn === 'distance' && config.originalValue) {
            const kmField = document.getElementById('kilometrosInput');
            if (kmField) {
                kmField.value = config.originalValue;
            }
        } else if (config.duracion) {
            const durationField = document.querySelector('input[name="duracion"]');
            if (durationField) {
                durationField.value = formatDuration(config.duracion);
            }
        }
        
        // Set intensity value - handle via sliders after visibility update
        setTimeout(() => {
            if (config.isRPE) {
                const rpeSlider = document.getElementById('indiceSliderRPE');
                if (rpeSlider) {
                    rpeSlider.value = config.indice || config.originalValue || 5;
                    // Trigger change event to update display
                    rpeSlider.dispatchEvent(new Event('input'));
                }
            } else {
                // Set zone values if available
                if (zoneSliderInstance && config.indice) {
                    // Set both values to the same for simplicity
                    zoneSliderInstance.set([config.indice, config.indice]);
                }
            }
        }, 100);
        
    } else {
        // Handle work/rest phase
        const prefix = phaseType;
        
        // Set intensity type
        const intensityToggle = document.getElementById(`${prefix}IntensityType`);
        if (intensityToggle) {
            intensityToggle.checked = config.isRPE || false;
        }
        
        // Set duration type
        const durationToggle = document.getElementById(`${prefix}DurationType`);
        if (durationToggle) {
            durationToggle.checked = config.designedIn === 'distance';
        }
        
        // Set duration value
        if (config.designedIn === 'distance' && config.originalValue) {
            const kmField = document.getElementById(`${prefix}KilometersInput`);
            if (kmField) {
                kmField.value = config.originalValue;
            }
        } else if (config.duracion) {
            const durationField = document.getElementById(`${prefix}DurationInput`);
            if (durationField) {
                durationField.value = formatDuration(config.duracion);
            }
        }
        
        // Set intensity value - handle via sliders after visibility update
        setTimeout(() => {
            if (config.isRPE) {
                const rpeSlider = document.getElementById(`${prefix}RpeInput`);
                if (rpeSlider) {
                    rpeSlider.value = config.indice || config.originalValue || (prefix === 'work' ? 7 : 2);
                    // Update display
                    const valueDisplay = document.getElementById(`${prefix}RpeValue`);
                    if (valueDisplay) {
                        valueDisplay.textContent = rpeSlider.value;
                    }
                }
            } else {
                // Set zone values if available
                const sliderInstance = prefix === 'work' ? workZoneSliderInstance : restZoneSliderInstance;
                if (sliderInstance && config.indice) {
                    sliderInstance.set([config.indice, config.indice]);
                }
            }
        }, 100);
    }
    
    // Update visibility after setting values
    updateSliderVisibility();
    if (phaseType === 'work') {
        updateWorkSliderVisibility();
        updateWorkDurationInputVisibility();
    } else if (phaseType === 'rest') {
        updateRestSliderVisibility();
        updateRestDurationInputVisibility();
    } else {
        updateDurationInputVisibility();
    }
}

function editGroup(groupId) {
    alert(`Edit function for group ${groupId} - To be implemented`);
}

/**
 * Initializes the Sortable functionality (wrapper for initializeSortableJS for compatibility).
 */
function initializeSortable() {
    initializeSortableJS();
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM Content Loaded - Initializing enhanced application...");
    
    try {
        // Initialize sliders and UI with enhanced error handling
        updateSliderVisibility();
        
        // Initialize all zone sliders if needed
        setTimeout(() => {
            initZoneRangeSlider();
            initWorkZoneSlider(); 
            initRestZoneSlider();
        }, 100);
        
        // Initialize enhanced drag-and-drop
    initializeSortable();
    
    // Initialize modal event listeners
    initializeModalEventListeners();
        
        // Initialize form event listeners
        initializeFormEventListeners();
        
        // Add enhanced keyboard shortcuts
        initializeKeyboardShortcuts();
        
        // Initialize compact mode controls
        setTimeout(() => {
            initializeCompactMode();
        }, 100);
        
        // Initial render with enhanced features
        render();
        
        // Show welcome notification
        setTimeout(() => {
            showNotification('🎯 Training Planner cargado con mejoras avanzadas!', 'success');
        }, 200);
        
        console.log("✅ Enhanced application initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing application:", error);
        showNotification('Error al inicializar la aplicación', 'error');
    }
});

/**
 * Initializes keyboard shortcuts for enhanced UX
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New training part
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showAddTrainingModal();
        }
        
        // Ctrl/Cmd + J: Show JSON modal
        if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
            e.preventDefault();
            showJsonModal();
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            hideAllModals();
        }
        
        // Ctrl/Cmd + A: Select all parts (when not in input)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            selectAllParts();
        }
        
        // Delete: Delete selected parts
        if (e.key === 'Delete' && selectedParts.size > 0 && !e.target.matches('input, textarea')) {
            e.preventDefault();
            deleteSelectedParts();
        }
    });
}

/**
 * Selects all training parts and groups
 */
function selectAllParts() {
    // Clear current selection
    selectedParts.clear();
    
    // Add all individual parts
    partesEntreno.forEach(part => {
        if (part && part.id) {
            selectedParts.add(part.id);
        }
    });
    
    // Add all groups
    groups.forEach(group => {
        if (group && group.id) {
            selectedParts.add(group.id);
        }
    });
    
    // Update UI
    updateSelectionToolbar();
    render(); // Re-render to show selection states
    
    showNotification(`${selectedParts.size} elementos seleccionados`, 'info');
}

/**
 * Deletes all currently selected parts and groups
 */
function deleteSelectedParts() {
    if (selectedParts.size === 0) return;
    
    const count = selectedParts.size;
    const confirmMessage = `¿Estás seguro de que quieres eliminar ${count} elemento${count > 1 ? 's' : ''}?`;
    
    if (confirm(confirmMessage)) {
        // Remove selected parts from partesEntreno
        partesEntreno = partesEntreno.filter(part => !selectedParts.has(part.id));
        
        // Remove selected groups and their parts
        groups = groups.filter(group => {
            if (selectedParts.has(group.id)) {
                return false; // Remove the entire group
    } else {
                // Remove selected parts from the group
                group.parts = group.parts.filter(part => !selectedParts.has(part.id));
                return true; // Keep the group
            }
        });
        
        // Clear selection
        selectedParts.clear();
        updateSelectionToolbar();
        
        // Re-render
        render();
        
        showNotification(`${count} elemento${count > 1 ? 's' : ''} eliminado${count > 1 ? 's' : ''}`, 'success');
    }
}

/**
 * Initializes all modal-related event listeners.
 */
function initializeModalEventListeners() {
    // JSON Modal functionality
    const showJsonButton = document.getElementById('showJsonButton');
    const jsonModal = document.getElementById('jsonModal');
    const closeJsonModalButton = document.querySelector('.close-json-modal');
    const copyJsonButton = document.getElementById('copyJsonButton');
    const downloadJsonButton = document.getElementById('downloadJsonButton');
    const loadJsonButton = document.getElementById('loadJsonButton');
    const clearImportButton = document.getElementById('clearImportButton');
    const loadDefaultTrainingButton = document.getElementById('loadDefaultTrainingButton');

    if (showJsonButton && jsonModal) {
        showJsonButton.addEventListener('click', () => {
            showJsonModal();
        });
    }

    if (closeJsonModalButton && jsonModal) {
        closeJsonModalButton.addEventListener('click', () => {
            hideJsonModal();
        });
    }

    if (copyJsonButton) {
        copyJsonButton.addEventListener('click', () => {
            copyJsonToClipboard();
        });
    }

    if (downloadJsonButton) {
        downloadJsonButton.addEventListener('click', () => {
            downloadJsonFile();
        });
    }

    if (loadJsonButton) {
        loadJsonButton.addEventListener('click', () => {
            loadJsonFromInput();
        });
    }

    if (clearImportButton) {
        clearImportButton.addEventListener('click', () => {
            clearJsonImportInput();
        });
    }

    if (loadDefaultTrainingButton) {
        loadDefaultTrainingButton.addEventListener('click', () => {
            loadDefaultTraining();
        });
    }

    // Add Training Modal functionality
    const openAddTrainingModalButton = document.getElementById('openAddTrainingModal');
    const addTrainingModal = document.getElementById('addTrainingModal');
    const closeAddTrainingModalButton = document.getElementById('closeAddTrainingModal');

    if (openAddTrainingModalButton && addTrainingModal) {
        openAddTrainingModalButton.addEventListener('click', () => {
            showAddTrainingModal();
        });
    }

    if (closeAddTrainingModalButton && addTrainingModal) {
        closeAddTrainingModalButton.addEventListener('click', () => {
            hideAddTrainingModal();
        });
    }

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && !e.target.classList.contains('hidden')) {
            hideAllModals();
        }
    });
}

/**
 * Initializes all form-related event listeners.
 */
function initializeFormEventListeners() {
    // Main form submission
    const form = document.getElementById('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmission();
        });
    }

    // Toggle switches
    const intensityTypeToggle = document.getElementById('intensityType');
    const durationTypeToggle = document.getElementById('durationType');
    const partTypeToggle = document.getElementById('partType');

    if (intensityTypeToggle) {
        intensityTypeToggle.addEventListener('change', () => {
            updateSliderVisibility();
            updatePreviewKms(); // Add preview update
        });
    }

    if (durationTypeToggle) {
        durationTypeToggle.addEventListener('change', () => {
            updateDurationInputVisibility();
            updatePreviewKms(); // Add preview update
        });
    }

    if (partTypeToggle) {
        partTypeToggle.addEventListener('change', updatePartTypeVisibility);
    }

    // RPE slider
    const rpeSlider = document.getElementById('indiceSliderRPE');
    const rpeValue = document.getElementById('sliderValueRPE');
    
    if (rpeSlider && rpeValue) {
        rpeSlider.addEventListener('input', () => {
            rpeValue.textContent = rpeSlider.value;
            updatePreviewKms();
        });
    }

    // Duration input for time mode
    const duracionInput = document.querySelector('[name="duracion"]');
    if (duracionInput) {
        duracionInput.addEventListener('input', updatePreviewKms);
    }

    // Kilometers input for distance mode
    const kmInput = document.getElementById('kilometrosInput');
    if (kmInput) {
        kmInput.addEventListener('input', updatePreviewKms);
    }

    // Name input
    const nameInput = document.querySelector('[name="nombre"]');
    if (nameInput) {
        nameInput.addEventListener('input', updatePreviewKms);
    }

    // Work phase RPE slider
    const workRpeSlider = document.getElementById('workRpeInput');
    const workRpeValue = document.getElementById('workRpeValue');
    
    if (workRpeSlider && workRpeValue) {
        workRpeSlider.addEventListener('input', () => {
            workRpeValue.textContent = workRpeSlider.value;
            updateSeriesPreview();
        });
    }

    // Rest phase RPE slider
    const restRpeSlider = document.getElementById('restRpeInput');
    const restRpeValue = document.getElementById('restRpeValue');
    
    if (restRpeSlider && restRpeValue) {
        restRpeSlider.addEventListener('input', () => {
            restRpeValue.textContent = restRpeSlider.value;
            updateSeriesPreview();
        });
    }

    // Work and rest intensity type toggles
    const workIntensityToggle = document.getElementById('workIntensityType');
    const restIntensityToggle = document.getElementById('restIntensityType');
    
    if (workIntensityToggle) {
        workIntensityToggle.addEventListener('change', updateWorkSliderVisibility);
    }
    
    if (restIntensityToggle) {
        restIntensityToggle.addEventListener('change', updateRestSliderVisibility);
    }

    // Work and rest duration type toggles
    const workDurationToggle = document.getElementById('workDurationType');
    const restDurationToggle = document.getElementById('restDurationType');
    
    if (workDurationToggle) {
        workDurationToggle.addEventListener('change', updateWorkDurationInputVisibility);
    }
    
    if (restDurationToggle) {
        restDurationToggle.addEventListener('change', updateRestDurationInputVisibility);
    }

    // Work duration inputs
    const workDurationInput = document.getElementById('workDurationInput');
    const workKilometersInput = document.getElementById('workKilometersInput');
    
    if (workDurationInput) {
        workDurationInput.addEventListener('input', updateSeriesPreview);
    }
    
    if (workKilometersInput) {
        workKilometersInput.addEventListener('input', updateSeriesPreview);
    }

    // Rest duration inputs
    const restDurationInput = document.getElementById('restDurationInput');
    const restKilometersInput = document.getElementById('restKilometersInput');
    
    if (restDurationInput) {
        restDurationInput.addEventListener('input', updateSeriesPreview);
    }
    
    if (restKilometersInput) {
        restKilometersInput.addEventListener('input', updateSeriesPreview);
    }

    // Repetitions input
    const repetitionsInput = document.getElementById('repetitionsInput');
    if (repetitionsInput) {
        repetitionsInput.addEventListener('input', updateSeriesPreview);
    }

    // Threshold pace
    const applyUmbralButton = document.getElementById('applyUmbral');
    if (applyUmbralButton) {
        applyUmbralButton.addEventListener('click', () => {
            console.log("🎯 Applying new threshold pace...");
            
            // Update preview for current form
            updatePreviewKms();
            updateSeriesPreview();
            
            // Force re-render to recalculate all paces including those in groups
            console.log("🔄 Re-rendering to update all pace calculations...");
            render();
            
            // Show confirmation (removed redundant updateSummaryBar call)
            const newPace = ritmoUmbralInput.value || "5:00";
            showNotification(`Ritmo umbral actualizado a ${newPace} min/km`, 'success');
            
            console.log("✅ Threshold pace update complete");
        });
    }
}

/**
 * Shows the JSON modal with current training data.
 */
function showJsonModal() {
    const jsonModal = document.getElementById('jsonModal');
    const jsonOutput = document.getElementById('jsonDataOutput');
    
    if (jsonModal && jsonOutput) {
        const data = {
            partesEntreno: partesEntreno,
            groups: groups,
            exportedAt: new Date().toISOString()
        };
        
        jsonOutput.textContent = JSON.stringify(data, null, 2);
        jsonModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

/**
 * Hides the JSON modal.
 */
function hideJsonModal() {
    const jsonModal = document.getElementById('jsonModal');
    if (jsonModal) {
        jsonModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}

/**
 * Shows the add training modal.
 */
function showAddTrainingModal() {
    const addTrainingModal = document.getElementById('addTrainingModal');
    if (addTrainingModal) {
        // Reset editing state if opening for new part creation
        if (!addTrainingModal.getAttribute('data-editing')) {
            editingPartId = null;
            const modalTitle = addTrainingModal.querySelector('.modal-title');
            const submitBtn = addTrainingModal.querySelector('.submit-btn');
            if (modalTitle) modalTitle.textContent = 'Añadir Parte de Entrenamiento';
            if (submitBtn) submitBtn.textContent = 'Añadir Parte';
        }
        
        addTrainingModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        
        // Ensure correct sliders are shown
        updateSliderVisibility();
        updateDurationInputVisibility();
        updatePartTypeVisibility();
        
        // Initialize preview with current values
        setTimeout(() => {
            updatePreviewKms();
            updateSeriesPreview();
        }, 100); // Small delay to ensure DOM is ready
    }
}

/**
 * Hides the add training modal.
 */
function hideAddTrainingModal() {
    const addTrainingModal = document.getElementById('addTrainingModal');
    if (addTrainingModal) {
        addTrainingModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        resetForm(); // Reset form when closing
    }
}

/**
 * Hides all modals.
 */
function hideAllModals() {
    hideJsonModal();
    hideAddTrainingModal();
}

/**
 * Copies JSON data to clipboard.
 */
function copyJsonToClipboard() {
    const jsonOutput = document.getElementById('jsonDataOutput');
    if (jsonOutput) {
        navigator.clipboard.writeText(jsonOutput.textContent).then(() => {
            showNotification('JSON copiado al portapapeles', 'success');
        }).catch(() => {
            showNotification('Error al copiar JSON', 'error');
        });
    }
}

/**
 * Downloads JSON data as a file.
 */
function downloadJsonFile() {
    const jsonOutput = document.getElementById('jsonDataOutput');
    if (jsonOutput) {
        const data = jsonOutput.textContent;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `entrenamiento_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Archivo JSON descargado', 'success');
    }
}

/**
 * Loads JSON data from the import input.
 */
function loadJsonFromInput() {
    const importInput = document.getElementById('jsonImportInput');
    if (!importInput) {
        showNotification('Campo de importación no encontrado', 'error');
        return;
    }
    
    const inputValue = importInput.value.trim();
    if (!inputValue) {
        showNotification('Por favor, pega el JSON en el campo de texto', 'warning');
        return;
    }
    
    try {
        const data = JSON.parse(inputValue);
        
        // Validate data structure
        if (!data.partesEntreno && !data.groups && !data.entrenamientos) {
            showNotification('El JSON no tiene el formato esperado. Debe contener "partesEntreno", "groups" o "entrenamientos"', 'error');
            return;
        }
        
        // Check if it's an example training file
        if (data.entrenamientos) {
            // Show available trainings for selection
            showTrainingSelector(data.entrenamientos);
            return;
        }
        
        // Clear current data
                partesEntreno.length = 0;
        groups.length = 0;
        
        // Load new data
        if (data.partesEntreno && Array.isArray(data.partesEntreno)) {
                partesEntreno.push(...data.partesEntreno);
            }
            
        if (data.groups && Array.isArray(data.groups)) {
                groups.push(...data.groups);
            }
            
        // Re-render and show success
            render();
        
        const totalParts = partesEntreno.length + groups.reduce((acc, g) => acc + (g.parts ? g.parts.length : 0), 0);
        showNotification(`Entrenamiento cargado: ${totalParts} partes en ${groups.length} grupos`, 'success');
        
        // Clear input and close modal
        importInput.value = '';
            hideJsonModal();
        
        } catch (error) {
        console.error('JSON parse error:', error);
            showNotification('Error al cargar JSON: ' + error.message, 'error');
        }
}

/**
 * Shows a training selector for example trainings.
 */
function showTrainingSelector(entrenamientos) {
    const trainingNames = Object.keys(entrenamientos);
    
    if (trainingNames.length === 0) {
        showNotification('No se encontraron entrenamientos en el archivo', 'warning');
        return;
    }
    
    // Create a simple selection dialog
    let message = 'Entrenamientos disponibles:\n\n';
    trainingNames.forEach((key, index) => {
        const training = entrenamientos[key];
        message += `${index + 1}. ${training.nombre}\n   ${training.descripcion}\n\n`;
    });
    message += 'Introduce el número del entrenamiento que quieres cargar:';
    
    const selection = prompt(message);
    const selectedIndex = parseInt(selection) - 1;
    
    if (selectedIndex >= 0 && selectedIndex < trainingNames.length) {
        const selectedKey = trainingNames[selectedIndex];
        const selectedTraining = entrenamientos[selectedKey];
        
        // Load the selected training
        partesEntreno.length = 0;
        groups.length = 0;
        
        if (selectedTraining.partesEntreno) {
            partesEntreno.push(...selectedTraining.partesEntreno);
        }
        
        if (selectedTraining.groups) {
            groups.push(...selectedTraining.groups);
        }
        
        render();
        // Removed redundant updateSummaryBar() call since render() already calls it
        
        showNotification(`Entrenamiento "${selectedTraining.nombre}" cargado correctamente`, 'success');
        
        // Clear input and close modal
        const importInput = document.getElementById('jsonImportInput');
        if (importInput) importInput.value = '';
        hideJsonModal();
    } else {
        showNotification('Selección inválida', 'warning');
    }
}

/**
 * Clears the JSON import input.
 */
function clearJsonImportInput() {
    const importInput = document.getElementById('jsonImportInput');
    if (importInput) {
        importInput.value = '';
    }
}

/**
 * Shows a notification message.
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * Updates duration input visibility based on duration type toggle.
 */
function updateDurationInputVisibility() {
    const timeInputContainer = document.getElementById('timeInput');
    const kmInputContainer = document.getElementById('kmInput');
    const durationTypeToggle = document.getElementById('durationType');
    
    if (!timeInputContainer || !kmInputContainer || !durationTypeToggle) return;
    
    if (durationTypeToggle.checked) {
        // Kilometers mode
        timeInputContainer.style.display = 'none';
        kmInputContainer.style.display = 'block';
    } else {
        // Time mode
        timeInputContainer.style.display = 'block';
        kmInputContainer.style.display = 'none';
    }
}

/**
 * Updates part type visibility (normal vs series).
 */
function updatePartTypeVisibility() {
    const normalConfig = document.getElementById('normalConfig');
    const seriesConfig = document.getElementById('seriesConfig');
    const partTypeToggle = document.getElementById('partType');
    
    if (!normalConfig || !seriesConfig || !partTypeToggle) return;
    
    if (partTypeToggle.checked) {
        // Series mode
        normalConfig.style.display = 'none';
        seriesConfig.style.display = 'block';
        updateWorkSliderVisibility();
        updateRestSliderVisibility();
        updateSeriesPreview();
    } else {
        // Normal mode
        normalConfig.style.display = 'block';
        seriesConfig.style.display = 'none';
    }
}

/**
 * Handles form submission for adding new training parts or editing existing ones.
 */
function handleFormSubmission() {
    const form = document.getElementById('form');
    const nombreInput = form.querySelector('[name="nombre"]');
    const modal = document.getElementById('addTrainingModal');
    
    if (!nombreInput || !nombreInput.value.trim()) {
        showNotification('Por favor, introduce un nombre para la parte', 'error');
        return;
    }

    const nombre = nombreInput.value.trim();
    const partTypeToggle = document.getElementById('partType');
    const isEditing = modal.getAttribute('data-editing') === 'true';
    
    if (isEditing) {
        // Update existing part
        updateExistingPart(nombre, partTypeToggle && partTypeToggle.checked);
    } else {
        // Create new part
        if (partTypeToggle && partTypeToggle.checked) {
            // Create series
            createSeriesFromForm(nombre);
        } else {
            // Create normal part
            createNormalPart(nombre);
        }
    }
}

/**
 * Updates an existing training part with new values from the form
 */
function updateExistingPart(nombre, isSeries) {
    if (!editingPartId) {
        showNotification('Error: No se encontró la parte a editar', 'error');
        return;
    }
    
    // Find the part to update
    let partToUpdate = null;
    let isInGroup = false;
    let groupContainer = null;
    
    // Check in individual parts
    partToUpdate = partesEntreno.find(p => p.id === editingPartId);
    
    // Check in groups if not found
    if (!partToUpdate) {
        for (let group of groups) {
            const foundPart = group.parts.find(p => p.id === editingPartId);
            if (foundPart) {
                partToUpdate = foundPart;
                isInGroup = true;
                groupContainer = group;
                break;
            }
        }
    }
    
    if (!partToUpdate) {
        showNotification('Error: Parte no encontrada', 'error');
        return;
    }
    
    // Update the part based on type
    if (isSeries) {
        updateSeriesFromForm(partToUpdate, nombre);
    } else {
        updateNormalPartFromForm(partToUpdate, nombre);
    }
    
    // Clear editing state
    editingPartId = null;
    const modal = document.getElementById('addTrainingModal');
    modal.removeAttribute('data-editing');
    
    // Reset modal title and button
    const modalTitle = modal.querySelector('.modal-title');
    const submitBtn = modal.querySelector('.submit-btn');
    modalTitle.textContent = 'Añadir Parte de Entrenamiento';
    submitBtn.textContent = 'Añadir Parte';
    
    // Update UI
    render();
    
    // Reset and close
    resetForm();
    hideAddTrainingModal();
    
    showNotification(`Parte "${nombre}" actualizada correctamente`, 'success');
}

/**
 * Updates a series part with form data
 */
function updateSeriesFromForm(partToUpdate, nombre) {
    // Get configurations
    const workConfig = getWorkPhaseConfig();
    const restConfig = getRestPhaseConfig();
    
    if (!workConfig || !restConfig) {
        showNotification('Error en la configuración de las fases', 'error');
        return;
    }
    
    // Get repetitions
    const repetitionsInput = document.getElementById('repetitionsInput');
    const repetitions = repetitionsInput ? parseInt(repetitionsInput.value) || 1 : 1;
    
    // Update the part
    partToUpdate.nombre = nombre;
    partToUpdate.workConfig = workConfig;
    partToUpdate.restConfig = restConfig;
    partToUpdate.repetitions = repetitions;
    partToUpdate.type = 'series';
    
    // Recalculate derived properties
    partToUpdate.approxKms = calculateApproxKms(partToUpdate);
    partToUpdate.totalDuration = getSeriesTotalDuration(partToUpdate);
}

/**
 * Updates a normal part with form data
 */
function updateNormalPartFromForm(partToUpdate, nombre) {
    // Get form values
    const thresholdSelect = document.getElementById('threshold');
    const valueInput = document.getElementById('value');
    const duracionInput = document.getElementById('duracion');
    const designedInSelect = document.getElementById('designedIn');
    
    if (!thresholdSelect || !valueInput || !duracionInput || !designedInSelect) {
        showNotification('Error: Campos del formulario no encontrados', 'error');
        return;
    }
    
    const isRPE = thresholdSelect.value === 'rpe';
    const indice = parseFloat(valueInput.value) || 0;
    const originalValue = isRPE ? indice : parseFloat(valueInput.value);
    const designedIn = designedInSelect.value;
    
    let duracion;
    if (designedIn === 'distance') {
        // Calculate duration from distance
        const km = parseFloat(duracionInput.value) || 0;
        const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
        let paceSeconds;
        
        if (isRPE) {
            const zoneValue = RPE_ZONE_MAX - (indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
            paceSeconds = umbralPaceSeconds * (zoneValue / 100);
        } else {
            paceSeconds = umbralPaceSeconds * (indice / 100);
        }
        
        duracion = Math.round(km * paceSeconds);
    } else {
        duracion = parseDuration(duracionInput.value);
    }
    
    // Update the part
    partToUpdate.nombre = nombre;
    partToUpdate.indice = indice;
    partToUpdate.duracion = duracion;
    partToUpdate.isRPE = isRPE;
    partToUpdate.originalValue = originalValue;
    partToUpdate.designedIn = designedIn;
    partToUpdate.type = 'single';
    
    // Recalculate derived properties
    partToUpdate.approxKms = calculateApproxKms(partToUpdate);
}

/**
 * Creates a series from the form data.
 */
function createSeriesFromForm(nombre) {
    // Get work phase configuration
    const workConfig = getWorkPhaseConfig();
    if (!workConfig) {
        showNotification('Error en la configuración de la fase de trabajo', 'error');
        return;
    }
    
    // Get rest phase configuration  
    const restConfig = getRestPhaseConfig();
    if (!restConfig) {
        showNotification('Error en la configuración de la fase de descanso', 'error');
        return;
    }
    
    // Get repetitions
    const repetitionsInput = document.getElementById('repetitionsInput');
    const repetitions = repetitionsInput ? parseInt(repetitionsInput.value) || 1 : 1;
    
    if (repetitions < 1 || repetitions > 50) {
        showNotification('Las repeticiones deben estar entre 1 y 50', 'error');
        return;
    }
    
    // Validate that both phases have valid durations
    if (workConfig.duracion <= 0) {
        showNotification('La duración de trabajo debe ser mayor que 0', 'error');
        return;
    }
    
    if (restConfig.duracion <= 0) {
        showNotification('La duración de descanso debe ser mayor que 0', 'error');
        return;
    }
    
    console.log('Creating series with config:', {
        nombre, workConfig, restConfig, repetitions
    });
    
    // Create the series
    createSeries(nombre, workConfig, restConfig, repetitions);
    
    // Update UI
    render();
    // Removed redundant updateSummaryBar() call since render() already calls it
    
    // Reset and close
    resetForm();
    hideAddTrainingModal();
    
    showNotification(`Serie "${nombre}" con ${repetitions} repeticiones añadida correctamente`, 'success');
}

/**
 * Gets the work phase configuration from the form.
 */
function getWorkPhaseConfig() {
    const workIntensityToggle = document.getElementById('workIntensityType');
    const workDurationToggle = document.getElementById('workDurationType');
    
    if (!workIntensityToggle || !workDurationToggle) {
        console.error('Work phase form elements not found');
        return null;
    }

    // Get intensity
    let indice, isRPE;
    if (workIntensityToggle.checked) {
        // RPE mode
        const workRpeSlider = document.getElementById('workRpeInput');
        indice = workRpeSlider ? parseInt(workRpeSlider.value) : 7;
        isRPE = true;
    } else {
        // Zone mode
        let values = [95, 105]; // Default work zone values
        if (workZoneSliderInstance) {
            values = workZoneSliderInstance.get().map(parseFloat);
        }
        indice = (values[0] + values[1]) / 2; // Average zone
        isRPE = false;
    }
    
    // Get duration
    let duracion, originalValue, designedIn;
    if (workDurationToggle.checked) {
        // Kilometers mode
        const kmInput = document.getElementById('workKilometersInput');
        const km = kmInput ? parseFloat(kmInput.value) || 0 : 0;
        if (km <= 0) {
            console.warn('Invalid work phase kilometers:', km);
            return null;
        }
        
        // Calculate duration from kilometers
        const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
        let paceSeconds;
        if (isRPE) {
            const zoneValue = RPE_ZONE_MAX - (indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
            paceSeconds = umbralPaceSeconds * (zoneValue / 100);
        } else {
            paceSeconds = umbralPaceSeconds * (indice / 100);
        }
        duracion = Math.round(km * paceSeconds);
        originalValue = km;
        designedIn = 'distance';
    } else {
        // Time mode
        const timeInput = document.getElementById('workDurationInput');
        const timeStr = timeInput ? timeInput.value.trim() : '';
        if (!timeStr) {
            console.warn('Work phase time not provided');
            return null;
        }
        duracion = parseDuration(timeStr);
        originalValue = duracion;
        designedIn = 'time';
    }
    
    if (duracion <= 0) {
        console.warn('Invalid work phase duration:', duracion);
        return null;
    }
    
    return {
        indice,
        duracion,
        isRPE,
        originalValue,
        designedIn
    };
}

/**
 * Gets the rest phase configuration from the form.
 */
function getRestPhaseConfig() {
    const restIntensityToggle = document.getElementById('restIntensityType');
    const restDurationToggle = document.getElementById('restDurationType');
    
    if (!restIntensityToggle || !restDurationToggle) {
        console.error('Rest phase form elements not found');
        return null;
    }
    
    // Get intensity
    let indice, isRPE;
    if (restIntensityToggle.checked) {
        // RPE mode
        const restRpeSlider = document.getElementById('restRpeInput');
        indice = restRpeSlider ? parseInt(restRpeSlider.value) : 2;
        isRPE = true;
    } else {
        // Zone mode
        let values = [130, 130]; // Default rest zone values
        if (restZoneSliderInstance) {
            values = restZoneSliderInstance.get().map(parseFloat);
        }
        indice = (values[0] + values[1]) / 2; // Average zone
        isRPE = false;
    }

    // Get duration
    let duracion, originalValue, designedIn;
    if (restDurationToggle.checked) {
        // Kilometers mode
        const kmInput = document.getElementById('restKilometersInput');
        const km = kmInput ? parseFloat(kmInput.value) || 0 : 0;
        if (km <= 0) {
            console.warn('Invalid rest phase kilometers:', km);
            return null;
        }
        
        // Calculate duration from kilometers
        const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
        let paceSeconds;
        if (isRPE) {
            const zoneValue = RPE_ZONE_MAX - (indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
            paceSeconds = umbralPaceSeconds * (zoneValue / 100);
        } else {
            paceSeconds = umbralPaceSeconds * (indice / 100);
        }
        duracion = Math.round(km * paceSeconds);
        originalValue = km;
        designedIn = 'distance';
    } else {
        // Time mode
        const timeInput = document.getElementById('restDurationInput');
        const timeStr = timeInput ? timeInput.value.trim() : '';
        if (!timeStr) {
            console.warn('Rest phase time not provided');
            return null;
        }
        duracion = parseDuration(timeStr);
        originalValue = duracion;
        designedIn = 'time';
    }
    
    if (duracion <= 0) {
        console.warn('Invalid rest phase duration:', duracion);
        return null;
    }

    return {
        indice,
        duracion,
        isRPE,
        originalValue,
        designedIn
    };
}

/**
 * Creates a normal training part from form data.
 */
function createNormalPart(nombre) {
    const form = document.getElementById('form');
    const intensityTypeToggle = document.getElementById('intensityType');
    const durationTypeToggle = document.getElementById('durationType');
    
    // Get intensity
    let indice, isRPE;
    if (intensityTypeToggle && intensityTypeToggle.checked) {
        // RPE mode
        const rpeSlider = document.getElementById('indiceSliderRPE');
        indice = rpeSlider ? parseFloat(rpeSlider.value) : 5;
        isRPE = true;
    } else {
        // Zone mode
        let values = [100, 100];
    if (zoneSliderInstance) {
            values = zoneSliderInstance.get().map(parseFloat);
        }
        indice = (values[0] + values[1]) / 2; // Average zone
        isRPE = false;
    }
    
    // Get duration
    let duracion, originalValue, designedIn;
    if (durationTypeToggle && durationTypeToggle.checked) {
        // Kilometers mode
        const kmInput = document.getElementById('kilometrosInput');
        const km = kmInput ? parseFloat(kmInput.value) : 0;
        if (km <= 0) {
            showNotification('Por favor, introduce una distancia válida', 'error');
            return;
        }
        duracion = getCurrentDuration();
        originalValue = km;
        designedIn = 'distance';
    } else {
        // Time mode
        const durationInput = form.querySelector('[name="duracion"]');
        if (!durationInput || !durationInput.value.trim()) {
            showNotification('Por favor, introduce una duración válida', 'error');
            return;
        }
        duracion = parseDuration(durationInput.value.trim());
        originalValue = duracion;
        designedIn = 'time';
    }
    
    if (duracion <= 0) {
        showNotification('La duración debe ser mayor que 0', 'error');
        return;
    }
    
    // Create the part
    createParte(nombre, indice, duracion, isRPE, originalValue, designedIn);
    
    // Update UI
    render();
    // Removed redundant updateSummaryBar() call since render() already calls it
    
    // Reset and close
    resetForm();
    hideAddTrainingModal();
    
    showNotification(`Parte "${nombre}" añadida correctamente`, 'success');
}

/**
 * Resets the form to default values.
 */
function resetForm() {
    const form = document.getElementById('form');
    if (form) {
        form.reset();
        
        // Reset toggles to default
        const intensityTypeToggle = document.getElementById('intensityType');
        const durationTypeToggle = document.getElementById('durationType');
        const partTypeToggle = document.getElementById('partType');
        
        if (intensityTypeToggle) intensityTypeToggle.checked = false;
        if (durationTypeToggle) durationTypeToggle.checked = false;
        if (partTypeToggle) partTypeToggle.checked = false;
        
        // Reset editing state
        editingPartId = null;
        const modal = document.getElementById('addTrainingModal');
        if (modal) {
            modal.removeAttribute('data-editing');
            const modalTitle = modal.querySelector('.modal-title');
            const submitBtn = modal.querySelector('.submit-btn');
            if (modalTitle) modalTitle.textContent = 'Añadir Parte de Entrenamiento';
            if (submitBtn) submitBtn.textContent = 'Añadir Parte';
        }
        
        // Update visibility
        updateSliderVisibility();
        updateDurationInputVisibility();
        updatePartTypeVisibility();
    }
}

/**
 * Updates work phase slider visibility based on intensity type.
 */
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
    }
    updateSeriesPreview();
}

/**
 * Updates rest phase slider visibility based on intensity type.
 */
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
    }
    updateSeriesPreview();
}

/**
 * Updates work duration input visibility.
 */
function updateWorkDurationInputVisibility() {
    const workTimeInput = document.getElementById('workTimeInput');
    const workKmInput = document.getElementById('workKmInput');
    const workDurationToggle = document.getElementById('workDurationType');
    
    if (!workTimeInput || !workKmInput || !workDurationToggle) return;
    
    if (workDurationToggle.checked) {
        // Kilometers mode
        workTimeInput.style.display = 'none';
        workKmInput.style.display = 'block';
    } else {
        // Time mode
        workTimeInput.style.display = 'block';
        workKmInput.style.display = 'none';
    }
    updateSeriesPreview();
}

/**
 * Updates rest duration input visibility.
 */
function updateRestDurationInputVisibility() {
    const restTimeInput = document.getElementById('restTimeInput');
    const restKmInput = document.getElementById('restKmInput');
    const restDurationToggle = document.getElementById('restDurationType');
    
    if (!restTimeInput || !restKmInput || !restDurationToggle) return;
    
    if (restDurationToggle.checked) {
        // Kilometers mode
        restTimeInput.style.display = 'none';
        restKmInput.style.display = 'block';
    } else {
        // Time mode
        restTimeInput.style.display = 'block';
        restKmInput.style.display = 'none';
    }
    updateSeriesPreview();
}

/**
 * Updates the series preview with current configuration.
 */
function updateSeriesPreview() {
    const seriesPreview = document.getElementById('seriesPreview');
    if (!seriesPreview) return;
    
    // Get repetitions
    const repetitionsInput = document.getElementById('repetitionsInput');
    const repetitions = repetitionsInput ? parseInt(repetitionsInput.value) || 1 : 1;
    
    // Get work and rest configuration
    const workConfig = getWorkPhaseConfig();
    const restConfig = getRestPhaseConfig();
    
    if (!workConfig || !restConfig) {
        seriesPreview.innerHTML = '<p style="color: #ffc107;">⚠️ Por favor, completa la configuración de trabajo y descanso</p>';
        return;
    }
    
    // Calculate totals
    const totalWorkDuration = workConfig.duracion * repetitions;
    const totalRestDuration = restConfig.duracion * repetitions;
    const totalDuration = totalWorkDuration + totalRestDuration;
    
    // Calculate distances
    const workKms = calculateApproxKmsForSinglePhase(workConfig);
    const restKms = calculateApproxKmsForSinglePhase(restConfig);
    const totalWorkKms = workKms * repetitions;
    const totalRestKms = restKms * repetitions;
    const totalKms = totalWorkKms + totalRestKms;
    
    // Calculate paces
    const umbralPaceSeconds = paceToSeconds(ritmoUmbralInput.value || "5:00");
    
    let workPaceSeconds;
    if (workConfig.isRPE) {
        const zoneValue = RPE_ZONE_MAX - (workConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        workPaceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        workPaceSeconds = umbralPaceSeconds * (workConfig.indice / 100);
    }
    
    let restPaceSeconds;
    if (restConfig.isRPE) {
        const zoneValue = RPE_ZONE_MAX - (restConfig.indice / 10) * (RPE_ZONE_MAX - RPE_ZONE_MIN);
        restPaceSeconds = umbralPaceSeconds * (zoneValue / 100);
    } else {
        restPaceSeconds = umbralPaceSeconds * (restConfig.indice / 100);
    }
    
    const workPace = formatPaceMinKm(workPaceSeconds);
    const restPace = formatPaceMinKm(restPaceSeconds);
    
    seriesPreview.innerHTML = `
        <div class="series-summary">
            <h5>📊 Resumen de la Serie</h5>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Repeticiones:</span>
                    <span class="value">${repetitions}</span>
            </div>
                <div class="summary-item">
                    <span class="label">Duración total trabajo:</span>
                    <span class="value">${formatDuration(totalWorkDuration)}</span>
            </div>
                <div class="summary-item">
                    <span class="label">Duración total descanso:</span>
                    <span class="value">${formatDuration(totalRestDuration)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Duración total serie:</span>
                    <span class="value">${formatDuration(totalDuration)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Distancia trabajo:</span>
                    <span class="value">~${totalWorkKms.toFixed(2)} km</span>
                </div>
                <div class="summary-item">
                    <span class="label">Distancia descanso:</span>
                    <span class="value">~${totalRestKms.toFixed(2)} km</span>
                </div>
                <div class="summary-item">
                    <span class="label">Distancia total:</span>
                    <span class="value">~${totalKms.toFixed(2)} km</span>
                </div>
                <div class="summary-item">
                    <span class="label">Pace trabajo:</span>
                    <span class="value">~${workPace} min/km</span>
                </div>
                <div class="summary-item">
                    <span class="label">Pace descanso:</span>
                    <span class="value">~${restPace} min/km</span>
                </div>
            </div>
            <div class="series-breakdown">
                <h6>🔄 Desglose por repetición:</h6>
                <p><strong>Trabajo:</strong> ${workConfig.isRPE ? 'RPE' : 'Zona'} ${workConfig.indice} • ${formatDuration(workConfig.duracion)} • ~${workKms.toFixed(2)} km</p>
                <p><strong>Descanso:</strong> ${restConfig.isRPE ? 'RPE' : 'Zona'} ${restConfig.indice} • ${formatDuration(restConfig.duracion)} • ~${restKms.toFixed(2)} km</p>
            </div>
        </div>
    `;
}

/**
 * Moves a part out of its current group and makes it a standalone part.
 * @param {string} partId - The ID of the part to move out.
 * @param {string} groupId - The ID of the group to remove the part from.
 */
function movePartOutOfGroup(partId, groupId) {
    const group = findGroupByIdGlobal(groupId, groups);
    if (!group) {
        console.error("Group not found:", groupId);
        return;
    }
    
    const partIndex = group.parts.findIndex(p => p.id === partId);
    if (partIndex === -1) {
        console.error("Part not found in group:", partId);
        return;
    }
    
    if (confirm("¿Estás seguro de que quieres sacar esta parte del grupo?")) {
        // Remove the part from the group
        const [removedPart] = group.parts.splice(partIndex, 1);
        
        // Reset the part's order properties for standalone status
        removedPart.generalOrder = partesEntreno.length + groups.length + 1; // Place at end initially
        removedPart.innerOrder = null;
        
        // Add it to the main parts list
        partesEntreno.push(removedPart);
        
        // Re-render to update the UI
        render();
        
        showNotification(`"${removedPart.nombre}" ha sido sacado del grupo "${group.name}"`, 'success');
    }
}

/**
 * Loads a default training with mixed examples.
 */
function loadDefaultTraining() {
    if (partesEntreno.length > 0 || groups.length > 0) {
        const confirmLoad = confirm('¿Estás seguro de que quieres cargar el entrenamiento por defecto? Esto eliminará el entrenamiento actual.');
        if (!confirmLoad) {
            return;
        }
    }
    
    const defaultTraining = {
        "partesEntreno": [
            {
                "id": "27008eba-cee6-4d8a-87da-e34d30b668e6",
                "nombre": "central",
                "indice": 83.85,
                "duracion": 720,
                "isRPE": false,
                "originalValue": 720,
                "designedIn": "time",
                "generalOrder": 1,
                "innerOrder": null,
                "order": 1
            },
            {
                "id": "f9755058-a631-48f6-913c-4a05723f0381",
                "nombre": "series 250x6",
                "type": "series",
                "workConfig": {
                    "indice": 100,
                    "duracion": 75,
                    "isRPE": false,
                    "originalValue": 0.25,
                    "designedIn": "distance"
                },
                "restConfig": {
                    "indice": 1,
                    "duracion": 30,
                    "isRPE": true,
                    "originalValue": 30,
                    "designedIn": "time"
                },
                "repetitions": 6,
                "generalOrder": 2,
                "innerOrder": null,
                "order": 2
            }
        ],
        "groups": [
            {
                "id": "02492452-6c83-4d75-9b36-82d6706e44fe",
                "name": "cooldown",
                "parts": [
                    {
                        "id": "ee70b9cd-1928-45f1-9439-4feb98de1485",
                        "nombre": "Cooldown a tope",
                        "indice": 10,
                        "duracion": 735,
                        "isRPE": true,
                        "originalValue": 6,
                        "designedIn": "distance",
                        "generalOrder": null,
                        "innerOrder": 1,
                        "order": 3
                    },
                    {
                        "id": "0007f8b2-390f-48b4-9bab-84ec90977538",
                        "nombre": "cooldown relax",
                        "type": "series",
                        "workConfig": {
                            "indice": 128.65,
                            "duracion": 150,
                            "isRPE": false,
                            "originalValue": 150,
                            "designedIn": "time"
                        },
                        "restConfig": {
                            "indice": 144.55,
                            "duracion": 60,
                            "isRPE": false,
                            "originalValue": 60,
                            "designedIn": "time"
                        },
                        "repetitions": 2,
                        "generalOrder": null,
                        "innerOrder": 2,
                        "order": 4
                    }
                ],
                "type": "group",
                "generalOrder": 3,
                "order": 3
            }
        ],
        "exportedAt": "2025-06-04T15:51:28.370Z"
    };
    
    try {
        // Clear current data
        partesEntreno.length = 0;
        groups.length = 0;
        
        // Load new data
        if (defaultTraining.partesEntreno && Array.isArray(defaultTraining.partesEntreno)) {
            partesEntreno.push(...defaultTraining.partesEntreno);
        }
        
        if (defaultTraining.groups && Array.isArray(defaultTraining.groups)) {
            groups.push(...defaultTraining.groups);
        }
        
        // Re-render and update summary
        render();
        
        const totalParts = partesEntreno.length + groups.reduce((acc, g) => acc + (g.parts ? g.parts.length : 0), 0);
        showNotification(`🎯 Entrenamiento por defecto cargado: ${totalParts} partes en ${groups.length} grupos`, 'success');
        
        // Close modal
        hideJsonModal();
        
    } catch (error) {
        console.error('Error loading default training:', error);
        showNotification('Error al cargar el entrenamiento por defecto', 'error');
    }
}
/* ===============================================
   🎯 COMPACT CARDS FUNCTIONALITY
   =============================================== */

// Global compact mode state
let isCompactMode = true;

// Initialize compact mode when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeCompactMode, 500); // Small delay to ensure other scripts have loaded
});

function initializeCompactMode() {
    // Add compact mode controls to the page
    addCompactModeControls();
    
    // Apply compact mode to all existing cards
    if (isCompactMode) {
        applyCompactModeToAllCards();
    }
    
    // Listen for new cards being added
    observeForNewCards();
}

function addCompactModeControls() {
    // Find the compact mode placeholder in the toolbars row
    const placeholder = document.querySelector('.compact-mode-placeholder');
    
    if (!placeholder) return;
    
    // Check if controls already exist
    if (document.querySelector('.compact-mode-controls')) return;
    
    const controlsHTML = `
        <div class="compact-mode-controls">
            <div class="compact-mode-toggle">
                <input type="checkbox" id="compactModeToggle" ${isCompactMode ? 'checked' : ''}>
                <label for="compactModeToggle">🎯 Modo Compacto (facilita drag & drop)</label>
            </div>
            <div class="controls-actions">
                <button type="button" onclick="expandAllCards()" class="btn btn-sm" style="margin-right: 0.5rem;">📖 Expandir Todas</button>
                <button type="button" onclick="collapseAllCards()" class="btn btn-sm">📋 Contraer Todas</button>
            </div>
        </div>
    `;
    
    // Insert the controls into the placeholder
    placeholder.innerHTML = controlsHTML;
    
    // Add event listener for the toggle
    const toggleCheckbox = document.getElementById('compactModeToggle');
    if (toggleCheckbox) {
        toggleCheckbox.addEventListener('change', function(e) {
            isCompactMode = e.target.checked;
            if (isCompactMode) {
                applyCompactModeToAllCards();
            } else {
                removeCompactModeFromAllCards();
            }
        });
    }
}

function applyCompactModeToAllCards() {
    const cards = document.querySelectorAll('.part-card, .group-card');
    cards.forEach(card => {
        makeCardCompact(card);
    });
}

function removeCompactModeFromAllCards() {
    const cards = document.querySelectorAll('.part-card, .group-card');
    cards.forEach(card => {
        card.classList.remove('compact', 'expanded');
        
        // Remove compact layout
        const compactInfo = card.querySelector('.compact-main-info');
        if (compactInfo) {
            compactInfo.remove();
        }
        
        // Remove persistent order badge
        const orderBadge = card.querySelector('.compact-order');
        if (orderBadge) {
            orderBadge.remove();
        }
        
        removeToggleButton(card);
        removeCompactOrder(card);
    });
}

function makeCardCompact(card) {
    if (!card) return;
    
    card.classList.add('compact');
    card.classList.remove('expanded');
    
    // Add toggle button if it doesn't exist
    addToggleButton(card);
    
    // Add compact order display if it doesn't exist
    addCompactOrder(card);
    
    // Mark essential stats
    markEssentialStats(card);
}

function addToggleButton(card) {
    // Toggle button is now handled by createCompactLayout
    // This function is kept for compatibility but does nothing
    return;
}

function removeToggleButton(card) {
    const toggleBtn = card.querySelector('.card-toggle-btn');
    if (toggleBtn) {
        toggleBtn.remove();
    }
}

function toggleCardExpansion(card) {
    const isExpanded = card.classList.contains('expanded');
    const toggleBtn = card.querySelector('.card-toggle-btn');
    const compactInfo = card.querySelector('.compact-main-info');
    
    if (isExpanded) {
        // Switch to compact
        card.classList.remove('expanded');
        card.classList.add('compact');
        
        // Show compact info, hide traditional content
        if (compactInfo) {
            compactInfo.style.display = 'flex';
        }
        
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.setAttribute('title', 'Click para expandir');
            const icon = toggleBtn.querySelector('.toggle-icon');
            if (icon) icon.textContent = '▼';
        }
    } else {
        // Switch to expanded
        card.classList.remove('compact');
        card.classList.add('expanded');
        
        // Hide compact info, show traditional content
        if (compactInfo) {
            compactInfo.style.display = 'none';
        }
        
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'true');
            toggleBtn.setAttribute('title', 'Click para contraer');
            const icon = toggleBtn.querySelector('.toggle-icon');
            if (icon) icon.textContent = '▲';
        }
    }
}

function markEssentialStats(card) {
    // Remove old logic and create new compact layout
    createCompactLayout(card);
}

function createCompactLayout(card) {
    // Check if compact layout already exists
    if (card.querySelector('.compact-main-info')) return;
    
    // Get card data
    const cardId = card.getAttribute('data-part-id') || card.getAttribute('data-group-id');
    const isGroup = card.classList.contains('group-card');
    
    let part = null;
    if (isGroup) {
        part = groups.find(g => g.id === cardId);
    } else {
        part = findPartByIdGlobal(cardId, partesEntreno, groups);
    }
    
    if (!part) return;
    
    // Create compact layout
    const compactInfo = document.createElement('div');
    compactInfo.className = 'compact-main-info';
    
    // Title
    const title = document.createElement('h3');
    title.className = 'compact-title';
    title.textContent = part.nombre || 'Sin nombre';
    compactInfo.appendChild(title);
    
    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'compact-subtitle';
    
    if (isGroup) {
        subtitle.textContent = `Grupo • ${part.parts ? part.parts.length : 0} partes`;
    } else if (part.type === 'series') {
        subtitle.textContent = `Serie • ${part.repetitions || 1} repeticiones`;
    } else {
        subtitle.textContent = part.designedIn === 'distance' ? 'Diseñado por distancia' : 'Diseñado por tiempo';
    }
    compactInfo.appendChild(subtitle);
    
    // Stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'compact-stats';
    
    // Calculate stats based on type
    let totalDuration = 0;
    let totalKms = 0;
    
    if (isGroup) {
        // Calculate totals for group
        if (part.parts && part.parts.length > 0) {
            part.parts.forEach(groupPart => {
                totalDuration += groupPart.totalDuration || groupPart.duracion || 0;
                totalKms += groupPart.approxKms || calculateApproxKms(groupPart);
            });
        }
    } else {
        totalDuration = part.totalDuration || part.duracion || 0;
        totalKms = part.approxKms || calculateApproxKms(part);
    }
    
    // Duration stat
    const durationStat = createCompactStat('Duración', formatDuration(totalDuration));
    statsContainer.appendChild(durationStat);
    
    // Distance stat
    const kmsStat = createCompactStat('Kms', `~${totalKms.toFixed(2)}`);
    statsContainer.appendChild(kmsStat);
    
    // Order stat
    const orderElement = card.querySelector('.part-card-stat.order-display span:last-child, .group-order span');
    const orderValue = orderElement ? orderElement.textContent.trim() : '-';
    const orderStat = createCompactStat('Orden', orderValue);
    statsContainer.appendChild(orderStat);
    
    compactInfo.appendChild(statsContainer);
    
    // Actions container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'compact-actions';
    
    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'card-toggle-btn';
    toggleBtn.innerHTML = '<span class="toggle-icon">▼</span>';
    toggleBtn.setAttribute('aria-label', 'Expandir información');
    toggleBtn.setAttribute('title', 'Click para expandir');
    
    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        toggleCardExpansion(card);
    });
    
    actionsContainer.appendChild(toggleBtn);
    compactInfo.appendChild(actionsContainer);
    
    // Insert the compact layout
    card.insertBefore(compactInfo, card.firstChild);
    
    // Also add persistent order badge
    addPersistentOrderBadge(card, orderValue);
}

function createCompactStat(label, value) {
    const stat = document.createElement('div');
    stat.className = 'compact-stat';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'compact-stat-label';
    labelEl.textContent = label;
    
    const valueEl = document.createElement('div');
    valueEl.className = 'compact-stat-value';
    valueEl.textContent = value;
    
    stat.appendChild(labelEl);
    stat.appendChild(valueEl);
    
    return stat;
}

function addPersistentOrderBadge(card, orderValue) {
    // Check if order badge already exists
    if (card.querySelector('.compact-order')) return;
    
    const orderBadge = document.createElement('div');
    orderBadge.className = 'compact-order';
    orderBadge.textContent = orderValue;
    
    // Add to card
    card.appendChild(orderBadge);
}
    
function observeForNewCards() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    if (node.classList && (node.classList.contains('part-card') || node.classList.contains('group-card'))) {
                        if (isCompactMode) {
                            setTimeout(() => makeCardCompact(node), 100);
                        }
                    }
                    
                    // Check for cards within added nodes
                    const cards = node.querySelectorAll && node.querySelectorAll('.part-card, .group-card');
                    if (cards && isCompactMode) {
                        cards.forEach(card => {
                            setTimeout(() => makeCardCompact(card), 100);
        });
    }
}
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Global functions for the control buttons
window.expandAllCards = function() {
    const cards = document.querySelectorAll('.part-card.compact, .group-card.compact');
    cards.forEach(card => {
        card.classList.remove('compact');
        card.classList.add('expanded');
        const toggleBtn = card.querySelector('.card-toggle-btn');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'true');
            toggleBtn.setAttribute('title', 'Click para contraer');
        }
    });
};

window.collapseAllCards = function() {
    const cards = document.querySelectorAll('.part-card.expanded, .group-card.expanded');
    cards.forEach(card => {
        card.classList.remove('expanded');
        card.classList.add('compact');
        const toggleBtn = card.querySelector('.card-toggle-btn');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.setAttribute('title', 'Click para expandir');
        }
    });
};

function addCompactOrder(card) {
    // Order is now handled by createCompactLayout
    // This function is kept for compatibility but does nothing
    return;
}

function removeCompactOrder(card) {
    const compactOrder = card.querySelector('.compact-order');
    if (compactOrder) {
        compactOrder.remove();
    }
}

// Hook into existing card creation functions
const originalCreatePartCard = window.createPartCard;
if (originalCreatePartCard) {
    window.createPartCard = function(...args) {
        const card = originalCreatePartCard.apply(this, args);
        if (isCompactMode && card) {
            setTimeout(() => makeCardCompact(card), 100);
        }
        return card;
    };
}