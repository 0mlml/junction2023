package game

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"sync"
	"time"
)

const (
	// The secret key is used to generate the hash chain.
	// This would be a secret value that only the server knows.
	// It should be published after the game is over to prove that the game was fair.
	secretKey = "superdupercanceroftheballskey"
	// The public seed is used to generate the first hash in the chain.
	// This would be a public value that anyone can see.
	// Make it something that you cannot know in advance (e.g. the hash of a future block in the BTC blockchain).
	publicSeed = "0000000000000000000f3aafaa428b545e2a2cf4a9014228f5fc55019607edc8"
	// The length of the hash chain determines how many games can be played.
	// This should be set to the maximum number of games that you expect to be played.
	chainLength = 1000000
)

var (
	// The hash chain is generated when the server starts.
	hashChain []string
)

// Generates a hash chain of a given length using a secret key and public seed.
// The secret key is used to generate the first hash in the chain.
// Each subsequent hash is generated by combining the secret key with the previous hash.
func GenerateHashChain(secretKey string, publicSeed string, chainLength int) []string {
	hashChain := make([]string, chainLength)
	currentHash := publicSeed

	for i := 0; i < chainLength; i++ {
		// Combine secret key and current hash to generate the next hash
		combined := secretKey + currentHash
		hasher := sha256.New()
		hasher.Write([]byte(combined))
		currentHash = hex.EncodeToString(hasher.Sum(nil))
		hashChain[i] = currentHash
	}

	return hashChain
}

// hexToFloat converts a hexadecimal string to a float64 in the range [0, 1].
func hexToFloat(hexStr string) float64 {
	n := new(big.Int)
	n.SetString(hexStr, 16)
	max := new(big.Int)
	max.Exp(big.NewInt(2), big.NewInt(256), nil)
	f := new(big.Float).SetInt(n)
	f.Quo(f, new(big.Float).SetInt(max))
	result, _ := f.Float64()
	return result
}

// CalculateMultiplier calculates the multiplier for a given roll number.
// Roll 1 - 0.05x to 1.2x
// Roll 2 - -0.2x to 0.8x
// Roll 3 - -0.3x to 0.25x
// Roll 4 and subsequent rolls - -0.3x to (0.3x - 0.05x * (rollNumber - 2)); subtract 0.05x for each subsequent roll
func CalculateMultiplier(rollNumber int, hash string) float64 {
	randomFloat := hexToFloat(hash)

	var min, max float64
	switch rollNumber {
	case 1:
		min, max = 0.05, 1.2
	case 2:
		min, max = -0.2, 0.8
	default:
		max = 0.3 - 0.05*float64(rollNumber-2)
		if max < -0.3 {
			max = -0.3 // Ensure it doesn't go below -0.3
		}
		min = -0.3
	}

	return min + randomFloat*(max-min)
}

// CryptoInit generates the hash chain and prints the multipliers for the first 5 games.
// TODO: Make this a proper init function.
func CryptoInit() {
	// Randomize the seed
	// TODO: Remove, this is for debug
	// publicSeed := fmt.Sprintf("%064x", rand.Int63())

	start := time.Now()
	hashChain = GenerateHashChain(secretKey, publicSeed, chainLength)
	elapsed := time.Since(start)
	fmt.Printf("Generated hash chain of length %d in %s\n", chainLength, elapsed)

	// Reverse the chain
	for i, j := 0, len(hashChain)-1; i < j; i, j = i+1, j-1 {
		hashChain[i], hashChain[j] = hashChain[j], hashChain[i]
	}
}

type Game struct {
	ChainStartPoint int       `json:"chain_start_point"`
	Amount          float64   `json:"amount"`
	Rolls           []float64 `json:"rolls"`
	Net             float64   `json:"net"`
}

var (
	chainIndex = 0
	chainLock  = sync.Mutex{}
)

func NewGame(amount float64) *Game {
	if chainIndex >= chainLength {
		panic("🚨🚨 bruhhhhhhhh🤯🤯🤯🤯🤯🤯🤯 🚨🚨")
	}

	chainLock.Lock()

	rolls := make([]float64, 5)

	for i := 0; i < 5; i++ {
		rolls[i] = CalculateMultiplier(i+1, hashChain[chainIndex])
		chainIndex++
	}

	chainLock.Unlock()

	game := &Game{
		ChainStartPoint: chainIndex,
		Amount:          amount,
		Rolls:           rolls,
		Net:             0,
	}

	game.Net = game.Evaluate()

	return game
}

func (g *Game) Evaluate() float64 {
	total := 0.0
	for _, roll := range g.Rolls {
		total += roll
	}
	return total * float64(g.Amount)
}

// Run a simulation of the game.
// Prints to stdout the number of games won, the winrate, and the average multiplier.
func GameSimulation(count int) {
	won := 0
	totalMultiplier := 0.0
	for j := 0; j < count; j++ {
		total := 0.0
		multipliers := make([]float64, 5)
		for i := 0; i < 5; i++ {
			multiplier := CalculateMultiplier(i+1, hashChain[j*5+i])
			total += multiplier
			multipliers[i] = multiplier
		}
		if total > 1 {
			// fmt.Printf("WIN ")
			won++
		}
		totalMultiplier += total
		// fmt.Printf("Game %d Total: %f ; %v\n", j, total, multipliers)
	}
	fmt.Printf("Won %d out of %d games\n", won, count)
	fmt.Printf("Winrate: %f\n", float64(won)/float64(count))
	fmt.Printf("Average multiplier: %f\n", totalMultiplier/float64(count))
}