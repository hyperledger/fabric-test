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
	logsToFile, envVariableExists := os.LookupEnv("RedirectLogs")

	if envVariableExists && logsToFile == "true" {
		f, err := os.OpenFile("testlogfile", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
		if err != nil {
			log.Fatalf("error opening file: %v", err)
		}
		defer f.Close()
		info.SetOutput(f)
	}
	info.Println(strings.Join(message, ""))
}

//ERROR -- To print the error logs
func ERROR(message ...string) {
	error := log.New(os.Stdout,
		"ERROR: ",
		log.Ldate|log.Ltime)
	logsToFile, envVariableExists := os.LookupEnv("RedirectLogs")

	if envVariableExists && logsToFile == "true" {
		f, err := os.OpenFile("testlogfile", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
		if err != nil {
			log.Fatalf("error opening file: %v", err)
		}
		defer f.Close()
		error.SetOutput(f)
	}
	error.Println(strings.Join(message, ""))
}
