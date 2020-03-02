package utilities

import (
	"io/ioutil"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"gopkg.in/src-d/go-git.v4"
)

func TestCheckout(t *testing.T) {
	dir, err := ioutil.TempDir("", "fabric-test")
	defer os.RemoveAll(dir)
	assert.NoError(t, err)

	_, err = git.PlainClone(dir, false, &git.CloneOptions{
		URL: "https://github.com/hyperledger/fabric-test",
	})
	assert.NoError(t, err)

	err = checkout("release-1.4", dir)
	assert.NoError(t, err)

	err = checkout("rel-1.3", dir)
	assert.EqualError(t, err, `couldn't find remote ref "refs/heads/rel-1.3"`)

	err = checkout("release-1.4", "/test")
	assert.EqualError(t, err, "repository does not exist")
}
