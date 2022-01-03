const { getInput, setFailed, info, error } = require('@actions/core');
const { getOctokit, context } = require('@actions/github');

const regex = /(feature|bug){1}\/[0-9]+\/[A-Z]{1}([a-z]|[A-Z]|[0-9]|-[A-Z]{1})*/g;
const token = getInput('github-token', { require: true });
const octokit = getOctokit(token);
let branchName;
let issueNumber;

async function action() {
    try {    
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
                error('Invalid Event');
                setFailed('Invalid Event');
        }
    } catch(err) {}
}

async function push() {
    this.branchName = context.ref.replace('refs/heads/', '');

    validateBranchName();
        
    await validateIssue();

    const results = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner, 
        repo: context.repo.repo,
        commit_sha: context.sha
    });

    if(results.data.filter(pr => pr.state === 'open').length === 0) {
        await octokit.rest.pulls.create({
            owner: context.repo.owner,
            repo: context.repo.repo,
            head: branchName,
            base: 'develop',
            issue: issueNumber
        }).catch(err => {
            error('Error Creating Pull Request');
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
        error('Pull request does not exist. Please create pull request.');
        setFailed('Pull request does not exist. Please create pull request.');
        throw err;
    });

    this.branchName = pull.data.head.ref;

    validateBranchName();
        
    await validateIssue();

    if(pull.data.commits > 1) {
        error('PRs can only have one commit. Please sqaush your commits down.')
        setFailed('PRs can only have one commit. Please sqaush your commits down.')
        throw new Error();
    }

    info('Pull Request Validated');
}

function validateBranchName() {
    if(!this.branchName.match(regex)) {
        error('Branch name does not match. ex: feature/132/This-Is-A-Feature');
        setFailed('Branch name does not match. ex: feature/132/This-Is-A-Feature');
        throw new Error();
    }
    info('Branch Name Validated')
}

async function validateIssue() {
    const issueNumber = parseInt(this.branchName.split('/')[1], 10);
    await octokit.rest.issues.get(
        { 
            owner: context.repo.owner, 
            repo: context.repo.repo,
            issue_number: issueNumber
        }
    ).catch(err => {
        error(`Branch issue number does not exist #${issueNumber}. ex: feature/132/This-Is-A-Feature; Issue #132 does not exist.`);
        setFailed(`Branch issue number does not exist #${issueNumber}. ex: feature/132/This-Is-A-Feature; Issue #132 does not exist.`);
        throw err;
    });

    info('Issue Number Validated')

    this.issueNumber = issueNumber;
}

action();
