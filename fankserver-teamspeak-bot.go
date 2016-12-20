package main

import (
	"log"
	"os"

	"github.com/fank/ts3"
)

func main() {
	client, err := ts3.NewClient(os.Getenv("TEAMSPEAK_PORT_10011_TCP") + ":10011")
	if err != nil {
		log.Fatal(err)
	}

	// This a test user account
	_, err = client.Exec(ts3.Login("serveradmin", os.Getenv("TEAMSPEAK_PASSWORD")))
	if err != nil {
		log.Fatal(err)
	}

	_, err = client.Exec(ts3.Select(1))
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Clients:")
	err = client.WalkClients(func(idx int, client map[string]string) {
		log.Printf("%s", client)
		// if nick, ok := client["client_nickname"]; ok && nick == "Nathan" {
		// 	// nathanIsOnline = true
		// }
	})
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Channels:")
	channelList, err := client.Exec(ts3.ChannelList())
	if err != nil {
		log.Fatal(err)
	}

	log.Println(channelList)

	client.Close()
}
