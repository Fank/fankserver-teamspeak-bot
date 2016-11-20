package main

import (
	"log"
	"os"
	"time"

	"github.com/fank/fankserver-teamspeak-bot/ts3interface"
	"github.com/toqueteos/ts3"
)

type Bot struct {
	ts3Conn         *ts3.Conn
	serverGroupList []ts3interface.ServerGroupListStruct
}

func (b *Bot) Connect() {
	conn, err := ts3.Dial(os.Getenv("TEAMSPEAK_PORT_10011_TCP")+":10011", false)
	if err != nil {
		log.Panicf("Teamspeak Connection failed: %s", err)
	}
	b.ts3Conn = conn

	keepAliveTicker := time.NewTicker(time.Second * 5)
	go func() {
		for range keepAliveTicker.C {
			_, err := b.ts3Conn.Cmd("whoami")
			if err.Id > 0 {
				log.Fatalf("whoami failed: %s", err.Msg)
				keepAliveTicker.Stop()
			}
		}
		b.Connect()
	}()

	_, errCmd := b.ts3Conn.Cmd("login serveradmin " + os.Getenv("TEAMSPEAK_PASSWORD"))
	if errCmd.Id > 0 {
		log.Panicf("Teamspeak login failed: %s", errCmd.Msg)
	}
	time.Sleep(350 * time.Millisecond)

	_, errCmd = b.ts3Conn.Cmd("use sid=1")
	if errCmd.Id > 0 {
		log.Panicf("Teamspeak login failed: %s", errCmd.Msg)
	}
	time.Sleep(350 * time.Millisecond)

	_, errCmd = b.ts3Conn.Cmd(`clientupdate client_nickname=My\sBot`)
	if errCmd.Id > 0 {
		log.Panicf("Teamspeak clientupdate failed: %s", errCmd.Msg)
	}
	time.Sleep(350 * time.Millisecond)

	b.ts3Conn.NotifyFunc(func(messageType string, message string) {
		b.notificationHandler(messageType, message)
	})

	_, errCmd = b.ts3Conn.Cmd("servernotifyregister event=server")
	if errCmd.Id > 0 {
		log.Panicf("Teamspeak servernotifyregister failed: %s", errCmd.Msg)
	}
	time.Sleep(350 * time.Millisecond)

	_, errCmd = b.ts3Conn.Cmd("servernotifyregister event=textprivate")
	if errCmd.Id > 0 {
		log.Panicf("Teamspeak servernotifyregister failed: %s", errCmd.Msg)
	}
	time.Sleep(350 * time.Millisecond)
}

func (b *Bot) UpdateServerGroupList() {
	response, err := b.ts3Conn.Cmd("servergrouplist")
	if err.Id > 0 {
		log.Fatalf("Teamspeak servergrouplist update failed: %s", err.Msg)
	} else {
		b.serverGroupList = ts3interface.ServerGroupList(response)
	}
}

func (b *Bot) UpdateClientList() {
	response, err := b.ts3Conn.Cmd("clientlist")
	log.Println(response)
	if err.Id > 0 {
		log.Fatalf("Teamspeak clientlist update failed: %s", err.Msg)
	} else {
		// b.serverGroupList = ts3interface.ServerGroupList(response)
	}
}

func (b *Bot) Run() {
	for {
		time.Sleep(time.Second * 1)
	}
}

func (b *Bot) notificationHandler(messageType string, message string) {
	switch messageType {
	case "notifycliententerview":
		event := ts3interface.NotifyClientEnterView(message)
		log.Printf("Id %d entered\n", event.ClId)
		b.UpdateClientList()
		break
	case "notifyclientleftview":
		event := ts3interface.NotifyClientLeftView(message)
		log.Printf("Id %d left\n", event.ClId)
		b.UpdateClientList()
		break
	case "notifytextmessage":
		break
	default:
		log.Printf("(%s) %s\n", messageType, message)

	}
}
