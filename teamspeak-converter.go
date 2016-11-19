package main

import (
	"log"
	"strconv"
	"strings"
)

type ServerGroupListStruct struct {
	SgId              int
	Name              string
	Type              int
	IconId            int
	SaveDB            int
	SortId            int
	NameMode          int
	ModifyPower       int
	MemberAddPower    int
	MemberRemovePower int
}

func ServerGroupList(response string) []ServerGroupListStruct {
	splitedResponse := strings.Split(response, "|")
	var serverGroups []ServerGroupListStruct
	serverGroups = make([]ServerGroupListStruct, len(splitedResponse))

	for index, entry := range splitedResponse {
		var m map[string]string
		m = make(map[string]string)

		for _, keyPair := range strings.Split(entry, " ") {
			split := strings.SplitN(keyPair, "=", 2)
			if len(split) == 2 {
				m[split[0]] = split[1]
			}
		}

		serverGroups[index] = ServerGroupListStruct{
			SgId:              GetNumber(m, "sgid"),
			Name:              UnescapeString(m, "name"),
			Type:              GetNumber(m, "type"),
			IconId:            GetNumber(m, "iconid"),
			SaveDB:            GetNumber(m, "savedb"),
			SortId:            GetNumber(m, "sortid"),
			NameMode:          GetNumber(m, "namemode"),
			ModifyPower:       GetNumber(m, "n_modifyp"),
			MemberAddPower:    GetNumber(m, "n_member_addp"),
			MemberRemovePower: GetNumber(m, "n_member_removep"),
		}
	}

	return serverGroups
}

func GetNumber(keyMap map[string]string, key string) int {
	var number int
	val, ok := keyMap[key]
	if ok {
		number2, err := strconv.Atoi(val)
		if err != nil {
			log.Fatalf("%s is not a number: %s", key, val)
		}
		number = number2
	}

	return number
}

func EscapeString(keyMap map[string]string, key string) string {
	var text string
	val, ok := keyMap[key]
	if ok {
		escapeList := map[string]string{
			"\\": "\\\\",
			"/":  "\\/",
			" ":  "\\s",
			"|":  "\\p",
			"\a": "\\a",
			"\b": "\\b",
			"\f": "\\f",
			"\n": "\\n",
			"\r": "\\r",
			"\t": "\\t",
			"\v": "\\v",
		}
		text = val
		for k, v := range escapeList {
			text = strings.Replace(text, k, v, -1)
		}
	}
	return text
}

func UnescapeString(keyMap map[string]string, key string) string {
	var text string
	val, ok := keyMap[key]
	if ok {
		unescapeList := map[string]string{
			"\\\\": "\\",
			"\\/":  "/",
			"\\s":  " ",
			"\\p":  "|",
			"\\a":  "\a",
			"\\b":  "\b",
			"\\f":  "\f",
			"\\n":  "\n",
			"\\r":  "\r",
			"\\t":  "\t",
			"\\v":  "\v",
		}
		text = val
		for k, v := range unescapeList {
			text = strings.Replace(text, k, v, -1)
		}
	}
	return text
}
