const { getInput, setFailed, info } = require('@actions/core');
const { getOctokit, context } = require('@actions/github');

const regex = "/(feature|bug){1}\/[0-9]+\/[A-Z]{1}([a-z]|[A-Z]|[0-9]|-[A-Z]{1})*/g";
const token = getInput('github-token', { require: true });
const octokit = getOctokit(token);
const branchName = context.ref.replace('refs/heads/', '');
let issueNumber;

async function action() {
    validateBranchName(branchName);
    
    issueNumber = validateIssue(branchName);

    switch(context.eventName) {
        case 'push':
            info('Processing Push.');
            await push();
            break;
            
        case 'pull_request':
            info('Processing Pull Request.');
            await pullRequest();
            break;

        default:
            setFailed('Invalid Event');
    }
}

async function push() {
    const results = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner, 
        repo: context.repo.name,
        commit_sha: context.sha
    });

    if(results.data.filter(pr => pr.state === 'open').length() === 0) {
        getOctokit(token).rest.pulls.create({
            owner: context.repo.owner, 
            repo: context.repo.name,
            title: getInput('pr-commit-message', { require: true }),
            head: branchName,
            base: 'develop',
            issue: issueNumber
        });
    }
}

async function pullRequest() {
    const pull = await octokit.rest.pulls.get({
        owner: context.repo.owner, 
        repo: context.repo.name,
        pull_number: context.payload.pull_request.number
    }).catch(err => {
        core.setFailed('Pull request does not exist. Please create pull request.');
        throw new Error(err);
    });

    if(pull.data.commits > 1) {
        setFailed('PRs can only have one commit. Please sqaush your commits down.')
        throw new Error();
    }
}

function validateBranchName(branchName) {
    if(!branchName.match(regex)) {
        setFailed('Branch name does not match. ex: feature/132/This-Is-A-Feature');
        throw new Error();
    }
}

async function validateIssue(branchName) {
    const issueNumber = branchName.split('/')[1];
    await getOctokit().rest.issues.get(
        { 
            owner: github.context.payload.repository.owner, 
            repo: github.context.payload.repository.name,
            issue_number: issueNumber
        }
    ).catch(err => {
        setFailed('Branch issue number does not exist. ex: feature/132/This-Is-A-Feature; Issue #132 does not exist.');
        throw err;
    });

    return issueNumber;
}

try {
    action();
    
} catch {
    setFailed('Internal Action Error');
}
