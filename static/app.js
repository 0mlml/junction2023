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

        // Last roll
        lastRoll: 0,
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
     * @param {number} wager The amount of the wager
     */
    requestRound: async (wager) => {
        const round = await fetch("/play", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: wager })
        }).then(async response => await response.json());

        if (round.error) throw new Error(round.error);

        game.currentRound = {
            chainStartPoint: round.chainStartPoint,
            amount: round.amount,
            rolls: round.rolls,
            net: round.net,
            rollsIndex: 0,
            multiplier: 0,
            willExplode: round.rolls.some((_, i) => round.rolls.slice(0, i + 1).reduce((acc, curr) => acc + curr, 0) < 0),
        };
    },
    /**
     * @description Increments the current round's rollsIndex and multiplier
     * @returns {{ roll: number, newMultiplier: number, didExplode: boolean }} The change in multiplier, new multiplier, and if it was a loss
     */
    incrementRound: () => {
        const roll = game.currentRound.rolls[game.currentRound.rollsIndex];
        game.currentRound.lastRoll = roll;
        game.currentRound.rollsIndex++;
        game.currentRound.multiplier += roll;
        return {
            roll,
            newMultiplier: game.currentRound.multiplier,
            didExplode: game.currentRound.multiplier < 0,
        };
    },
}

const GUI = {
    // The main camera
    camera: null,
    // The main GUI texture 
    texture: null,
    // The text block for the multiplier
    multiplierBlock: null,

    // The current tiles
    tiles: [],
    /**
     * @description Renders the tiles
     * @param {number} dim The dimension of the grid of tiles
     */ 
    renderTiles: (dim) => {
        const onTileClick = (tile) => {
            GUI.tiles.splice(GUI.tiles.indexOf(tile), 1);
            
            const roll = game.incrementRound();

            // TODO: Place the roll # on the tile.
            tile.text = roll.roll;
            tile.onPointerUpObservable.clear();

            // TODO: Generate random roll #s for the other tiles.
            for (const otherTile of GUI.tiles) {
                otherTile.onPointerUpObservable.clear();
            }

            // TODO: Update the multiplier block.
            GUI.multiplierBlock.text = `x${roll.newMultiplier.toFixed(2)}`;

        }

        for (let i = 0; i < dim * dim; i++) {
            const tile = BABYLON.GUI.Button.CreateSimpleButton("tile" + i, "?");
            tile.width = "100px";
            tile.height = "100px";
            tile.color = "white";
            tile.background = "grey";
            tile.thickness = 0;
            tile.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

            tile.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT + i % 2;
            tile.left = i % 2 === 0 ? "30%" : "70%";
            tile.top = i < 2 ? "-50px" : "50px";

            tile.onPointerUpObservable.add(() => onTileClick(tile));

            GUI.texture.addControl(tile);
            GUI.tiles.push(tile);
        }
    }
}

const createScene = () => {
    // Create the scene camera
    GUI.camera = new BABYLON.FreeCamera("main_camera", new BABYLON.Vector3(0, 5, -10), scene);
    GUI.camera.setTarget(BABYLON.Vector3.Zero());

    // Initialize the GUI
    GUI.texture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Initial state of the block
    GUI.multiplierBlock = new BABYLON.GUI.TextBlock();
    GUI.multiplierBlock.text = "xX.X"; // Placeholder text
    GUI.multiplierBlock.color = "white"; // Font color
    GUI.multiplierBlock.background = "black"; // Background color
    GUI.multiplierBlock.fontSize = 24;
    GUI.multiplierBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    GUI.multiplierBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    GUI.texture.addControl(GUI.multiplierBlock);

    return scene;
}

createScene();