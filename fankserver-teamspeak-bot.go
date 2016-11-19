package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/toqueteos/ts3"
)

func main() {
	conn, err := ts3.Dial(os.Getenv("TEAMSPEAK_PORT_10011_TCP")+":10011", false)
	if err != nil {
		log.Panicf("Teamspeak Connection failed: %s", err)
	}
	defer conn.Close()

	bot(conn)
}

func bot(conn *ts3.Conn) {
	defer conn.Cmd("quit")

	var cmds = []string{
		// Login
		"login serveradmin gameserver2991211...___",
		// Choose virtual server
		"use 1",
		// Update nickname
		`clientupdate client_nickname=My\sBot`,
		// Register to channel id=1 text messages
		"servernotifyregister event=server",
		"servernotifyregister event=textprivate",
	}

	conn.NotifyFunc(notify)

	for _, s := range cmds {
		// Send command and wait for its response
		r, _ := conn.Cmd(s)
		// Display as:
		//     > request
		//     response
		fmt.Printf("> %s\n%s", s, r)
		// Wait a bit after each command so we don't get banned. By default you
		// can issue 10 commands within 3 seconds.  More info on the
		// WHITELISTING AND BLACKLISTING section of TS3 ServerQuery Manual
		// (http://goo.gl/OpJXz).
		time.Sleep(350 * time.Millisecond)
	}

	r, _ := conn.Cmd("servergrouplist")
	fmt.Printf("%v", ServerGroupList(r))

	for {
		time.Sleep(30 * time.Second)
		conn.Cmd("whoami")
	}
}

func notify(a string, b string) {
	fmt.Printf("Notification (%s) (%s)\n", a, b)
}
