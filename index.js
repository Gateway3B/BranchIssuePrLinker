const { getInput, setFailed, info, warning } = require('@actions/core');
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
                setFailed('Invalid Event');
        }
    } catch(err) {}
}

async function push() {
    this.branchName = context.ref.replace('refs/heads/', '');

    validateBranchName();
        
    await validateIssue();

    const results = await octokit.rest.pulls.list({
        owner: context.repo.owner, 
        repo: context.repo.repo,
        state: 'open',
        head: this.branchName,
        base: 'develop'
    });

    if(results.data.length === 0) {
        await octokit.rest.pulls.create({
            owner: context.repo.owner,
            repo: context.repo.repo,
            head: this.branchName,
            base: 'develop',
            issue: this.issueNumber
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
        setFailed('Pull request does not exist. Please create pull request.');
        throw err;
    });

    this.branchName = pull.data.head.ref;

    validateBranchName();
        
    await validateIssue();

    if(pull.data.commits > 1) {
        warning('PRs should only have one commit. Please sqaush your commits down.')
    }

    info('Pull Request Validated');
}

function validateBranchName() {
    if(!this.branchName.match(regex)) {
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
        setFailed(`Branch issue number does not exist #${issueNumber}. ex: feature/132/This-Is-A-Feature; Issue #132 does not exist.`);
        throw err;
    });

    info('Issue Number Validated')

    this.issueNumber = issueNumber;
}

action();
