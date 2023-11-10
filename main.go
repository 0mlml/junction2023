package main

import (
	"luckydog/ballcancer/game"
	"luckydog/ballcancer/net"

	"github.com/gin-gonic/gin"
)

func main() {
	game.CryptoInit()

	go game.UserCuller()

	r := gin.Default()
	net.ServeStatic(r)

	r.Run()
}
