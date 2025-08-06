// API Endpoints
const IMAGE_API_URL = 'https://192.168.0.33/image/images/create-image';
const MODEL_API_URL = 'https://192.168.0.33/model/models/create-from-image';


// This function checks for VR support and returns true or false.
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

function removeModel() {
    const selectedModelID = document.body.dataset.selectedElementId;
    const selectedModelEl = document.getElementById(selectedModelID);
    selectedModelEl.remove();
    const desktopUi = document.getElementsByClassName('desktop-model-interaction');
    desktopUi[0].style.display = 'none';
}

async function handleRange(detail) {
    console.log(detail);
    const size = detail.value;
    // const overlay = document.querySelectorAll('.size-input')[0];
    // console.log(overlay);
    const selectedId = document.body.dataset.selectedElementId;
    const model = document.getElementById(selectedId);
    model.object3D.position.y += (size - model.object3D.scale.y) / 2;
    console.log((size - model.object3D.scale.y) / 2);
    model.setAttribute('scale', `${size} ${size} ${size}`);
    model.setAttribute('model-scale', size);

    // document.querySelectorAll('.size-input').forEach(container => {
    // });

    const id = parseInt(selectedId.split("-")[1], 10);
    try {
        await updateModelScale(id, size);
        console.log('Asset scale successfully updated.')
    } catch (dbError) {
        console.error('Error updating asset scale to local DB: ', dbError);
    }
}

async function addToScene(assetId) {
    console.log('Add to Scene clicked for model ID:', assetId);

    try {
        const asset = await getAsset(assetId);
        const modelUrl = URL.createObjectURL(asset.modelBlob);
        const modelId = `model-${assetId}`;
        const newModel = document.createElement('a-entity');
        newModel.setAttribute('gltf-model', modelUrl);
        newModel.setAttribute('model-entity', '');
        newModel.setAttribute('name', asset.prompt);
        newModel.setAttribute('id', modelId);
        newModel.setAttribute('model-scale', asset.scale);
        newModel.setAttribute('position', '5 0.5 -5'); // Or any desired position

        newModel.addEventListener('model-loaded', () => {
            console.log(`Model "${asset.prompt}" has loaded, revoking URL.`);
            URL.revokeObjectURL(modelUrl);
        });

        sceneEl.appendChild(newModel);
    } catch (addError) {
        console.error("Error adding model to scene:", addError);
    }
}

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

AFRAME.registerComponent('scene-setup', {
    init: function () {
        console.log('Scene setup component initialized.');
        const sceneEl = this.el;

        document.getElementById('desktop-prompt-form').addEventListener('submit', function (event) {
            // Prevent the form from reloading the page
            event.preventDefault();

            const input = document.getElementById('desktop-prompt-input');
            const promptValue = input.value;

            if (promptValue) {
                console.log("Desktop Prompt Submitted:", promptValue);

                // Set the prompt value on the in-world text entity
                document.getElementById('prompt').setAttribute('value', promptValue);

                // Optionally, clear the input field after submission
                input.value = '';
            }
        });

        const imageUploadInput = document.getElementById('image-upload-input');

        imageUploadInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length === 0) { return; }
            const loadingEl = document.getElementById('loading-image');
            loadingEl.setAttribute('visible', 'false');

            try {
                const uploadedFile = files[0];
                console.log('User uploaded image:', uploadedFile.name);

                // Emit the 'image-ready' event on the scene
                sceneEl.emit('image-ready', {
                    prompt: uploadedFile.name,
                    imageBlob: uploadedFile
                });

                // Display the uploaded image in the in-world menu
                const imageEl = document.getElementById('image');

                const imageUrl = URL.createObjectURL(uploadedFile);

                const loader = new THREE.TextureLoader();
                loader.load(imageUrl, (texture) => {
                    const mesh = imageEl.getObject3D('mesh');
                    if (mesh) {
                        mesh.material.map = texture;
                        mesh.material.needsUpdate = true;
                    }
                });
                imageEl.setAttribute('visible', 'true');
            } catch (error) {
                console.log(`Error uploading image: ${error}`);
            } finally {
                loadingEl.setAttribute('visible', 'false');
            }
        });
    }
});

AFRAME.registerComponent('load-model-library', {
    async init() {
        console.log("Starting to load library...");
        try {
            await initDB();
            const assets = await getAllAssets();
            console.log(`Retrieved ${assets.length} saved asset records.`);
            console.log(assets);

            const libraries = document.getElementsByClassName('library-scroller');
            const sceneEl = this.el;

            let i = 0;
            var xPos = 2;
            for (const asset of assets) {
                const modelUrl = URL.createObjectURL(asset.modelBlob);
                const new_model = document.createElement('a-entity');

                const model_card = document.getElementById('model-card-template');
                const new_card = model_card.cloneNode(true);
                new_card.removeAttribute('id');
                new_card.getElementsByClassName('model-name')[0].innerText = wrapText(asset.prompt, 20);
                const modelImageUrl = URL.createObjectURL(asset.imageBlob);
                new_card.getElementsByClassName('model-image')[0].setAttribute('src', modelImageUrl);

                new_card.setAttribute('model-id', asset.id)

                for (const lib of libraries) {
                    lib.appendChild(new_card.cloneNode(true));
                }
            }

            for (const lib of libraries) {
                const cards = lib.getElementsByClassName('model-card');
                for (const card of cards) {

                    // Logic for the card itself
                    card.addEventListener('click', () => {
                        // Check if the clicked card is already selected
                        const isAlreadySelected = card.classList.contains('selected');

                        // First, deselect all cards in this library
                        for (const otherCard of cards) {
                            otherCard.classList.remove('selected');
                        }

                        // If the card wasn't already selected, select it now.
                        // This makes it so clicking a selected card deselects it.
                        if (!isAlreadySelected) {
                            card.classList.add('selected');
                        }
                    });

                    // Logic for the buttons on the model card overlay
                    const addButton = card.querySelector('[data-action="add"]');
                    const downloadButton = card.querySelector('[data-action="download"]');
                    const deleteButton = card.querySelector('[data-action="delete"]');
                    const confirmDeleteButton = card.querySelector('[data-action="confirm-delete"]');
                    const cancelDeleteButton = card.querySelector('[data-action="cancel-delete"]');

                    const assetId = parseInt(card.getAttribute('model-id'));

                    // Add to Scene Button
                    addButton.addEventListener('click', async (event) => {
                        event.stopPropagation(); // Prevents the card click event from firing too.
                        console.log('Add to Scene clicked for model ID:', card.getAttribute('model-id'));
                        
                        await addToScene(assetId);
                    });

                    // Download Button
                    downloadButton.addEventListener('click', async (event) => {
                        event.stopPropagation();
                        console.log('Download button clicked for model ID:', card.getAttribute('model-id'));

                        await downloadModel(assetId);
                        
                    });

                    // Delete Asset Button
                    deleteButton.addEventListener('click', async (event) => {
                        event.stopPropagation();
                        card.classList.add('is-deleting');
                    });

                    // Cancel Delete Button
                    cancelDeleteButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        // Remove the class to hide the prompt and show the original buttons
                        card.classList.remove('is-deleting');
                    });

                    // Confirm Delete Button
                    confirmDeleteButton.addEventListener('click', async (event) => {
                        event.stopPropagation();
                        console.log('Confirmed delete for model ID:', card.getAttribute('model-id'));

                        try {
                            await deleteAsset(assetId); // Delete from the database
                            card.remove(); // Remove the card from the UI
                        } catch (deleteError) {
                            console.error("Error deleting asset:", deleteError);
                            card.classList.remove('is-deleting');
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Could not load asset library: ', error);
        }
    }
});

AFRAME.registerComponent('model-entity', {
    init: function () {
        const el = this.el;
        el.setAttribute('class', 'grabbable clickable');

        if (el.getAttribute('model-scale') && el.getAttribute('model-scale') !== "undefined") {
            const scale = parseFloat(el.getAttribute('model-scale'));
            el.setAttribute('scale', `${scale} ${scale} ${scale}`);
            el.object3D.position.y = scale / 2;

        }
        const mouseCursor = document.getElementById('mouseCursor');

        el.addEventListener('mouseenter', () => {
            if (!mouseCursor.hasAttribute('mouse-manipulation')) {
                mouseCursor.setAttribute('mouse-manipulation', '');
            }
        });

        el.addEventListener('mousedown', () => {
            mouseCursor.setAttribute('dragging', 'true')
        });

        el.addEventListener('mouseup', () => {
            mouseCursor.setAttribute('dragging', 'false')
            // Use setTimeout with a zero delay to push the removal to the next event loop tick.
            setTimeout(() => {
                if (mouseCursor.hasAttribute('mouse-manipulation')) {
                    mouseCursor.removeAttribute('mouse-manipulation');
                }
            }, 0);
        });

        el.addEventListener('mouseleave', () => {
            if (!mouseCursor.getAttribute('dragging')) {
                mouseCursor.removeAttribute('mouse-manipulation');
            }
        });

        el.addEventListener('click', function (event) {
            event.stopPropagation();

            // This is now the single source of truth for the selected model
            document.body.dataset.selectedElementId = el.id;

            if (isInVR) {
                // VR: Create the 3D panel pointing to the hidden VR source
                const cameraRig = document.getElementById('rig');

                const oldPanel = document.getElementById('active-ui-panel');
                if (oldPanel) {
                    const wasAttachedToThis = oldPanel.dataset.attachedTo === el.id;
                    oldPanel.parentNode.removeChild(oldPanel);
                    if (wasAttachedToThis) return;
                }

                const uiPanel = document.createElement('a-entity');
                // document.getElementById('vr-ui-source').textContent = el.getAttribute('name');
                uiPanel.setAttribute('id', 'active-ui-panel');
                uiPanel.dataset.attachedTo = el.id;
                // Point to the correct source
                uiPanel.setAttribute('html', { html: '#vr-model-settings', cursor: '#mouseCursor' });
                uiPanel.setAttribute('position', '0 1 -1.5');
                uiPanel.setAttribute('scale', '2 2 2');
                cameraRig.appendChild(uiPanel);

            } else {
                // DESKTOP: Simply show the desktop UI
                const desktopUi = document.getElementsByClassName('desktop-model-interaction');
                desktopUi[0].style.display = 'flex';
                document.getElementById('desktop-model-name').textContent = el.getAttribute('name');
            }

            // Update the size value in both UIs
            const currentScale = parseFloat(el.getAttribute('model-scale')) || 1.0;
            setSizeValue(currentScale);
        });
    }
});

AFRAME.registerComponent('generate-image', {
    schema: { color: { default: 'red' } },
    init: function () {
        const mouseCursor = document.getElementById('mouseCursor');
        var data = this.data;
        var el = this.el;
        var defaultColor = el.getAttribute('material').color;

        const prompt = document.getElementById('prompt').getAttribute('value');
        console.log(prompt);

        el.addEventListener('mouseenter', function () {
            el.setAttribute('color', data.color);
            if (mouseCursor.hasAttribute('mouse-manipulation') && mouseCursor.getAttribute('dragging') == 'false') {
                mouseCursor.removeAttribute('mouse-manipulation');
            }
        });
        el.addEventListener('mouseleave', function () {
            el.setAttribute('color', defaultColor);
        });

        el.addEventListener('click', async function () {
            try {
                const imageEl = document.getElementById('image');
                const loadingEl = document.getElementById('loading-image');
                loadingEl.setAttribute('visible', 'true');
                imageEl.setAttribute('visible', 'false');
                const prompt = document.getElementById('prompt').getAttribute('value');
                console.log(prompt);
                console.log("Sending request for image...")
                const response = await fetch(IMAGE_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                if (!response.ok) throw new Error(`Image API request failed`);

                const imageBlob = await response.blob();

                // Emit a scene-wide event with the blob data
                console.log("Image generated. Emitting 'image-ready' event.");
                el.sceneEl.emit('image-ready', { prompt: prompt, imageBlob: imageBlob });

                // Display the image
                const imageUrl = URL.createObjectURL(imageBlob);

                const loader = new THREE.TextureLoader();
                loader.load(imageUrl, function (texture) {
                    const mesh = imageEl.getObject3D('mesh');
                    if (!mesh) return;
                    mesh.material.map = texture;
                    mesh.material.needsUpdate = true;
                    URL.revokeObjectURL(imageUrl);
                });
                imageEl.setAttribute('visible', 'true');
                loadingEl.setAttribute('visible', 'false');
                document.getElementById('error').setAttribute('value', '');
                document.getElementById('error').setAttribute('visible', 'false');

            } catch (error) {
                console.error('Error fetching image:', error);
                document.getElementById('error').setAttribute('value', 'Could not generate image');
                document.getElementById('error').setAttribute('visible', 'true');
                const loadingEl = document.getElementById('loading-image');
                loadingEl.setAttribute('visible', 'false');
            }
        });
    }
});

AFRAME.registerComponent('generate-model', {
    schema: { color: { default: 'blue' } },
    init: function () {
        const el = this.el;
        const sceneEl = this.el.sceneEl;
        var data = this.data;
        var defaultColor = el.getAttribute('material').color;

        el.addEventListener('mouseenter', function () {
            el.setAttribute('color', data.color);
            if (mouseCursor.hasAttribute('mouse-manipulation') && mouseCursor.getAttribute('dragging') == 'false') {
                mouseCursor.removeAttribute('mouse-manipulation');
            }
        });
        el.addEventListener('mouseleave', function () {
            el.setAttribute('color', defaultColor);
        });

        // A place to store the blob when we receive it
        this.imageToSend = null;

        // 👂 LISTEN for the custom event on the scene
        sceneEl.addEventListener('image-ready', (event) => {
            console.log("Component 'generate-model' heard the 'image-ready' event.");
            // Grab the blob from the event's 'detail' object and store it
            this.imageToSend = event.detail.imageBlob;
            this.prompt = event.detail.prompt;
            // Optional: change the button color to show it's ready
            el.setAttribute('color', '#FFC42E');
        });

        // Add a click listener for this component's box
        el.addEventListener('click', async () => {
            if (!this.imageToSend) {
                console.error("Model generator clicked, but no image is ready!");
                document.getElementById('error').setAttribute('visible', 'true');
                document.getElementById('error').setAttribute('value', 'Generate an image first');
                return;
            }

            console.log("Sending stored image to model API...");
            const formData = new FormData();
            formData.append('image_file', this.imageToSend, 'seed_image.png');

            try {
                const loadingEl = document.getElementById('loading-image');
                loadingEl.setAttribute('visible', 'true');

                const response = await fetch(MODEL_API_URL, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error(`Model API request failed: ${response.statusText}`);

                const modelBlob = await response.blob();
                console.log("Received model from second API", modelBlob);

                try {
                    const new_model_id = await addAsset(this.prompt, this.imageToSend, modelBlob);
                    console.log('Asset blob successfully saved.')

                    await addToScene(new_model_id);

                    const model_card = document.getElementById('model-card-template');
                    const new_card = model_card.cloneNode(true);
                    new_card.removeAttribute('id');
                    new_card.getElementsByClassName('model-name')[0].innerText = this.prompt;
                    const modelImageUrl = URL.createObjectURL(this.imageToSend);
                    new_card.getElementsByClassName('model-image')[0].setAttribute('src', modelImageUrl);
                    new_card.setAttribute('model-id', new_model_id)

                    new_card.addEventListener('click', async () => {
                        console.log('click', this);
                        try {
                            const this_asset = await getAsset(this.getAttribute('model-id'));

                            const this_modelUrl = URL.createObjectURL(this_asset.modelBlob);
                            var this_model = document.createElement('a-entity');
                            this_model.setAttribute('gltf-model', this_modelUrl);

                            this_model.setAttribute('position', '5 0.5 -5');
                            this_model.setAttribute('class', 'grabbable clickable');
                            this.sceneEl.appendChild(this_model);
                        } catch (error) {
                            console.error(error);
                        }
                    });
                    const libraries = document.getElementsByClassName('library-scroller');
                    for (const lib of libraries) {
                        lib.appendChild(new_card);
                    }

                } catch (dbError) {
                    console.error('Error saving asset blob to local DB: ', dbError);
                }

                loadingEl.setAttribute('visible', 'false');
                document.getElementById('error').setAttribute('value', '');
                document.getElementById('error').setAttribute('visible', 'false');

            } catch (error) {
                console.error('Error sending image to model API:', error);
                document.getElementById('error').setAttribute('value', 'Could not create model');
                document.getElementById('error').setAttribute('visible', 'true');
                const loadingEl = document.getElementById('loading-image');
                loadingEl.setAttribute('visible', 'false');
            }
        });
    }
});

AFRAME.registerComponent('card-controls', {
    // This component handles the in-VR model cards,
    // including adding, downloading, and deleting.
    init: function () {
        const el = this.el;
        const background = el.getElementsByClassName('card-base')[0];
        console.log(background);
        const originalColor = background.getAttribute('color');
        const hoverColor = 'powderblue'; // A slightly different shade for hover
        const overlay = el.getElementsByClassName('af-card-overlay')[0];
        const addButton = overlay.getElementsByClassName('af-add-to-scene')[0];
        const downloadButton = overlay.getElementsByClassName('af-download')[0];
        const deleteButton = overlay.getElementsByClassName('af-delete')[0];
        const deleteQuery = el.getElementsByClassName('af-delete-query')[0];
        const confirmDelete = el.getElementsByClassName('af-confirm-delete')[0];
        const cancelDelete = el.getElementsByClassName('af-cancel-delete')[0];

        const assetId = parseInt(el.getAttribute('model-id'));

        // --- 1. Hover Effect ---
        el.addEventListener('mouseenter', () => {
            // Make the background slightly brighter on hover
            background.setAttribute('color', hoverColor);
        });

        el.addEventListener('mouseleave', () => {
            // Change the color back when the cursor leaves
            background.setAttribute('color', originalColor);
        });

        // --- 2. Click Logic ---
        el.addEventListener('click', (event) => {


            if (overlay.getAttribute('visible')) {
                overlay.setAttribute('opacity', '0');
                overlay.setAttribute('visible', 'false');
                overlay.classList.remove('clickable');

                addButton.classList.remove('clickable');
                downloadButton.classList.remove('clickable');
                deleteButton.classList.remove('clickable');
            } else {
                overlay.setAttribute('opacity', '0.5');
                overlay.setAttribute('visible', 'true');
                overlay.classList.add('clickable');

                addButton.classList.add('clickable');
                downloadButton.classList.add('clickable');
                deleteButton.classList.add('clickable');

                addButton.addEventListener('mouseenter', () => {
                    addButton.setAttribute('color', hoverColor);
                });
                addButton.addEventListener('mouseleave', () => {
                    addButton.setAttribute('color', originalColor);
                });
                addButton.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    await addToScene(assetId);
                });

                downloadButton.addEventListener('mouseenter', () => {
                    downloadButton.setAttribute('color', hoverColor);
                });
                downloadButton.addEventListener('mouseleave', () => {
                    downloadButton.setAttribute('color', originalColor);
                });
                downloadButton.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    await downloadModel(assetId);
                });

                deleteButton.addEventListener('mouseenter', () => {
                    deleteButton.setAttribute('color', 'tomato');
                });
                deleteButton.addEventListener('mouseleave', () => {
                    deleteButton.setAttribute('color', 'salmon');
                });
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    
                    addButton.setAttribute('visible', 'false');
                    addButton.classList.remove('clickable');
                    downloadButton.setAttribute('visible', 'false');
                    downloadButton.classList.remove('clickable');
                    deleteButton.setAttribute('visible', 'false');
                    deleteButton.classList.remove('clickable');

                    deleteQuery.setAttribute('visible', 'true');
                    confirmDelete.classList.add('clickable');
                    cancelDelete.classList.add('clickable');
                });

                cancelDelete.addEventListener('mouseenter', () => {
                    cancelDelete.setAttribute('color', hoverColor);
                });
                cancelDelete.addEventListener('mouseleave', () => {
                    cancelDelete.setAttribute('color', originalColor);
                });
                cancelDelete.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    
                    addButton.setAttribute('visible', 'true');
                    addButton.classList.add('clickable');
                    downloadButton.setAttribute('visible', 'true');
                    downloadButton.classList.add('clickable');
                    deleteButton.setAttribute('visible', 'true');
                    deleteButton.classList.add('clickable');

                    deleteQuery.setAttribute('visible', 'false');
                    confirmDelete.classList.remove('clickable');
                    cancelDelete.classList.remove('clickable');
                });
            }
            console.log('Card clicked!', el.id);


        });
    }
});