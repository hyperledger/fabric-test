package logger

import (
	"io"
	"log"
	"os"
	"strings"

	"github.com/onsi/ginkgo"
)

//INFO -- To print the info logs
func INFO(message ...string) {
	writers := io.MultiWriter(os.Stdout, ginkgo.GinkgoWriter)
	info := log.New(writers,
		"INFO: ",
		log.Ldate|log.Ltime)
	info.Println(strings.Join(message, ""))
}

//ERROR -- To print the error logs
func ERROR(message ...string) {
	writers := io.MultiWriter(os.Stdout, ginkgo.GinkgoWriter)
	error := log.New(writers,
		"ERROR: ",
		log.Ldate|log.Ltime)
	error.Println(strings.Join(message, ""))
}
