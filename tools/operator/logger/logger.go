package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

func init() {
	loggingSpec := os.Getenv("FABRIC_TEST_LOGGING_SPEC")
	if loggingSpec == "TRACE" {
		logrus.SetReportCaller(true)
	}

	formatter := &logrus.TextFormatter{
		FullTimestamp: true,
	}
	logrus.SetFormatter(formatter)
	logrus.SetLevel(logrus.InfoLevel)
}

func Logger(context string) *logrus.Entry {
	return logrus.WithFields(logrus.Fields{"component": context})
}
