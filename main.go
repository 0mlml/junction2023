package main

import (
	"log"
	"luckydog/ballcancer/game"
	"luckydog/ballcancer/net"

	"github.com/gin-gonic/gin"
)

func main() {
	game.CryptoInit()

	go game.UserCuller()

	r := gin.Default()
	net.ServeStatic(r)

	log.Fatal(r.Run(":8080"))
}
