package ts3interface

import (
	"log"
	"strconv"
	"strings"

	"github.com/toqueteos/ts3"
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

type NotifyClientEnterViewStruct struct {
	CfId                                  int
	CtID                                  int
	ReasonId                              int
	ClId                                  int
	ClientUniqueIdentifier                string
	ClientNickname                        string
	ClientInputMuted                      int
	ClientOutputMuted                     int
	ClientOutputonlyMuted                 int
	ClientInputHardware                   int
	ClientOutputHardware                  int
	ClientMetaData                        string
	ClientIsRecording                     int
	ClientDatabaseId                      int
	ClientChannelGroupId                  int
	ClientServergroups                    []int
	ClientAway                            int
	ClientAwayMessage                     string
	ClientType                            int
	ClientFlagAvatar                      string
	ClientTalkPower                       int
	ClientTalkRequest                     int
	ClientTalkRequestMsgClientDescription string
	ClientIsTalker                        int
	ClientIsPrioritySpeaker               int
	ClientUnreadMessages                  int
	ClientNicknamePhonetic                string
	ClientNeededServerqueryViewPower      int
	ClientIconId                          int
	ClientIsChannelCommander              int
	ClientCountry                         string
	ClientChannelGroupInheritedChannelId  int
	ClientBadges                          string
}

func NotifyClientEnterView(response string) NotifyClientEnterViewStruct {
	var m map[string]string
	m = make(map[string]string)

	for _, keyPair := range strings.Split(response, " ") {
		split := strings.SplitN(keyPair, "=", 2)
		if len(split) == 2 {
			m[split[0]] = split[1]
		}
	}

	return NotifyClientEnterViewStruct{
		CfId:     GetNumber(m, "cfid"),
		CtID:     GetNumber(m, "ctid"),
		ReasonId: GetNumber(m, "reasonid"),
		ClId:     GetNumber(m, "clid"),
		ClientUniqueIdentifier: UnescapeString(m, "client_unique_identifier"),
		ClientNickname:         UnescapeString(m, "client_nickname"),
		ClientInputMuted:       GetNumber(m, "client_input_muted"),
		ClientOutputMuted:      GetNumber(m, "client_output_muted"),
		ClientOutputonlyMuted:  GetNumber(m, "client_outputonly_muted"),
		ClientInputHardware:    GetNumber(m, "client_input_hardware"),
		ClientOutputHardware:   GetNumber(m, "client_output_hardware"),
		ClientMetaData:         UnescapeString(m, "client_meta_data"),
		ClientIsRecording:      GetNumber(m, "client_is_recording"),
		ClientDatabaseId:       GetNumber(m, "client_database_id"),
		ClientChannelGroupId:   GetNumber(m, "client_channel_group_id"),
		// ClientServergroups:                    []GetNumber(m, "sgid"),
		ClientAway:                            GetNumber(m, "client_away"),
		ClientAwayMessage:                     UnescapeString(m, "client_away_message"),
		ClientType:                            GetNumber(m, "client_type"),
		ClientFlagAvatar:                      UnescapeString(m, "client_flag_avatar"),
		ClientTalkPower:                       GetNumber(m, "client_talk_power"),
		ClientTalkRequest:                     GetNumber(m, "client_talk_request"),
		ClientTalkRequestMsgClientDescription: UnescapeString(m, "client_talk_request_msg"),
		ClientIsTalker:                        GetNumber(m, "client_is_talker"),
		ClientIsPrioritySpeaker:               GetNumber(m, "client_is_priority_speaker"),
		ClientUnreadMessages:                  GetNumber(m, "client_unread_messages"),
		ClientNicknamePhonetic:                UnescapeString(m, "client_nickname_phonetic"),
		ClientNeededServerqueryViewPower:      GetNumber(m, "client_needed_serverquery_view_power"),
		ClientIconId:                          GetNumber(m, "client_icon_id"),
		ClientIsChannelCommander:              GetNumber(m, "client_is_channel_commander"),
		ClientCountry:                         UnescapeString(m, "client_country"),
		ClientChannelGroupInheritedChannelId:  GetNumber(m, "client_channel_group_inherited_channel_id"),
		ClientBadges:                          UnescapeString(m, "client_badges"),
	}
}

type NotifyClientLeftViewStruct struct {
	ClId          int
	CfId          int
	CtId          int
	ReasonId      int
	ReasonMessage string
}

func NotifyClientLeftView(response string) NotifyClientLeftViewStruct {
	var m map[string]string
	m = make(map[string]string)

	for _, keyPair := range strings.Split(response, " ") {
		split := strings.SplitN(keyPair, "=", 2)
		if len(split) == 2 {
			m[split[0]] = split[1]
		}
	}

	return NotifyClientLeftViewStruct{
		ClId:          GetNumber(m, "clid"),
		CfId:          GetNumber(m, "cfid"),
		CtId:          GetNumber(m, "ctid"),
		ReasonId:      GetNumber(m, "reasonid"),
		ReasonMessage: UnescapeString(m, "reasonmsg"),
	}
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
		text = ts3.Unquote(val)
	}
	return text
}

func UnescapeString(keyMap map[string]string, key string) string {
	var text string
	val, ok := keyMap[key]
	if ok {
		text = ts3.Quote(val)
	}
	return text
}
