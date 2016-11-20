package main

func main() {
	bot := Bot{}

	bot.Connect()
	bot.UpdateServerGroupList()
	bot.Run()
}

// func bot(conn *ts3.Conn) {
// 	defer conn.Cmd("quit")
//
// 	var cmds = []string{
// 		// Login
// 		"login serveradmin gameserver2991211...___",
// 		// Choose virtual server
// 		"use 1",
// 		// Update nickname
// 		`clientupdate client_nickname=My\sBot`,
// 		// Register to channel id=1 text messages
// 		"servernotifyregister event=server",
// 		"servernotifyregister event=textprivate",
// 	}
//
// 	conn.NotifyFunc(notify)
//
// 	for _, s := range cmds {
// 		// Send command and wait for its response
// 		r, _ := conn.Cmd(s)
// 		// Display as:
// 		//     > request
// 		//     response
// 		fmt.Printf("> %s\n%s", s, r)
// 		// Wait a bit after each command so we don't get banned. By default you
// 		// can issue 10 commands within 3 seconds.  More info on the
// 		// WHITELISTING AND BLACKLISTING section of TS3 ServerQuery Manual
// 		// (http://goo.gl/OpJXz).
// 		time.Sleep(350 * time.Millisecond)
// 	}
//
// 	r, _ := conn.Cmd("servergrouplist")
// 	fmt.Printf("%v", ts3interface.(r))
//
// 	for {
// 		time.Sleep(30 * time.Second)
// 		conn.Cmd("whoami")
// 	}
// }
//
// func notify(a string, b string) {
// 	fmt.Printf("Notification (%s) (%s)\n", a, b)
// }
