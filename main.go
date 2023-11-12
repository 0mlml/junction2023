package main

import (
	"log"
	"luckydog/junction2023/game"
	"luckydog/junction2023/net"

	"github.com/gin-gonic/gin"
)

func main() {
	game.CryptoInit()

	go game.UserCuller()

	r := gin.Default()
	net.ServeStatic(r)

	log.Fatal(r.Run(":8080"))
}
