// Wait for the page content to load, then adjust some settings based on VR capability
document.addEventListener('DOMContentLoaded', async () => {
    const sceneEl = document.querySelector('a-scene');
    const desktopUi = document.getElementById('desktop-ui');

    // Check if the device supports VR
    const hasVR = await checkVRSupport();

    if (hasVR) {
        // If VR is supported
        console.log("VR is supported on this device.");
        document.getElementById('keyboard').setAttribute('super-keyboard', {
            hand: '#lhand, #rhand',
            imagePath: './lib/super-keyboard/',
            multipleInputs: 'true'
        });
        desktopUi.style.display = 'none';
    } else {
        // If not supported
        console.log("VR is not supported on this device.");
        const warning = document.getElementById('desktop-warning');
        if (warning) {
            warning.style.display = 'flex';
        }
        document.getElementById('keyboard').remove();
        const sceneEl = document.getElementsByTagName('a-scene')[0];
        sceneEl.setAttribute('xr-mode-ui', 'enabled: false;');
        desktopUi.style.display = 'flex';
    }

    document.getElementById('keyboard')?.addEventListener('superkeyboardinput', function (event) {
        console.log("Keyboard Input: ", event.detail.value);
        document.getElementById('prompt').setAttribute('value', event.detail.value)
        document.getElementById('error').setAttribute('value', '');
        document.getElementById('error').setAttribute('visible', 'false');

        // Reactivate the "Generate Image" button
        const imageBox = document.getElementById('image-box');
        imageBox.setAttribute('generate-image', '');
        imageBox.setAttribute('color', '#00AA66'); // Restore original color
        imageBox.classList.add('clickable');
    });
});

/**
 * Checks for VR support on user's device
 * @returns true or false
 */
async function checkVRSupport() {
    // Check if the WebXR API is available in the browser
    if (!navigator.xr) {
        return false;
    }

    // Check if an 'immersive-vr' session is supported
    try {
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
        return isSupported;
    } catch (e) {
        // If the check fails for any reason
        console.error("Error checking VR support:", e);
        return false;
    }
}

/**
 * Update the desktop UI's model scale value
 * @param {*} value - the value to update to.
 */
function setSizeValue(value) {
    document.querySelectorAll('.size-input').forEach(container => {
        const display = container.querySelector('.size-value-display');
        const fieldset = container.closest('fieldset');
        const min = parseFloat(fieldset.dataset.min);
        const max = parseFloat(fieldset.dataset.max);

        const clampedValue = Math.max(min, Math.min(value, max));
        fieldset.dataset.value = clampedValue;
        if (display) display.textContent = clampedValue.toFixed(2);
    });
}

/**
 * Update the selected model's size.
 * @param {*} direction - Either -1 or 1, indicating that the model's size should be decreased or increased by one step.
 */
function updateSize(direction) {
    // Only need to read the state from one of them
    const fieldset = document.getElementById('custom-size-input-desktop');
    let currentValue = parseFloat(fieldset.dataset.value);
    const step = parseFloat(fieldset.dataset.step);
    let newValue = currentValue + (direction * step);

    // This will update both displays via the shared setSizeValue function
    setSizeValue(newValue);

    handleRange({ value: newValue });
}

/**
 * Increases the scale of the selected object, and updates the corresponding database record with the new scale.
 * @param {*} detail 
 */
async function handleRange(detail) {
    console.log(detail);
    const size = detail.value;
    const selectedId = document.body.dataset.selectedElementId;
    const model = document.getElementById(selectedId);
    model.object3D.position.y += (size - model.object3D.scale.y) / 2;
    
    model.setAttribute('scale', `${size} ${size} ${size}`);
    model.setAttribute('model-scale', size);

    const id = parseInt(selectedId.split("-")[1], 10);
    try {
        await updateModelScale(id, size);
        console.log('Asset scale successfully updated.')
    } catch (dbError) {
        console.error('Error updating asset scale to local DB: ', dbError);
    }
}

/**
 * Adds a new instance of the specified asset to the scene
 * @param {*} assetId - id of the desired asset
 */
async function addToScene(assetId) {
    console.log('Add to Scene clicked for model ID:', assetId);
    const sceneEl = document.querySelector('a-scene');
    try {
        const asset = await getAsset(assetId);
        const modelUrl = URL.createObjectURL(asset.modelBlob);
        // Adding the date string to the end of the model's id ensures that multiple copies of the same model behave as expected.
        const modelId = `model-${assetId}-${Date.now()}`;
        const newModel = document.createElement('a-entity');
        newModel.setAttribute('gltf-model', modelUrl);
        newModel.setAttribute('model-entity', '');
        newModel.setAttribute('name', asset.prompt);
        newModel.setAttribute('id', modelId);
        newModel.setAttribute('shadow', 'receive: true');
        newModel.setAttribute('model-scale', asset.scale);
        newModel.setAttribute('position', '3 0.5 -3');

        newModel.addEventListener('model-loaded', () => {
            console.log(`Model "${asset.prompt}" has loaded, revoking URL.`);
            URL.revokeObjectURL(modelUrl);
        });

        sceneEl.appendChild(newModel);
        return modelId;
    } catch (addError) {
        console.error("Error adding model to scene:", addError);
        return None;
    }
}

/**
 * Removes the "currently selected" model from the scene
 */
function removeFromScene() {
    const selectedModelID = document.body.dataset.selectedElementId;
    const selectedModelEl = document.getElementById(selectedModelID);
    selectedModelEl.remove();
    const desktopUi = document.getElementsByClassName('desktop-model-interaction');
    if (desktopUi.length > 0) {
        desktopUi[0].style.display = 'none';
    }
}

/**
 * Downloads the designated model to the user's device in GLB format.
 * @param {*} assetId - the id of the asset to download.
 */
async function downloadModel(assetId) {
    try {
        const asset = await getAsset(assetId);
        const modelUrl = URL.createObjectURL(asset.modelBlob);

        const link = document.createElement('a');
        link.style.display = 'none';

        // Set the URL and the desired filename for the download
        link.href = modelUrl;
        link.download = `${asset.prompt.replace(/\s/g, '_')}.glb`;

        // Add a link to the page, click it to trigger the download, then remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(modelUrl);
    } catch (downloadError) {
        console.error("Error downloading model:", downloadError);
    }
}

/**
 * Inserts newline characters into a string to wrap it at a given character length.
 * Tries to break lines at spaces.
 * @param {string} text The text to wrap.
 * @param {number} maxLength The maximum number of characters per line.
 * @returns {string} The formatted text with newline characters.
 */
function wrapText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }

    const words = text.split(' ');
    let currentLine = '';
    const lines = [];

    words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
            lines.push(currentLine.trim());
            currentLine = '';
        }
        currentLine += word + ' ';
    });

    lines.push(currentLine.trim());
    return lines.join('\n');
}