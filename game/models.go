package game

import "time"

const (
	baseMoney = 10000
)

func GetBaseMoney() float64 {
	return baseMoney
}

var (
	users = make(map[string]*User)
)

type User struct {
	Balance float64
	Death   int64
}

func (u *User) Play(amount float64) bool {
	if u.Balance < amount {
		return false
	}
	u.Balance -= amount
	return true
}

func (u *User) Mod(amount float64) {
	u.Balance += amount
}

func (u *User) ShouldCull() bool {
	return u.Death < time.Now().Unix()
}

func GetUserByCookie(cookie string) *User {
	if user, ok := users[cookie]; ok {
		return user
	}
	return &User{}
}

func AddUser(cookie string) {
	users[cookie] = &User{
		Balance: baseMoney,
		Death:   time.Now().Unix() + 60,
	}
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
