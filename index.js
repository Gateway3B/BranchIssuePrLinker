const { getInput, setFailed, info } = require('@actions/core');
const { getOctokit, context } = require('@actions/github');
const { GitHub } = require('@actions/github/lib/utils');

const regex = /(feature|bug){1}\/[0-9]+\/[A-Z]{1}([a-z]|[A-Z]|[0-9]|-[A-Z]{1})*/g;
const token = getInput('github-token', { require: true });
const octokit = getOctokit(token);
const branchName = context.ref.replace('refs/heads/', '');
let issueNumber;

async function action() {
    try {
        validateBranchName(branchName);
        
        issueNumber = await validateIssue(branchName);
    
        switch(context.eventName) {
            case 'push':
                info('Processing Push');
                await push();
                break;
                
            case 'pull_request':
                info('Processing Pull Request');
                await pullRequest();
                break;
    
            default:
                setFailed('Invalid Event');
        }
    } catch(err) {
        throw err;
    }
}

async function push() {
    const results = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner, 
        repo: context.repo.repo,
        commit_sha: context.sha
    });

    if(results.data.filter(pr => pr.state === 'open').length === 0) {
        octokit.rest.pulls.create({
            owner: context.repo.owner,
            repo: context.repo.repo,
            title: getInput('pr-commit-message', { require: true }),
            head: branchName,
            base: 'develop',
            issue: issueNumber
        }).catch(err => {
            setFailed('Error Creating Pull Request');
            throw err;
        });

        info('New Pull Request Created');
    } else {
        info('Pull Request Already Open');
    }
}

async function pullRequest() {
    const pull = await octokit.rest.pulls.get({
        owner: context.repo.owner, 
        repo: context.repo.repo,
        pull_number: context.payload.pull_request.number
    }).catch(err => {
        core.setFailed('Pull request does not exist. Please create pull request.');
        throw err;
    });

    if(pull.data.commits > 1) {
        setFailed('PRs can only have one commit. Please sqaush your commits down.')
        throw new Error();
    }

    info('Pull Request Validated');
}

function validateBranchName(branchName) {
    if(!branchName.match(regex)) {
        setFailed('Branch name does not match. ex: feature/132/This-Is-A-Feature');
        throw new Error();
    }
    info('Branch Name Validated')
}

async function validateIssue(branchName) {
    const issueNumber = parseInt(branchName.split('/')[1], 10);
    await octokit.rest.issues.get(
        { 
            owner: context.repo.owner, 
            repo: context.repo.repo,
            issue_number: issueNumber
        }
    ).catch(err => {
        setFailed(`Branch issue number does not exist #${issueNumber}. ex: feature/132/This-Is-A-Feature; Issue #132 does not exist.`);
        throw err;
    });

    info('Issue Number Validated')

    return issueNumber;
}

try {
    action();
} catch {
    // setFailed('Internal Action Error');
}
