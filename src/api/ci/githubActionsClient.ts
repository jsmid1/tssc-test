import { Octokit, workflow, workflowRuns } from '@octokit/rest';

export class GithubActionsClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
      baseUrl: 'https://api.github.com',
    });
  }

  public async getWorkflowRuns(
    owner: string,
    repo: string,
    workflow_id: number
  ): Promise<workflowRuns> {
    const { data: workflowRuns } = await this.octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id,
    });
    return workflowRuns.workflow_runs;
  }

  public async getWorkflows(owner: string, repo: string): Promise<workflow> {
    const { data: workflows } = await this.octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
    });

    return workflows;
  }

  public async getLatestWorkflowRun(
    owner: string,
    repo: string,
    workflow_id: number
  ): Promise<workflowRuns> {
    const workflowRuns = await this.getWorkflowRuns(owner, repo, workflow_id);
    return workflowRuns[0];
  }

  public async getLatestWorkflowRunStatus(
    owner: string,
    repo: string,
    workflow_id: number
  ): Promise<string> {
    const latestWorkflowRun = await this.getLatestWorkflowRun(owner, repo, workflow_id);
    return latestWorkflowRun.conclusion;
  }

  public async getWorkflowId(owner: string, repo: string, workflowName: string): Promise<number> {
    const workflows = await this.getWorkflows(owner, repo);
    const workflow = workflows.find(
      (wf: { name: string; path: string }) => wf.name === workflowName || wf.path === workflowName
    );
    return workflow;
  }
}
