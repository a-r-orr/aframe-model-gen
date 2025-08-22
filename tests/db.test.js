// Test that error is raised if the DB has not initialised before trying to access it
describe('db.js - DB not initialised', function() {
    this.timeout(5000);

    it('should reject addAsset() when DB not initialised with error message', async function() {
        try {
            await addAsset('test', null, null);
            // If getAsset() succeeds, fail test
            chai.assert.fail('The promise should have been rejected but was fulfilled.');
        } catch (error) {
            // Confirm correct error was raised
            chai.expect(error).to.be.an.instanceOf(Error);
            chai.expect(error.message).to.equal('Database not initialised. Call initDB() first.');
        }
    });

    it('should reject updateModelScale() when DB not initialised with error message', async function() {
        try {
            await updateModelScale(1, 2);
            // If getAsset() succeeds, fail test
            chai.assert.fail('The promise should have been rejected but was fulfilled.');
        } catch (error) {
            // Confirm correct error was raised
            chai.expect(error).to.be.an.instanceOf(Error);
            chai.expect(error.message).to.equal('Database not initialised. Call initDB() first.');
        }
    });

    it('should reject getAsset() when DB not initialised with error message', async function() {
        try {
            await getAsset(1);
            // If getAsset() succeeds, fail test
            chai.assert.fail('The promise should have been rejected but was fulfilled.');
        } catch (error) {
            // Confirm correct error was raised
            chai.expect(error).to.be.an.instanceOf(Error);
            chai.expect(error.message).to.equal('Database not initialised. Call initDB() first.');
        }
    });

    it('should reject getAllAssets() when DB not initialised with error message', async function() {
        try {
            await getAllAssets();
            // If getAsset() succeeds, fail test
            chai.assert.fail('The promise should have been rejected but was fulfilled.');
        } catch (error) {
            // Confirm correct error was raised
            chai.expect(error).to.be.an.instanceOf(Error);
            chai.expect(error.message).to.equal('Database not initialised. Call initDB() first.');
        }
    });

    it('should reject deleteAsset() when DB not initialised with error message', async function() {
        try {
            await deleteAsset(-1);
            // If getAsset() succeeds, fail test
            chai.assert.fail('The promise should have been rejected but was fulfilled.');
        } catch (error) {
            // Confirm correct error was raised
            chai.expect(error).to.be.an.instanceOf(Error);
            chai.expect(error.message).to.equal('Database not initialised. Call initDB() first.');
        }
    });
});

// Test block for db CRUD functions
describe('db.js - CRUD functions', function() {

    this.timeout(5000);

    let fakeImageBlob;
    let fakeModelBlob;

    before(async function() {
        await initDB();

        // Use fake blobs for the test data
        fakeImageBlob = new Blob(['image'], { type: 'image/png' });
        fakeModelBlob = new Blob(['model'], { type: 'model/gltf-binary' });
        
        // Create the asset and store its ID so other tests can use it
        testAssetId = await addAsset('db test model', fakeImageBlob, fakeModelBlob);
        
    });

    after(async function() {
        // Delete from DB after tests are complete
        await deleteAsset(testAssetId);
    });

    it('should add & remove an asset to & from the database correctly', async function() {
        // Adding
        const testAssetId2 = await addAsset('db test model', fakeImageBlob, fakeModelBlob);
        chai.expect(testAssetId2).to.not.be.null;
        //Removing
        await deleteAsset(testAssetId2);
        const deletedAsset = await getAsset(testAssetId2)
        chai.expect(deletedAsset).to.be.undefined;
    });

    it('deleteAsset() should complete without error if the asset id does not exist', async function() {
        await deleteAsset(-1);
    });

    it('should retrieve the correct asset', async function() {
        const newAsset = await getAsset(testAssetId);
        chai.expect(newAsset.prompt).to.equal('db test model');

        const retrievedImageText = await newAsset.imageBlob.text();
        const originalImageText = await fakeImageBlob.text();
        chai.expect(retrievedImageText).to.equal(originalImageText);

        const retrievedModelText = await newAsset.modelBlob.text();
        const originalModelText = await fakeModelBlob.text();
        chai.expect(retrievedModelText).to.equal(originalModelText);
    });

    it('should update the scale of an asset successfully', async function() {
        await updateModelScale(testAssetId, 2);
        const updatedAsset = await getAsset(testAssetId);
        chai.expect(updatedAsset.scale).to.equal(2);
    });

    it('updateModelScale() should throw an error if the provided id does not exist', async function() {
        try {
            await updateModelScale(-1, 2);
        } catch (error) {
            chai.expect(error).to.be.an.instanceOf(Error);
            chai.expect(error.message).to.equal('Asset does not exist.');
        }
    });

    it('getAllAssets() should include the newly added asset', async function() {
        const allAssets = await getAllAssets();
        const foundAsset = allAssets.find(asset => asset.id === testAssetId);

        chai.expect(foundAsset).to.not.be.undefined;
        chai.expect(foundAsset.id).to.equal(testAssetId);
    });


});

