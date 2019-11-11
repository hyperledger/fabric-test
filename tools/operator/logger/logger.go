package logger

import (
	"log"
	"os"
	"strings"
)

//INFO -- To print the info logs
func INFO(message ...string) {
	info := log.New(os.Stdout,
		"INFO: ",
		log.Ldate|log.Ltime)
	info.Println(strings.Join(message, ""))
}

//ERROR -- To print the error logs
func ERROR(message ...string) {
	error := log.New(os.Stdout,
		"ERROR: ",
		log.Ldate|log.Ltime)
	error.Println(strings.Join(message, ""))
}
