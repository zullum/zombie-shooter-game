const { Octokit } = require("@octokit/rest");
const fs = require('fs').promises;
const path = require('path');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function createRepo() {
  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: 'next-js-project',
      private: false,
      description: 'A Next.js project created with shadcn/ui'
    });
    return data.html_url;
  } catch (error) {
    console.error('Error creating repository:', error.message);
    process.exit(1);
  }
}

async function pushToGitHub(repoUrl) {
  try {
    const dir = process.cwd();
    await git.init({ fs, dir });
    await git.add({ fs, dir, filepath: '.' });
    await git.commit({
      fs,
      dir,
      message: 'Initial commit',
      author: {
        name: 'WebContainer User',
        email: 'user@example.com'
      }
    });
    await git.addRemote({ fs, dir, remote: 'origin', url: repoUrl });
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({ username: process.env.GITHUB_TOKEN })
    });
    console.log('Successfully pushed to GitHub!');
  } catch (error) {
    console.error('Error pushing to GitHub:', error.message);
  }
}

async function run() {
  if (!process.env.GITHUB_TOKEN) {
    console.error('Please set the GITHUB_TOKEN environment variable.');
    process.exit(1);
  }
  const repoUrl = await createRepo();
  await pushToGitHub(repoUrl);
  console.log('Repository URL:', repoUrl);
}

run();