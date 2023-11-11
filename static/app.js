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
    money: {
        balance: 0,
        lastChange: 0,
    },
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
            const { money, baseMoney } = await response.json();
            game.money.balance = money;
            return { money, baseMoney };
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
        game.money.lastChange = roll * game.currentRound.amount;
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
    // The bg camera
    bgCamera: null,
    // Anchor
    anchor: null,
    // 3D Manager
    manager: null,
    // The texture
    texture: null,
    // The text block for the multiplier
    multiplierBlock: null,
    // Tile cylinder panel
    tilePanel: null,
    // The current tiles
    tiles: [],
    /**
     * @description Renders the tiles
     * @param {number} dim The dimension of the grid of tiles
     */
    renderTiles: (dim) => {
        const onTileClick = async (tile) => {
            const tilesNotClicked = GUI.tiles.filter(t => t !== tile);

            const roll = game.incrementRound();

            GUI.updateMoneyCounter();

            tile.content.text = `x${roll.roll.toFixed(2)}`;
            tile.plateMaterial.diffuseColor = roll.roll < 0 ? BABYLON.Color3.FromHexString("#AA5555") : BABYLON.Color3.FromHexString("#55AA55");
            tile.onPointerUpObservable.clear();

            for (const otherTile of tilesNotClicked) {
                otherTile.content.text = `x${((Math.random() * 1.5) - 0.5).toFixed(2)}`
                otherTile.plateMaterial.diffuseColor = BABYLON.Color3.FromHexString("#222");
                otherTile.onPointerUpObservable.clear();
            }

            if (roll.roll > 0) {
                await GUI.tileExplosion();
                GUI.tilePanel.position.z = -2;
            }

            GUI.multiplierBlock.text = `x${roll.newMultiplier.toFixed(2)}`;

            if (roll.didExplode) {
                alert(`Instant death condition (multiplier < 0) reached. You lost ${game.currentRound.amount}€.)`);
                
                GUI.wagerBlock.top = "-150px";
                GUI.wagerBlock.isVisible = true;
                GUI.playButton.top = "150px";
                GUI.playButton.isVisible = true;

                game.fetchMoney().then(_ => {
                    GUI.updateMoneyCounter();
                });
            } else if (game.currentRound.rollsIndex >= game.currentRound.rolls.length) {
                GUI.wagerBlock.top = "-150px";
                GUI.wagerBlock.isVisible = true;
                GUI.playButton.top = "150px";
                GUI.playButton.isVisible = true;

                game.fetchMoney().then(_ => {
                    GUI.updateMoneyCounter();
                });
            } else {
                GUI.nextRoundButton.isVisible = true;
            }
        }

        GUI.tilePanel.blockLayout = true;
        GUI.tilePanel.columns = dim;


        const centerIndex = dim % 2 === 0 ? -1 : Math.floor(dim * dim / 2);

        for (let i = 0; i < dim * dim; i++) {
            const tile = new BABYLON.GUI.HolographicButton("tile" + i);
            tile.width = "200px";
            tile.height = "200px";
            tile.color = "white";
            tile.thickness = 0;
            tile.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            tile.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            tile.left = i % 2 === 0 ? "-50px" : "50px";
            tile.top = i < 2 ? "90px" : "190px";

            GUI.tiles.push(tile);
            GUI.tilePanel.addControl(tile);

            if (i === centerIndex) {
                tile.isVisible = false;
                continue;
            }

            tile.plateMaterial.alphaMode = BABYLON.Engine.ALPHA_ONEONE;
            tile.plateMaterial.diffuseColor = BABYLON.Color3.FromHexString("#555555");

            tile.onPointerUpObservable.add(() => onTileClick(tile));

            const textBlock = new BABYLON.GUI.TextBlock();
            textBlock.text = "?";
            textBlock.color = "white";
            textBlock.fontSize = 64;
            tile.content = textBlock;
        }
        GUI.tilePanel.blockLayout = false;
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

        try {
            await game.requestRound(wager);
        } catch (err) {
            console.error(err);
            alert(`An error occurred: ${err.message}`);
            return;
        }

        game.money.balance -= wager;

        GUI.updateMoneyCounter();

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
            GUI.manager.removeControl(tile);
            tile.dispose();
        }

        // Render the tiles
        GUI.renderTiles(game.currentRound.rollsIndex + 2);
    },
    // The next round button
    nextRoundButton: null,
    /**
     * @description Handles the next round button click
     */
    onNextRoundButtonClick: () => {
        GUI.nextRoundButton.isVisible = false;

        GUI.guiGoNext();
    },
    /**
     * @description Tile explosion animation
     * @returns {Promise<void>}
     */
    tileExplosion: async () => {
        return new Promise(r => {
            const start = performance.now();
            const duration = 200;
            const scalar = 3;

            const initialZ = GUI.tilePanel.position.z; // Fetch the initial z position

            const render = () => {
                const now = performance.now();
                const progress = (now - start) / duration * Math.PI;

                // Interpolate z position
                GUI.tilePanel.position.z = initialZ * Math.sin(progress) * scalar;

                if ((now - start) / duration < 1) {
                    requestAnimationFrame(render);
                } else {
                    GUI.tilePanel.position.z = initialZ; // Reset to initial z position
                    r();
                }
            }
            render();
        });
    },
    // The money display
    moneyDisplay: null,
    // The money counter
    moneyCounter: null,
    /**
     * @description Updates the money counter
     */
    updateMoneyCounter: async () => {
        GUI.moneyDisplay.text = `${game.money.balance.toFixed(2)}€`;

        GUI.moneyCounter.text = `${game.currentRound.amount}€x${game.currentRound.multiplier.toFixed(2)} = ${(game.currentRound.multiplier * game.currentRound.amount).toFixed(2)}€`;

        if (game.money.lastChange === 0) return;

        const moneyChangeBlock = new BABYLON.GUI.TextBlock();
        moneyChangeBlock.text = `${game.money.lastChange > 0 ? "+" : ""}${game.money.lastChange.toFixed(2)}€`;
        moneyChangeBlock.color = game.money.lastChange > 0 ? "green" : "red";
        moneyChangeBlock.fontSize = 24;
        moneyChangeBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        moneyChangeBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        moneyChangeBlock.top = "-40%";
        GUI.texture.addControl(moneyChangeBlock);

        game.money.lastChange = 0;

        setTimeout(() => {
            GUI.texture.removeControl(moneyChangeBlock);
            moneyChangeBlock.dispose();
        }, 1500);
    }
}

const createScene = () => {
    // Create the scene camera
    GUI.camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 2, 10, BABYLON.Vector3.Zero());
    GUI.bgCamera = new BABYLON.ArcRotateCamera("bgcam", -Math.PI / 2, Math.PI / 2, 10, BABYLON.Vector3.Zero());

    const renderPipeline = new BABYLON.DefaultRenderingPipeline("renderingPipeline", true, scene, [GUI.camera]);
    renderPipeline.samples = 4;
    renderPipeline.fxaaEnabled = true;

    GUI.camera.wheelDeltaPercentage = 0.01;

    GUI.anchor = new BABYLON.TransformNode("");

    // Make a bg camera to render the GUI in front
    GUI.texture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    GUI.texture.layer.layerMask = 1 << 7;
    GUI.bgCamera.layerMask = 1 << 7;

    // Initialize the GUI manager
    GUI.manager = new BABYLON.GUI.GUI3DManager(scene);
    GUI.manager.utilityLayer.setRenderCamera(GUI.camera);

    scene.activeCameras = [GUI.camera, GUI.bgCamera];

    // Create the tile panel
    GUI.tilePanel = new BABYLON.GUI.CylinderPanel();
    GUI.tilePanel.margin = 0.3;
    GUI.tilePanel.linkToTransformNode(GUI.anchor);
    GUI.manager.addControl(GUI.tilePanel);
    GUI.tilePanel.position.z = -2;

    // Initial state of the money display
    GUI.moneyDisplay = new BABYLON.GUI.TextBlock();
    GUI.moneyDisplay.text = "0.00€";
    GUI.moneyDisplay.color = "white";
    GUI.moneyDisplay.background = "black";
    GUI.moneyDisplay.fontSize = 24;
    GUI.moneyDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    GUI.moneyDisplay.left = "40%";
    GUI.moneyDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    GUI.moneyDisplay.top = "-45%";
    GUI.texture.addControl(GUI.moneyDisplay);

    // Initial state of the money counter
    GUI.moneyCounter = new BABYLON.GUI.TextBlock();
    GUI.moneyCounter.text = "0.00€";
    GUI.moneyCounter.color = "white";
    GUI.moneyCounter.background = "black";
    GUI.moneyCounter.fontSize = 24;
    GUI.moneyCounter.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    GUI.moneyCounter.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    GUI.moneyCounter.top = "-45%";
    GUI.texture.addControl(GUI.moneyCounter);

    game.fetchMoney().then(_ => {
        GUI.updateMoneyCounter();
    });

    // Initial state of the multiplier block
    GUI.multiplierBlock = new BABYLON.GUI.TextBlock();
    GUI.multiplierBlock.text = "x0.0"; // Placeholder text
    GUI.multiplierBlock.color = "white"; // Font color
    GUI.multiplierBlock.background = "black"; // Background color
    GUI.multiplierBlock.fontSize = 72;
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

    console.info("Initialized GUI")

    return scene;
}

createScene();