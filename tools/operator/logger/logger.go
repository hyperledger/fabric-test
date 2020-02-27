package logger

import (
	"log"
	"os"
	"strings"

	"github.com/onsi/ginkgo"
)

//INFO -- To print the info logs
func INFO(message ...string) {
	info := log.New(os.Stdout,
		"INFO: ",
		log.Ldate|log.Ltime)
	runTests, envVariableExists := os.LookupEnv("GinkoTests")
	if envVariableExists && runTests == "true" {
		info.SetOutput(ginkgo.GinkgoWriter)
	}
	info.Println(strings.Join(message, ""))
}

//WARNING -- To print the warning logs
func WARNING(message ...string) {
	warning := log.New(os.Stdout,
		"WARNING: ",
		log.Ldate|log.Ltime)
	runTests, envVariableExists := os.LookupEnv("GinkoTests")
	if envVariableExists && runTests == "true" {
		warning.SetOutput(ginkgo.GinkgoWriter)
	}
	warning.Println(strings.Join(message, ""))
}

//ERROR -- To print the error logs
func ERROR(message ...string) {
	error := log.New(os.Stdout,
		"ERROR: ",
		log.Ldate|log.Ltime)
	runTests, envVariableExists := os.LookupEnv("GinkoTests")
	if envVariableExists && runTests == "true" {
		error.SetOutput(ginkgo.GinkgoWriter)
	}
	error.Println(strings.Join(message, ""))
}
