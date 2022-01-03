# Branch Issue Pr Linker

This action has several functions to keep branches, issues, and prs linked together.

## On Push

On a push this action will validate the branch name against this format:

`{feature/bug}/{issue number}/This-Is-A-Feature-Or-A-Bug`

It will search for open issues on your repository for the issue with the corresponding issue number.

### On Successful Validation

On seccessful validation of both branch name and issue number, the action will search for existing pull requests with this branch.

If a pull request does not already exist, it will create a pull request from your branch to the assumed `develop` branch with the passed in message. We recommend passing in the commit message.

## On Pull Request

On a pull request this action will validate the branch name against this format:

`{feature/bug}/{issue number}/This-Is-A-Feature-Or-A-Bug`

It will also assert only one commit in the pull request.

## Inputs

### `github-token`

**Required** The github token provided by the action.

## Example Usage

```
uses: Gateway3B/BranchIssuePrLinker@master
with:
    github-token: ${{ github.token }}
```