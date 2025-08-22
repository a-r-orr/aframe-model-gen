// Test block for wrapText() function
describe('utils.js - wrapText()', function() {

    // The 'it' block is an individual test case.
    // It should describe what the function is expected to do.
    it('should wrap a simple string at a specified length', function() {
        const inputText = 'a cat wearing a wizard hat';
        const maxLength = 10;
        
        // Call the function from utils.js
        const result = wrapText(inputText, maxLength);
        
        // Use Chai's 'expect' to check if the result is correct.
        const expectedOutput = 'a cat\nwearing a\nwizard hat';
        chai.expect(result).to.equal(expectedOutput);
    });

    it('should not wrap text that is shorter than the max length', function() {
        const inputText = 'short text';
        const maxLength = 20;
        
        const result = wrapText(inputText, maxLength);
        
        // We expect the output to be identical to the input.
        chai.expect(result).to.equal(inputText);
    });

    it('should handle an empty string without errors', function() {
        const result = wrapText('', 10);
        chai.expect(result).to.equal('');
    });
});


describe('utils.js - checkVRSupport()', function() {
    // Store the original property descriptor so we can restore it perfectly
    const originalXrDescriptor = Object.getOwnPropertyDescriptor(navigator, 'xr');

    // After each test, restore the original navigator.xr property
    afterEach(function() {
        if (originalXrDescriptor) {
            Object.defineProperty(navigator, 'xr', originalXrDescriptor);
        } else {
            delete navigator.xr;
        }
    });

    it('should return true when VR is supported', async function() {
        // Mock the navigator.xr object
        Object.defineProperty(navigator, 'xr', {
            value: {
                isSessionSupported: async () => true
            },
            configurable: true
        });

        const hasVR = await checkVRSupport();
        chai.expect(hasVR).to.be.true;
    });

    it('should return false when navigator.xr is not present', async function() {
        // Mock the property as undefined
        Object.defineProperty(navigator, 'xr', {
            value: undefined,
            configurable: true
        });

        const hasVR = await checkVRSupport();
        chai.expect(hasVR).to.be.false;
    });
});


describe('utils.js - downloadModel()', function() {
    // This variable will hold the element captured during appendChild
    let capturedElement = null;
    // Store the original appendChild function so we can restore it
    const originalAppendChild = document.body.appendChild;

    // Before each test in this block...
    beforeEach(function() {
        // Replace the real appendChild
        // Instead of adding the element to the page, it just captures it.
        document.body.appendChild = (element) => {
            capturedElement = element;
        };
    });

    // After each test in this block...
    afterEach(function() {
        // Restore the original function to avoid breaking other tests.
        document.body.appendChild = originalAppendChild;
        capturedElement = null; // Reset for the next test
    });

    it('should create a download link with the correct properties', async function() {
        // Setup: We need a fake asset in the DB for this test
        const blob = new Blob(['model data'], { type: 'model/gltf-binary' });
        const assetId = await addAsset('download test', null, blob);

        // Run the function
        await downloadModel(assetId);

        // --- Assertions ---
        // Now, instead of querying the DOM, we check what our spy captured.
        chai.expect(capturedElement).to.not.be.null;
        chai.expect(capturedElement.tagName).to.equal('A');
        chai.expect(capturedElement.download).to.equal('download_test.glb');
        chai.expect(capturedElement.href).to.include('blob:');

        // Cleanup the database
        await deleteAsset(assetId);
    });
});