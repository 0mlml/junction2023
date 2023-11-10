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
     * @throws {Error} If the server returns an error
     */
    requestRound: async (wager) => {
        const round = await fetch("/play", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: wager })
        }).then(async response => await response.json());

        if (round.error) {
            throw new Error(round.error);
        }

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
            const tilesNotClicked = GUI.tiles.filter(t => t !== tile);

            const roll = game.incrementRound();

            tile.textBlock.text = `x${roll.roll.toFixed(2)}`;
            tile.onPointerUpObservable.clear();

            for (const otherTile of tilesNotClicked) {
                otherTile.textBlock.text = `x${((Math.random() - 0.3) * -2).toFixed(2)}`
                otherTile.onPointerUpObservable.clear();
            }

            GUI.multiplierBlock.text = `x${roll.newMultiplier.toFixed(2)}`;

            if (roll.didExplode) {
                alert(`gg pal`);
            } else if (game.currentRound.rollsIndex >= game.currentRound.rolls.length) {
                alert(`You won ${game.currentRound.net.toFixed(2)}!`);
            } else {
                GUI.nextRoundButton.isVisible = true;
            }
        }

        for (let i = 0; i < dim * dim; i++) {
            const tile = BABYLON.GUI.Button.CreateSimpleButton("tile" + i, "?");
            tile.width = "100px";
            tile.height = "100px";
            tile.color = "white";
            tile.background = "grey";
            tile.thickness = 0;
            tile.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            tile.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;

            tile.left = i % 2 === 0 ? "-50px" : "50px";
            tile.top = i < 2 ? "90px" : "190px";

            tile.onPointerUpObservable.add(() => onTileClick(tile));

            GUI.texture.addControl(tile);
            GUI.tiles.push(tile);
        }
    },
    // The current wager block
    wagerBlock: null,
    // The play button
    playButton: null,
    /**
     * @description Handles the play button click
     */
    onPlayButtonClick: async () => {
        const wager = parseFloat(GUI.wagerBlock.text);
        if (isNaN(wager) || wager <= 0) return;

        let round = null;
        try {
            round = await game.requestRound(wager);
        } catch (err) {
            console.error(err);
            alert(`An error occurred: ${err.message}`);
            return;
        }

        // Hide the wager block and play button
        GUI.wagerBlock.isVisible = false;
        GUI.playButton.isVisible = false;

        // Update multiplier block
        GUI.multiplierBlock.text = `x0.0`;

        GUI.guiGoNext();
    },
    /**
     * @description Handles starting the next round
     */
    guiGoNext: () => {
        // Kill the last round's tiles
        for (const tile of GUI.tiles) {
            GUI.texture.removeControl(tile);
        }

        // Render the tiles
        GUI.renderTiles(2);
    },
    // The next round button
    nextRoundButton: null,
    /**
     * @description Handles the next round button click
     */
    onNextRoundButtonClick: () => {
        GUI.nextRoundButton.isVisible = false;

        GUI.guiGoNext();
    }
}

const createScene = () => {
    // Create the scene camera
    GUI.camera = new BABYLON.FreeCamera("main_camera", new BABYLON.Vector3(0, 5, -10), scene);
    GUI.camera.setTarget(BABYLON.Vector3.Zero());

    // Initialize the GUI
    GUI.texture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Initial state of the multiplier block
    GUI.multiplierBlock = new BABYLON.GUI.TextBlock();
    GUI.multiplierBlock.text = "xX.X"; // Placeholder text
    GUI.multiplierBlock.color = "white"; // Font color
    GUI.multiplierBlock.background = "black"; // Background color
    GUI.multiplierBlock.fontSize = 24;
    GUI.multiplierBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    GUI.multiplierBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    GUI.texture.addControl(GUI.multiplierBlock);

    // Initial state of the wager block
    GUI.wagerBlock = new BABYLON.GUI.InputText();
    GUI.wagerBlock.width = "300px";
    GUI.wagerBlock.height = "50px";
    GUI.wagerBlock.color = "white";
    GUI.wagerBlock.background = "black";
    GUI.wagerBlock.fontSize = 24;
    GUI.wagerBlock.placeholderText = "Wager";
    GUI.wagerBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    GUI.wagerBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    GUI.texture.addControl(GUI.wagerBlock);

    // Initial state of the play button
    GUI.playButton = BABYLON.GUI.Button.CreateSimpleButton("play_button", "Play");
    GUI.playButton.width = "300px";
    GUI.playButton.height = "50px";
    GUI.playButton.color = "white";
    GUI.playButton.background = "black";
    GUI.playButton.fontSize = 24;
    GUI.playButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    GUI.playButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    GUI.playButton.top = "100px";
    GUI.playButton.onPointerUpObservable.add(GUI.onPlayButtonClick);
    GUI.texture.addControl(GUI.playButton);

    // Initial state of the next round button
    GUI.nextRoundButton = BABYLON.GUI.Button.CreateSimpleButton("next_round_button", "Next Round");
    GUI.nextRoundButton.width = "300px";
    GUI.nextRoundButton.height = "50px";
    GUI.nextRoundButton.color = "white";
    GUI.nextRoundButton.background = "black";
    GUI.nextRoundButton.fontSize = 24;
    GUI.nextRoundButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    GUI.nextRoundButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    GUI.nextRoundButton.top = "320px";
    GUI.nextRoundButton.isVisible = false;
    GUI.nextRoundButton.onPointerUpObservable.add(GUI.onNextRoundButtonClick);
    GUI.texture.addControl(GUI.nextRoundButton);

    return scene;
}

createScene();