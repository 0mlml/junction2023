var canvas = document.getElementById("renderCanvas"); // Get the canvas element 
var engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    // Set up camera and light
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // GUI
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Multiplier box
    var multiplierText = new BABYLON.GUI.TextBlock();
    multiplierText.text = "Multiplier: x1.0";
    multiplierText.color = "white";
    multiplierText.fontSize = 24;
    multiplierText.resizeToFit = true;
    multiplierText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    multiplierText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(multiplierText);

    // Queue for previously selected tiles
    var stackPanel = new BABYLON.GUI.StackPanel();
    stackPanel.width = "220px";
    stackPanel.fontSize = "14px";
    stackPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    stackPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(stackPanel);

    // Function to add text to the stack panel (queue)
    function addToQueue(value) {
        var text = new BABYLON.GUI.TextBlock();
        text.text = "Tile: " + value;
        text.height = "30px";
        text.color = "white";
        stackPanel.addControl(text); 
    }

    // Tiles
    for (let i = 0; i < 4; i++) {
        let tile = new BABYLON.GUI.Button.CreateSimpleButton("tile" + i, "?");
        tile.width = "100px";
        tile.height = "100px";
        tile.color = "white";
        tile.background = "grey";
        tile.thickness = 0;
        tile.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

        // Calculate horizontal alignment based on tile index
        tile.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT + i % 2;
        tile.left = i % 2 === 0 ? "30%" : "70%";
        tile.top = i < 2 ? "-50px" : "50px";

        tile.onPointerUpObservable.add(function () {
            // TODO: Replace with the actual call to get the value for the tile
            let value = Math.floor(Math.random() * 100); // Placeholder random value
            this.children[0].text = value.toString();
            addToQueue(value);
        });

        advancedTexture.addControl(tile);
    }

    return scene;
};

var scene = createScene(); //Call the createScene function

engine.runRenderLoop(function () { // Register a render loop to repeatedly render the scene
    scene.render();
});

window.addEventListener("resize", function () { // Watch for browser/canvas resize events
    engine.resize();
});

//const canvas = document.getElementById("renderCanvas"); // Get the canvas element
//const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
//
//window.addEventListener('DOMContentLoaded', () => {
//    var canvas = document.getElementById('renderCanvas');
//    var engine = new BABYLON.Engine(canvas, true);
//
//    var createScene = function () {
//        var scene = new BABYLON.Scene(engine);
//        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
//
//        var camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), scene);
//        camera.attachControl(canvas, true);
//
//        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
//        light.intensity = 0.7;
//
//        // Number display
//        var numberDisplay = document.getElementById('numberDisplay');
//
//        // Slider
//        var slider = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
//        var sliderBar = new BABYLON.GUI.Slider();
//        sliderBar.minimum = 0;
//        sliderBar.maximum = 100;
//        sliderBar.value = 50;
//        sliderBar.height = "20px";
//        sliderBar.width = "200px";
//        sliderBar.top = "-50px";
//        sliderBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
//        sliderBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
//        sliderBar.onValueChangedObservable.add(function(value) {
//            numberDisplay.innerHTML = value.toFixed(2);
//        });
//        slider.addControl(sliderBar);
//
//        return scene;
//    };
//
//});
//
//const scene = createScene(); //Call the createScene function
//// Register a render loop to repeatedly render the scene
//engine.runRenderLoop(() => {
//    scene.render();
//});
//
//// Watch for browser/canvas resize events
//window.addEventListener("resize", () => {
//    engine.resize();
//});
//
//

