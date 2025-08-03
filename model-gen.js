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

                /*
                // This adds all existing models to the scene
                // COMMENTED SECTION TO BE DELETED ONCE SYSTEM WORKS
                new_model.setAttribute('gltf-model', modelUrl);

                // Arrange models in a row to avoid overlap
                if (!asset.scale) {
                    xPos += 2;
                } else {
                    xPos += parseInt(asset.scale) / 2 + 1;
                }

                console.log(xPos);

                new_model.setAttribute('position', `${xPos} 0.5 -4`);
                new_model.setAttribute('model-entity', '');
                new_model.setAttribute('name', asset.prompt);
                new_model.setAttribute('model-scale', asset.scale);

                const modelId = `model-${asset.id}`;
                new_model.setAttribute('id', modelId);

                // const bounding_box = document.createElement('a-box');
                // bounding_box.setAttribute('material', 'color: red; opacity: 0.2;');
                // bounding_box.setAttribute('size', '1 1 1');
                // new_model.appendChild(bounding_box);

                sceneEl.appendChild(new_model);
                console.log(`Loaded model "${asset.prompt}" into the scene.`);

                if (asset.scale) {
                    xPos += parseInt(asset.scale) / 2;
                }

                i++;
                */

                const model_card = document.getElementById('model-card-template');
                const new_card = model_card.cloneNode(true);
                new_card.removeAttribute('id');
                new_card.getElementsByClassName('model-name')[0].innerText = asset.prompt;
                const modelImageUrl = URL.createObjectURL(asset.imageBlob);
                new_card.getElementsByClassName('model-image')[0].setAttribute('src', modelImageUrl);

                new_card.setAttribute('model-id', asset.id)

                for (const lib of libraries) {
                    lib.appendChild(new_card.cloneNode(true));
                }
            }

            // Add Event Listener to each card in both "model libraries".
            // When clicked, the model associated with the card is added to the scene.
            // for (const lib of libraries) {
            //     const cards = lib.getElementsByClassName('model-card');
            //     for (const card of cards) {
            //         card.addEventListener('click', async () => {
            //             console.log('click', card);
            //             try {
            //                 console.log(card.getAttribute('model-id'));
            //                 const this_asset = await getAsset(parseInt(card.getAttribute('model-id')));
            //                 console.log('this_asset: ', this_asset);
            //                 const this_modelUrl = URL.createObjectURL(this_asset.modelBlob);

            //                 var this_model = document.createElement('a-entity');
            //                 this_model.setAttribute('gltf-model', this_modelUrl);

            //                 this_model.setAttribute('model-entity', '');
            //                 this_model.setAttribute('name', this_asset.prompt);
            //                 this_model.setAttribute('model-scale', this_asset.scale);

            //                 const modelId = `model-${this_asset.id}`;
            //                 this_model.setAttribute('id', modelId);

            //                 this_model.setAttribute('position', '5 0.5 -5');
            //                 this_model.setAttribute('class', 'grabbable clickable');
            //                 sceneEl.appendChild(this_model);
            //             } catch (cardError) {
            //                 console.error(cardError);
            //             }
            //         });
            //     }
            // }

            for (const lib of libraries) {
                const cards = lib.getElementsByClassName('model-card');
                for (const card of cards) {

                    // --- Logic for the card itself ---
                    card.addEventListener('click', () => {
                        // Check if the clicked card is already selected
                        const isAlreadySelected = card.classList.contains('selected');

                        // First, deselect all other cards in this library
                        for (const otherCard of cards) {
                            otherCard.classList.remove('selected');
                        }

                        // If the card wasn't already selected, select it now.
                        // This makes it so clicking a selected card deselects it.
                        if (!isAlreadySelected) {
                            card.classList.add('selected');
                        }
                    });

                    // --- Logic for the buttons on the overlay ---
                    const addButton = card.querySelector('[data-action="add"]');
                    const deleteButton = card.querySelector('[data-action="delete"]');

                    // ADD TO SCENE BUTTON
                    addButton.addEventListener('click', async (event) => {
                        event.stopPropagation(); // Prevents the card click event from firing too.
                        console.log('Add to Scene clicked for model ID:', card.getAttribute('model-id'));

                        try {
                            const assetId = parseInt(card.getAttribute('model-id'));
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

                            sceneEl.appendChild(newModel);

                            // Deselect the card after adding
                            card.classList.remove('selected');

                        } catch (addError) {
                            console.error("Error adding model to scene:", addError);
                        }
                    });

                    // DELETE ASSET BUTTON
                    deleteButton.addEventListener('click', (event) => {
                        event.stopPropagation(); // VERY IMPORTANT
                        console.log('Delete Asset clicked for model ID:', card.getAttribute('model-id'));

                        // Add your logic here to delete the asset from the database
                        // For example:
                        // const assetId = parseInt(card.getAttribute('model-id'));
                        // await deleteAsset(assetId);
                        // card.remove(); // Remove the card from the UI
                    });
                }
            }
        } catch (error) {
            console.error('Could not load asset library: ', error);
        }
    }
});

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

AFRAME.registerComponent('model-entity', {
    init: function () {
        const el = this.el;
        el.setAttribute('class', 'grabbable clickable');

        if (el.getAttribute('model-scale') && el.getAttribute('model-scale') !== "undefined") {
            const scale = parseFloat(el.getAttribute('model-scale'));
            el.setAttribute('scale', `${scale} ${scale} ${scale}`);
            el.object3D.position.y = scale / 2;

        }

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
                uiPanel.setAttribute('html', { html: '#vr-ui-source', cursor: '#mouseCursor' });
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
        var data = this.data;
        var el = this.el;
        var defaultColor = el.getAttribute('material').color;

        // API Endpoints
        const IMAGE_API_URL = 'https://192.168.0.33/image/images/create-image';
        const prompt = document.getElementById('prompt').getAttribute('value');
        console.log(prompt);

        el.addEventListener('mouseenter', function () {
            el.setAttribute('color', data.color);
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
                document.getElementById('error').setAttribute('value', 'Generate an image first');
                return;
            }

            console.log("Sending stored image to model API...");
            const formData = new FormData();
            formData.append('image_file', this.imageToSend, 'seed_image.png');

            try {
                const loadingEl = document.getElementById('loading-image');
                loadingEl.setAttribute('visible', 'true');

                const MODEL_API_URL = 'https://192.168.0.33/model/models/create-from-image';
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

                    const modelUrl = URL.createObjectURL(modelBlob);
                    var new_model = document.createElement('a-entity');
                    new_model.setAttribute('gltf-model', modelUrl);

                    new_model.setAttribute('position', '5 0.5 -5');
                    new_model.setAttribute('class', 'grabbable clickable');
                    new_model.setAttribute('model-entity', '');
                    el.sceneEl.appendChild(new_model);

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

function removeModel() {
    const selectedModelID = document.body.dataset.selectedElementId;
    const selectedModelEl = document.getElementById(selectedModelID);
    selectedModelEl.remove();
    const desktopUi = document.getElementsByClassName('desktop-model-interaction');
    desktopUi[0].style.display = 'none';
}