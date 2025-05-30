import { KubeClient } from '../../../../../../src/api/ocp/kubeClient';
import { GithubActionsClient } from '../../../../../api/ci/githubActionsClient';
import { PullRequest } from '../../git/models';
import { BaseCI } from '../baseCI';
import { CIType, EventType, Pipeline, PipelineStatus } from '../ciInterface';

export class GitHubActionsCI extends BaseCI {
<<<<<<< Updated upstream
  public getPipelineLogs(pipeline: Pipeline): Promise<string> {
    throw new Error('Method not implemented.');
  }
  public getIntegrationSecret(): Promise<Record<string, string>> {
    throw new Error('Method not implemented.');
  }
  private component: string;

  public override getPipeline(
=======
  private githubActionsClient: GithubActionsClient;
  private component: string;

  constructor(component: string, kubeClient: KubeClient, token: string) {
    super(CIType.GITHUB_ACTIONS, kubeClient);
    this.githubActionsClient = new GithubActionsClient(token);
    this.component = component;
  }

  public getPipeline(
    owner: string,
>>>>>>> Stashed changes
    pullRequest: PullRequest,
    pipelineStatus: PipelineStatus,
    eventType?: EventType
  ): Promise<Pipeline | null> {
    if (!pullRequest.repository) {
      console.error('Repository information is missing in the pull request');
      return Promise.resolve(null);
    }
    if (!pipelineStatus) {
      throw new Error('Pipeline status is required');
    }
    if (!eventType) {
      console.warn(
        'Event type is required for GitHub Actions pipelines, defaulting to PULL_REQUEST'
      );
      eventType = EventType.PULL_REQUEST;
    }

    this.githubActionsClient.getWorkflowRuns(pullRequest.repository)

    throw new Error('Method not implemented.');
  }
  protected override checkPipelineStatus(pipeline: Pipeline): Promise<PipelineStatus> {
    if (!pipeline) {
      throw new Error('Pipeline is not defined');
    }
    throw new Error('Method not implemented.');
  }
  public override waitForAllPipelinesToFinish(): Promise<void> {
    if (!this.component) {
      throw new Error('Component is not defined');
    }
    throw new Error('Method not implemented.');
  }

  public override async getWebhookUrl(): Promise<string> {
    // GitHub Actions does not support webhooks in the same way as other CI systems.
    throw new Error(
      'GitHub Actions does not support webhooks in the same way as other CI systems.'
    );
  }
}
