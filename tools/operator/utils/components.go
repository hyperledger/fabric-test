package utils

import (
	"log"
)

//FatalLogs -- exits out of the code by printng the error
func FatalLogs(message string, err error){
	if err == nil{
		log.Fatalln(message)
	}
	log.Fatalf("%s; err: %s", message, err)
}

//PrintLogs -- prints the logs to the console
func PrintLogs(message string){
	log.Printf("%s", message)
}