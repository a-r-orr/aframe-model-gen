describe('Model Lifecycle', function() {
    this.timeout(5000);
    let testAssetId;

    // Runs once for the whole suite
    before(async function() {
        await initDB();
    });

    // These run before and after EACH test
    beforeEach(async function() {
        // Create a fresh asset for every test
        const blob = new Blob(['model'], { type: 'model/gltf-binary' });
        testAssetId = await addAsset('lifecycle test', null, blob);
    });

    afterEach(async function() {
        // Clean up the asset from the scene and DB after every test
        const modelEl = document.getElementById(`model-${testAssetId}`);
        modelEl?.remove();
        await deleteAsset(testAssetId);
    });

    it('should add the model to the scene correctly', async function() {
        const modelID = await addToScene(testAssetId);
        const modelInScene = document.getElementById(modelID);
        chai.expect(modelInScene).to.not.be.null;
    });

    it('should remove the model from the scene using removeModel()', async function() {
        // First, add the model so we have something to remove
        document.body.dataset.selectedElementId = await addToScene(testAssetId);
        
        removeFromScene();
        
        const modelInScene = document.getElementById(`model-${testAssetId}`);
        chai.expect(modelInScene).to.be.null;
    });
});