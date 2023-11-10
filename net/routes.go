package net

import (
	"crypto/rand"
	"encoding/base64"
	"log"
	"luckydog/ballcancer/game"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ServeStatic(r *gin.Engine) {
	r.Static("/static", "./static")
	r.StaticFile("/favicon.ico", "./static/favicon.ico")
	r.LoadHTMLFiles("./static/index.html")
	r.GET("/", serveHome)
	r.GET("/money", serveMoney)
	r.POST("/play", handlePlay)
	r.POST("/leave", handleLeave)
}

func randomCookie(n int) string {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		log.Printf("Error generating random cookie: %v", err)
	}
	return base64.URLEncoding.EncodeToString(b)
}

func serveHome(c *gin.Context) {
	// Give bro a cookie
	cookie := randomCookie(32)
	c.SetCookie("brocookie", cookie, 0, "/", "localhost", false, false)

	// Put them in the user map
	game.AddUser(cookie)

	c.HTML(http.StatusOK, "index.html", nil)
}

func serveMoney(c *gin.Context) {
	cookie, err := c.Cookie("brocookie")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"money": game.GetBalanceByCookie(cookie), "baseMoney": game.GetBaseMoney()})
}

type PlayRequest struct {
	Amount float64 `json:"amount"`
}

func handlePlay(c *gin.Context) {
	cookie, err := c.Cookie("brocookie")

	if err != nil {
		// give buddy a cookie
		cookie = randomCookie(32)
		c.SetCookie("brocookie", cookie, 0, "/", "localhost", false, false)
	}

	playRequest := PlayRequest{}

	if err := c.BindJSON(&playRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if playRequest.Amount < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be positive"})
		return
	}

	if game.GetBalanceByCookie(cookie) < playRequest.Amount {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not enough balance"})
		return
	}

	playedGame := game.NewGame(playRequest.Amount)

	log.Printf("User %s played %f, balance: %f\n", cookie, playRequest.Amount, game.GetBalanceByCookie(cookie))

	c.JSON(http.StatusOK, playedGame)
}

func handleLeave(c *gin.Context) {
	cookie, err := c.Cookie("brocookie")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	game.RemoveUserByCookie(cookie)

	log.Println("User left")
}