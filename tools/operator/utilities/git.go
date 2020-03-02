package utilities

import (
	"fmt"

	"gopkg.in/src-d/go-git.v4"
	"gopkg.in/src-d/go-git.v4/config"
	"gopkg.in/src-d/go-git.v4/plumbing"
)

func checkout(branch, path string) error {
	repo, err := git.PlainOpen(path)
	if err != nil {
		return err
	}

	ref := fmt.Sprintf("refs/heads/%s:refs/heads/%s", branch, branch)
	spec := config.RefSpec(ref)
	err = repo.Fetch(&git.FetchOptions{
		RefSpecs: []config.RefSpec{
			spec,
		},
	})
	if err != nil {
		return err
	}

	worktree, _ := repo.Worktree()
	return worktree.Checkout(&git.CheckoutOptions{
		Branch: plumbing.NewBranchReferenceName(branch),
		Force:  true,
	})
}
