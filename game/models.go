package game

import "time"

var (
	users = make(map[string]*User)
)

type User struct {
	Balance int
	Death   int64
}

func (u *User) Play(amount int) bool {
	if u.Balance < amount {
		return false
	}
	u.Balance -= amount
	return true
}

func (u *User) Mod(amount int) {
	u.Balance += amount
}

func (u *User) ShouldCull() bool {
	return u.Death < time.Now().Unix()
}

func GetBalanceByCookie(cookie string) int {
	if user, ok := users[cookie]; ok {
		return user.Balance
	}
	return -1
}

func RemoveUserByCookie(cookie string) {
	delete(users, cookie)
}

func UserCuller() {
	for {
		time.Sleep(time.Second * 15)
		for k, v := range users {
			if v.ShouldCull() {
				delete(users, k)
			}
		}
	}
}
