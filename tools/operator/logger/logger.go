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

//CRIT -- To print the critical error logs and exit
func CRIT(err error, message ...string) {
	crit := log.New(os.Stderr,
		"CRIT: ",
		log.Ldate|log.Ltime)
	if err == nil {
		crit.Fatalln(strings.Join(message, ""))
	}
	crit.Fatalf("%s err: %s", strings.Join(message, ""), err)
}
