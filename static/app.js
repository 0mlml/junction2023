const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

engine.runRenderLoop(() => {
    scene.render();
});

// Watch for a resize event and resize the canvas accordingly
window.addEventListener("resize", () => {
    engine.resize();
});

const game = {
    currentRound: {
        // The hashchain start point for the round
        chainStartPoint: 0,
        // The wager for the round
        amount: 0,
        // The rolls for the round
        rolls: [],
        // The predetermined net win the round (amount * totalMultiplier)
        net: 0,

        // The index of the current roll in the rolls array
        rollsIndex: 0,
        // The running total of the rolls
        multiplier: 0,
        // Does the multiplier go negative?
        willExplode: false,
    },
    /**
     * @description Fetches the user's money from the server
     * @returns {{money: number, baseMoney: number}} The user's money and the base money
     */
    fetchMoney: () => {
        return fetch("/money").then(async response => {
            return await response.json();
        });
    },
    /**
     * @description Requests a new round from the server
     * @param {number} wager The bet amount for the round
     * @returns {{ error: string }|{ chainStartPoint: number, amount:number, rolls: number[], net: number }} Either an error message or the result of the round
     * @example
     * const result = requestRound(100);
     * if (result.error) {
     *  console.error(result.error);
     * } else {
     *  console.log(`You rolled ${result.rolls} and ${result.net > 0 ? "won" : "lost"} ${result.amount}!`);
     * }
     */
    requestRound: (wager) => {
        return fetch("/round", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: wager })
        }).then(async response => await response.json());
    },
    /**
     * @description Sets the current round using a result from requestRound
     * @param {{ chainStartPoint: number, amount: number, rolls: number[], net: number }} round The result of a round from requestRound
     */
    setRound: (round) => {
        game.currentRound = {
            chainStartPoint: round.chainStartPoint,
            amount: round.amount,
            rolls: round.rolls,
            net: round.net,
            rollsIndex: 0,
            multiplier: 0,
            willExplode: round.rolls.some((_, i) => rolls.slice(0, i + 1).reduce((acc, curr) => acc + curr, 0) < 0),
        };
    },
    /**
     * @description Increments the current round's rollsIndex and multiplier
     * @returns {{ roll: number, newMultiplier: number, didExplode: boolean }} The change in multiplier, new multiplier, and if it was a loss
     */
    incrementRound: () => {
        const roll = game.currentRound.rolls[game.currentRound.rollsIndex];
        game.currentRound.rollsIndex++;
        game.currentRound.multiplier += roll;
        return {
            roll,
            newMultiplier: game.currentRound.multiplier,
            didExplode: game.currentRound.multiplier < 0,
        };
    },
}

const createScene = () => {
    // Set up camera and light
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // GUI
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Multiplier box
    const multiplierText = new BABYLON.GUI.TextBlock();
    multiplierText.text = "Multiplier: x1.0";
    multiplierText.color = "white";
    multiplierText.fontSize = 24;
    multiplierText.resizeToFit = true;
    multiplierText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    multiplierText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(multiplierText);

    // Queue for previously selected tiles
    const stackPanel = new BABYLON.GUI.StackPanel();
    stackPanel.width = "220px";
    stackPanel.fontSize = "14px";
    stackPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    stackPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(stackPanel);

    // Function to add text to the stack panel (queue)
    const addToQueue = (value) => {
        var text = new BABYLON.GUI.TextBlock();
        text.text = "Tile: " + value;
        text.height = "30px";
        text.color = "white";
        stackPanel.addControl(text);
    }

    // Tiles
    for (let i = 0; i < 4; i++) {
        let tile = BABYLON.GUI.Button.CreateSimpleButton("tile" + i, "?");
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
}

createScene();