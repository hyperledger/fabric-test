// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

package utils

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
)

type YTT struct {
	InputPath  string
	OutputPath string
}

func (y YTT) Args(input []string) []string {
	args := []string{}
	for i:=0; i<len(input); i++{
		args = append(args, []string{"-f", input[i]}...)
	}
	args = append(args, []string{"-f", y.InputPath, y.OutputPath}...)
	return args
}

//DownloadYtt - to download ytt
func DownloadYtt() error {
	if _, err := os.Stat("ytt"); os.IsNotExist(err) {
		name := runtime.GOOS
		url := fmt.Sprintf("https://github.com/k14s/ytt/releases/download/v0.13.0/ytt-%s-amd64", name)

		resp, err := http.Get(url)
		if err != nil {
			PrintLogs("Error while downloading the ytt")
			return err
		}
		defer resp.Body.Close()
		ytt, err := os.Create("ytt")
		if err != nil {
			PrintLogs("Error while creating the ytt file")
			return err
		}
		defer ytt.Close()
		io.Copy(ytt, resp.Body)
		err = os.Chmod("ytt", 0777)
		if err != nil {
			PrintLogs("Failed to change permissions to ytt")
			return err
		}
	}
	return nil
}
