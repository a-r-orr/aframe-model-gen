// API Endpoints
import { IMAGE_API_URL, MODEL_API_URL } from './config.js';

// AFRAME Components

AFRAME.registerComponent('scene-setup', {
    // This component performs setup operations once the A-Frame scene has completed initialisation.
    init: function () {
        console.log('Scene setup component initialized.');
        const sceneEl = this.el;
        // Deactivate the "Generate Model" button
        const modelBox = document.getElementById('model-box');
        modelBox.removeAttribute('generate-model');
        modelBox.setAttribute('color', '#999'); // Set a "disabled" color
        modelBox.classList.remove('clickable');

        document.getElementById('desktop-prompt-form').addEventListener('submit', function (event) {
            // Prevent the form from reloading the page
            event.preventDefault();

            const input = document.getElementById('desktop-prompt-input');
            const promptValue = input.value;

            if (promptValue) {
                console.log("Desktop Prompt Submitted:", promptValue);

                // Set the prompt value on the in-world text entity
                document.getElementById('instruction').setAttribute('value', 'Type your prompt:');
                document.getElementById('prompt').setAttribute('value', promptValue);

                const imageEl = document.getElementById('image');
                imageEl.setAttribute('visible', 'false');

                document.getElementById('error').setAttribute('value', '');
                document.getElementById('error').setAttribute('visible', 'false');

                // Clear the input field after submission
                input.value = '';

                // Reactivate the "Generate Image" button
                const imageBox = document.getElementById('image-box');
                imageBox.setAttribute('generate-image', '');
                imageBox.setAttribute('color', '#00AA66'); // Restore original color
                imageBox.classList.add('clickable');

                // Deactivate the "Generate Model" button
                const modelBox = document.getElementById('model-box');
                modelBox.removeAttribute('generate-model');
                modelBox.setAttribute('color', '#999'); // Set a "disabled" color
                modelBox.classList.remove('clickable');
            }
        });

        const imageLabelModal = document.getElementById('image-label-modal');
        const imageLabelForm = document.getElementById('image-label-form');
        const imageLabelInput = document.getElementById('image-label-input');
        const cancelLabelButton = document.getElementById('cancel-label-button');
        const modalImagePreview = document.getElementById('modal-image-preview');
        const imageUploadInput = document.getElementById('image-upload-input');

        let uploadedFile = null;

        imageUploadInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length === 0) { return; }

            uploadedFile = files[0]; // Store the file temporarily

            // Create a temporary URL to show a preview in the modal
            const previewUrl = URL.createObjectURL(uploadedFile);
            modalImagePreview.src = previewUrl;

            // Show the modal
            imageLabelModal.style.display = 'flex';
            imageLabelInput.focus(); // Automatically focus the input field
        });

        // This listener handles the form submission from the modal
        imageLabelForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the form from reloading the page

            const userPrompt = imageLabelInput.value;
            if (!userPrompt || !uploadedFile) {
                console.error("Prompt or file is missing.");
                return;
            }

            console.log(`User provided label: "${userPrompt}" for image: ${uploadedFile.name}`);

            const loadingEl = document.getElementById('loading-image');
            loadingEl.setAttribute('visible', 'false');

            // Reactivate the "Generate Model" button
            const modelBox = document.getElementById('model-box');
            modelBox.setAttribute('generate-model', '');
            modelBox.setAttribute('color', '#FFC42E'); // Restore original color
            modelBox.classList.add('clickable');

            // Emit the 'image-ready' event with the new prompt and the stored blob
            sceneEl.emit('image-ready', {
                prompt: userPrompt,
                imageBlob: uploadedFile
            });

            // Update the in-world prompt text entity
            document.getElementById('instruction').setAttribute('value', 'Image Label:');
            document.getElementById('prompt').setAttribute('value', userPrompt);

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
            document.getElementById('error').setAttribute('value', '');
            document.getElementById('error').setAttribute('visible', 'false');

            // Hide and reset the modal and file inputs
            imageLabelModal.style.display = 'none';
            URL.revokeObjectURL(modalImagePreview.src); // Clean up the preview URL
            imageLabelForm.reset();
            imageUploadInput.value = ''; // Important: reset file input
            uploadedFile = null;

            // Deactivate the "Generate Image" button
            const imageBox = document.getElementById('image-box');
            imageBox.removeAttribute('generate-image');
            imageBox.setAttribute('color', '#999'); // Set a "disabled" color
            imageBox.classList.remove('clickable');

            
        });

        // This listener handles the "Cancel" button
        cancelLabelButton.addEventListener('click', function () {
            // Hide the modal and reset everything without processing the image
            imageLabelModal.style.display = 'none';
            URL.revokeObjectURL(modalImagePreview.src); // Clean up
            imageLabelForm.reset();
            imageUploadInput.value = '';
            uploadedFile = null;
        });
    }
});

AFRAME.registerComponent('load-model-library', {

    assets: [],
    currentPage: 0,
    itemsPerPage: 4,

    init: async function () {
        // Add listener to update library when needed
        this.el.addEventListener('library-updated', this.refreshLibrary.bind(this));

        const isVRSupported = await checkVRSupport();

        if (isVRSupported) {
            // Control Pagination of in-VR model library
            const leftButton = document.getElementById('vr-lib-left');
            const rightButton = document.getElementById('vr-lib-right');

            leftButton.addEventListener('click', () => {
                if (this.currentPage > 0) {
                    this.currentPage--;
                    this.renderCurrentPage();
                }
            });

            rightButton.addEventListener('click', () => {
                const maxPage = Math.ceil(this.assets.length / this.itemsPerPage) - 1;
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.renderCurrentPage();
                }
            });
        } else {
            const vrLibraryContainer = document.getElementById('vr-library-container');
            vrLibraryContainer.setAttribute('visible', 'false');
        }


        // Update library once on statup
        this.refreshLibrary();
    },

    refreshLibrary: async function () {
        const isVRSupported = await checkVRSupport();
        const sceneEl = this.el;

        // 1. Clear 2D HTML libraries
        const libraries = document.getElementsByClassName('library-scroller');
        for (const lib of libraries) {
            lib.innerHTML = '';
        }

        console.log("Starting to load library...");
        try {
            await initDB();
            this.assets = await getAllAssets();
            console.log(`Retrieved ${this.assets.length} saved asset records.`);
            console.log(this.assets);

            this.currentPage = 0;
            if (isVRSupported) {
                this.renderCurrentPage();
            }
            const libraries = document.getElementsByClassName('library-scroller');


            for (const asset of this.assets) {
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
                            this.el.sceneEl.emit('library-updated');
                        } catch (deleteError) {
                            console.error("Error deleting asset:", deleteError);
                            card.classList.remove('is-deleting');
                            this.el.sceneEl.emit('library-updated');
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Could not load asset library: ', error);
        }
    },

    renderCurrentPage: function () {
        console.log(`Rendering page ${this.currentPage}`);
        const vrLibraryContainer = document.getElementById('vr-library-container');
        const cards = vrLibraryContainer.querySelectorAll('.native-card');
        cards.forEach(card => card.remove());

        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageAssets = this.assets.slice(startIndex, endIndex);

        const vrCardTemplate = document.getElementById('vr-card-template');
        pageAssets.forEach((asset, index) => {
            const modelImageUrl = URL.createObjectURL(asset.imageBlob);
            const newVRCard = vrCardTemplate.cloneNode(true);
            newVRCard.removeAttribute('id');
            newVRCard.getElementsByClassName('model-name')[0].setAttribute('value', asset.prompt);
            newVRCard.setAttribute('model-id', asset.id);

            newVRCard.addEventListener('loaded', function () {
                const vrCardImage = newVRCard.querySelector('.model-image')
                if (vrCardImage) {
                    const loader = new THREE.TextureLoader();
                    loader.load(modelImageUrl, function (texture) {
                        const mesh = vrCardImage.getObject3D('mesh');
                        if (!mesh) return;
                        mesh.material.map = texture;
                        mesh.material.needsUpdate = true;
                        URL.revokeObjectURL(modelImageUrl);
                    });
                }
            });

            const xPos = (index - (this.itemsPerPage - 1) / 2) * 1.2;
            newVRCard.setAttribute('position', `${xPos} 0 0.02`);
            vrLibraryContainer.appendChild(newVRCard);
        });

        this.updateButtonStates();
    },

    updateButtonStates: function () {
        const leftBtn = document.getElementById('vr-lib-left');
        const rightBtn = document.getElementById('vr-lib-right');

        // Show/hide left button
        leftBtn.setAttribute('visible', this.currentPage > 0);

        // Show/hide right button
        const maxPage = Math.ceil(this.assets.length / this.itemsPerPage) - 1;
        rightBtn.setAttribute('visible', this.currentPage < maxPage);
    }
});

AFRAME.registerComponent('card-controls', {
    // This component handles the in-VR model cards,
    // including adding, downloading, and deleting.
    init: function () {
        const el = this.el;
        // Use querySelector for element selection
        const background = el.querySelector('.card-base');
        const originalColor = background.getAttribute('color');
        const hoverColor = 'powderblue';
        const overlay = el.querySelector('.af-card-overlay');
        const addButton = el.querySelector('.af-add-to-scene');
        const downloadButton = el.querySelector('.af-download');
        const deleteButton = el.querySelector('.af-delete');
        const deleteQuery = el.querySelector('.af-delete-query');
        const confirmDelete = el.querySelector('.af-confirm-delete');
        const cancelDelete = el.querySelector('.af-cancel-delete');

        const assetId = parseInt(el.getAttribute('model-id'));

        // Helper function to reset the delete confirmation UI
        const resetDeleteUI = () => {
            addButton.setAttribute('visible', 'true');
            downloadButton.setAttribute('visible', 'true');
            deleteButton.setAttribute('visible', 'true');
            deleteQuery.setAttribute('visible', 'false');

            // Re-enable clickability on main buttons
            addButton.classList.add('clickable');
            downloadButton.classList.add('clickable');
            deleteButton.classList.add('clickable');

            // Disable clickability on confirmation buttons
            confirmDelete.classList.remove('clickable');
            cancelDelete.classList.remove('clickable');
        };

        const disableAllButtons = () => {
            addButton.classList.remove('clickable');
            downloadButton.classList.remove('clickable');
            deleteButton.classList.remove('clickable');
            confirmDelete.classList.remove('clickable');
            cancelDelete.classList.remove('clickable');
        };

        // Card Hover Effect
        el.addEventListener('mouseenter', () => background.setAttribute('color', hoverColor));
        el.addEventListener('mouseleave', () => background.setAttribute('color', originalColor));

        // Card Click to Toggle Overlay
        el.addEventListener('click', () => {
            const isVisible = overlay.getAttribute('visible');
            overlay.setAttribute('visible', !isVisible);
            overlay.setAttribute('opacity', isVisible ? '0' : '0.5');

            if (!isVisible) {
                // If making visible, ensure UI is in its default state
                resetDeleteUI();
            } else {
                disableAllButtons();
            }
        });

        // Button Hover Effects
        addButton.addEventListener('mouseenter', () => addButton.setAttribute('color', hoverColor));
        addButton.addEventListener('mouseleave', () => addButton.setAttribute('color', originalColor));
        downloadButton.addEventListener('mouseenter', () => downloadButton.setAttribute('color', hoverColor));
        downloadButton.addEventListener('mouseleave', () => downloadButton.setAttribute('color', originalColor));
        deleteButton.addEventListener('mouseenter', () => deleteButton.setAttribute('color', 'tomato'));
        deleteButton.addEventListener('mouseleave', () => deleteButton.setAttribute('color', 'salmon'));
        cancelDelete.addEventListener('mouseenter', () => cancelDelete.setAttribute('color', hoverColor));
        cancelDelete.addEventListener('mouseleave', () => cancelDelete.setAttribute('color', originalColor));
        confirmDelete.addEventListener('mouseenter', () => confirmDelete.setAttribute('color', 'tomato'));
        confirmDelete.addEventListener('mouseleave', () => confirmDelete.setAttribute('color', 'salmon'));

        // Button Click Handlers
        addButton.addEventListener('click', async (event) => {
            event.stopPropagation(); // Prevent card's click handler from firing
            await addToScene(assetId);
        });

        downloadButton.addEventListener('click', async (event) => {
            event.stopPropagation();
            await downloadModel(assetId);
        });

        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();

            // Hide main action buttons
            addButton.setAttribute('visible', 'false');
            downloadButton.setAttribute('visible', 'false');
            deleteButton.setAttribute('visible', 'false');

            // Show delete confirmation dialog
            deleteQuery.setAttribute('visible', 'true');

            // Update clickable classes
            addButton.classList.remove('clickable');
            downloadButton.classList.remove('clickable');
            deleteButton.classList.remove('clickable');
            confirmDelete.classList.add('clickable');
            cancelDelete.classList.add('clickable');
        });

        cancelDelete.addEventListener('click', (event) => {
            event.stopPropagation();
            resetDeleteUI();
        });

        confirmDelete.addEventListener('click', async (event) => {
            event.stopPropagation();
            try {
                await deleteAsset(assetId);
                el.remove(); // Remove the card from the scene
                this.el.sceneEl.emit('library-updated');
            } catch (deleteError) {
                console.error("Error deleting asset via VR card:", deleteError);
                resetDeleteUI(); // Reset UI on error
                this.el.sceneEl.emit('library-updated');
            }
        });
    }
});

AFRAME.registerComponent('model-entity', {
    init: function () {
        const el = this.el;
        el.setAttribute('class', 'grabbable clickable');

        if (el.getAttribute('model-scale') && el.getAttribute('model-scale') !== "undefined") {
            const scale = parseFloat(el.getAttribute('model-scale'));
            el.setAttribute('scale', `${scale} ${scale} ${scale}`);
            el.object3D.position.y = scale / 2 + 0.2;
        }

        // Add an event listener to wait for the model to finish loading
        el.addEventListener('model-loaded', () => {
            const obj = el.getObject3D('mesh');
            if (!obj) return;

            obj.traverse(node => {
                // If a part of the model is a mesh and has a material
                if (node.isMesh && node.material) {
                    // Create a new PBR material
                    const newMaterial = new THREE.MeshStandardMaterial();

                    // Copy the texture (map) from the old material to the new one
                    if (node.material.map) {
                        newMaterial.map = node.material.map;
                    }

                    // Copy the color if there's no texture
                    newMaterial.color = node.material.color;

                    // Adjust PBR properties for realistic interaction with light
                    newMaterial.metalness = 0.1;
                    newMaterial.roughness = 0.8;

                    // Replace the old material with the new one
                    node.material = newMaterial;
                }
            });
        });

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

        el.addEventListener('click', async function (event) {
            event.stopPropagation();
            // Check if the device supports VR
            const hasVR = await checkVRSupport();
            // This is now the single source of truth for the selected model
            document.body.dataset.selectedElementId = el.id;

            // Create the UI panel for scaling or removing a model
            if (hasVR) {
                const cameraRig = document.getElementById('rig');

                // Remove the previous panel if it exists
                const oldPanel = document.getElementById('active-ui-panel');
                if (oldPanel) {
                    const wasAttachedToThis = oldPanel.dataset.attachedTo === el.id;
                    oldPanel.parentNode.removeChild(oldPanel);
                    if (wasAttachedToThis) return; // If clicking the same model again, just close the panel.
                }

                // Clone the native UI template
                const template = document.getElementById('vr-settings-panel-template');
                const uiPanel = template.cloneNode(true);

                uiPanel.id = 'active-ui-panel';
                uiPanel.dataset.attachedTo = el.id; // Keep track of what model it's for
                uiPanel.setAttribute('position', '0 0.5 -1.5'); // Position in front of the camera

                // Find the interactive elements within the new panel
                const nameDisplay = uiPanel.querySelector('.model-name-display');
                const scaleDisplay = uiPanel.querySelector('.vr-scale-display');
                const plusBtn = uiPanel.querySelector('.vr-scale-plus');
                const minusBtn = uiPanel.querySelector('.vr-scale-minus');
                const removeBtn = uiPanel.querySelector('.vr-remove-model');

                // Set the initial values from the clicked model ('el')
                let currentScale = parseFloat(el.getAttribute('model-scale')) || 1.0;
                nameDisplay.setAttribute('value', el.getAttribute('name'));
                scaleDisplay.setAttribute('value', currentScale.toFixed(2));

                // Add event listeners to the buttons
                // Increase Scale
                plusBtn.addEventListener('click', function (evt) {
                    evt.stopPropagation();
                    currentScale = Math.min(5.0, currentScale + 0.25); // Max scale 5.0
                    handleRange({ value: currentScale });
                    scaleDisplay.setAttribute('value', currentScale.toFixed(2));
                });
                // Decrease Scale
                minusBtn.addEventListener('click', function (evt) {
                    evt.stopPropagation();
                    currentScale = Math.max(0.25, currentScale - 0.25); // Min scale 0.25
                    handleRange({ value: currentScale });
                    scaleDisplay.setAttribute('value', currentScale.toFixed(2));
                });
                // Remove model from scene
                removeBtn.addEventListener('click', function (evt) {
                    evt.stopPropagation();
                    removeFromScene();
                    cameraRig.removeChild(uiPanel);
                });

                uiPanel.addEventListener('mouseenter', function () {
                    mouseCursor.removeAttribute('mouse-manipulation');
                });

                // Attach the fully configured panel to the camera rig
                cameraRig.appendChild(uiPanel);

            } else {
                // DESKTOP: Simply show the desktop UI
                const desktopUi = document.getElementsByClassName('desktop-model-interaction');
                desktopUi[0].style.display = 'flex';
                document.getElementById('desktop-model-name').textContent = el.getAttribute('name');
                // Update the size value in the desktop UI
                const currentScale = parseFloat(el.getAttribute('model-scale')) || 1.0;
                setSizeValue(currentScale);
            }
            
        });
    }
});

AFRAME.registerComponent('generate-image', {
    schema: { color: { default: 'red' } },
    init: function () {
        const mouseCursor = document.getElementById('mouseCursor');
        var data = this.data;
        var el = this.el;
        // var defaultColor = el.getAttribute('material').color;
        var defaultColor = '#00AA66';

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

                // Reactivate the "Generate Model" button
                const modelBox = document.getElementById('model-box');
                modelBox.setAttribute('generate-model', '');
                modelBox.setAttribute('color', '#FFC42E'); // Restore original color
                modelBox.classList.add('clickable');

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
        // var defaultColor = el.getAttribute('material').color;
        var defaultColor = '#FFC42E';

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
            defaultColor = '#FFC42E';
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
                    this.el.sceneEl.emit('library-updated');
                    await addToScene(new_model_id);
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

