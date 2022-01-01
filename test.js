
const { getInput, setFailed } = require('@actions/core');
const { getOctokit, context } = require('@actions/github');

const regex = "/(feature|bug){1}\/[0-9]+\/[A-Z]{1}([a-z]|[A-Z]|[0-9]|-[A-Z]{1})*/g)";
const testToken = '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';
const octokit = getOctokit(testToken);


async function test() {
    const pulls = await octokit.rest.pulls.get(
        { 
            owner: 'Gateway3B', 
            repo: 'donation-engine-backend',
            pull_number: 2
        }
    ).catch(err => {
        core.setFailed('Branch issue number does not exist. ex: feature/132/This-Is-A-Feature; Issue #132 does not exist.');
    });
    
    

    console.log(pulls);
}

test();