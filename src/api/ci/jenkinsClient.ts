import axios, { AxiosInstance } from 'axios';

/**
 * Jenkins build result status enum
 */
export enum JenkinsBuildResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  UNSTABLE = 'UNSTABLE',
  ABORTED = 'ABORTED',
  NOT_BUILT = 'NOT_BUILT',
}

/**
 * Jenkins build trigger type enum
 */
export enum JenkinsBuildTrigger {
  UNKNOWN = 'UNKNOWN',
  PULL_REQUEST = 'PULL_REQUEST',
  PUSH = 'PUSH',
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  API = 'API',
}

/**
 * Basic interface for Jenkins build information
 */
export interface JenkinsBuild {
  id: string; // Unique build identifier
  number: number; // Build number
  url: string; // URL to the build in Jenkins
  displayName: string; // Display name of the build
  fullDisplayName?: string; // Full display name (job name + build number)

  // Status
  building: boolean; // Whether the build is currently running
  result: JenkinsBuildResult | null; // Build result (null if building)

  // Timing
  timestamp: number; // Build start time (milliseconds since epoch)
  duration: number; // Build duration in milliseconds

  // Build details
  actions: any[]; // Actions related to the build (contains SCM info, etc.)
  causes?: Array<{
    // The causes that triggered the build
    shortDescription: string;
    [key: string]: any;
  }>;

  // Trigger information
  triggerType?: JenkinsBuildTrigger; // The type of event that triggered this build

  // Additional useful properties
  description?: string; // Build description
  artifacts?: Array<{
    // Build artifacts
    displayPath: string;
    fileName: string;
    relativePath: string;
  }>;
}

export enum CredentialType {
  SECRET_TEXT = 'Secret text',
  USERNAME_PASSWORD = 'Username with password',
}

interface JenkinsClientConfig {
  baseUrl: string;
  username: string;
  token: string;
}

interface FolderConfig {
  name: string;
  description?: string;
}

export class JenkinsClient {
  private client: AxiosInstance;

  constructor(config: JenkinsClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      auth: {
        username: config.username,
        password: config.token,
      },
      headers: {
        'Content-Type': 'application/xml',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Create a folder in Jenkins
   * @param folderConfig The configuration for the folder
   */
  public async createFolder(folderConfig: FolderConfig): Promise<any> {
    try {
      const folderXml = `<?xml version='1.1' encoding='UTF-8'?>
<com.cloudbees.hudson.plugins.folder.Folder>
  <description>${folderConfig.description || ''}</description>
  <properties/>
  <folderViews/>
  <healthMetrics/>
</com.cloudbees.hudson.plugins.folder.Folder>`;

      const response = await this.client.post(
        `createItem?name=${encodeURIComponent(folderConfig.name)}&mode=com.cloudbees.hudson.plugins.folder.Folder`,
        folderXml
      );
      // Check if the response indicates success
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to create folder: ${response.statusText}`);
      }
      // Return the response data
      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  /**
   * Get information about a job
   * @param jobPath The path to the job (can include folders, e.g., "folder/job")
   */
  public async getJob(jobPath: string): Promise<any> {
    try {
      const formattedPath = jobPath
        .split('/')
        .map(segment => `job/${encodeURIComponent(segment)}`)
        .join('/');

      const response = await this.client.get(`${formattedPath}/api/json`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get job:', error);
      throw error;
    }
  }

  /**
   * Create a job in Jenkins using the workflow-job plugin
   * @param jobName The name of the job to create
   * @param repoUrl The URL of the Git repository
   * @param folderName Optional folder where to create the job. If not provided, job will be created at root level
   * @param branch The branch to build (default: main)
   * @param jenkinsfilePath The path to the Jenkinsfile (default: Jenkinsfile)
   * @param credentialId The credential ID to use (default: GITOPS_AUTH_PASSWORD). If folderName is provided and useFolderScopedCredential is true, the credential will be scoped to the folder.
   * @param useFolderScopedCredential Whether to use folder-scoped credentials (default: false)
   */
  public async createJob(
    jobName: string,
    repoUrl: string,
    folderName?: string,
    branch: string = 'main',
    jenkinsfilePath: string = 'Jenkinsfile',
    credentialId: string = 'GITOPS_AUTH_PASSWORD'
  ): Promise<any> {
    try {
      // Determine the path based on whether folderName is provided
      const path = folderName ? `job/${encodeURIComponent(folderName)}/createItem` : 'createItem';

      // // Construct folder-scoped credential ID if requested and folder is provided
      // let effectiveCredentialId = credentialId;
      // if (folderName && !credentialId.includes('/')) {
      //   // Only prepend the folder path if the credential ID doesn't already contain a path
      //   effectiveCredentialId = `${folderName}/${credentialId}`;
      // }

      const jobConfigXml = `
            <flow-definition plugin="workflow-job@2.40">
                <actions/>
                <description></description>
                <keepDependencies>false</keepDependencies>
                <properties>
                    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
                        <triggers>
                            <com.cloudbees.jenkins.GitHubPushTrigger plugin="github@1.37.1">
                            <spec/>
                            </com.cloudbees.jenkins.GitHubPushTrigger>
                        </triggers>
                    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
                </properties>
                <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps@2.89">
                    <scm class="hudson.plugins.git.GitSCM" plugin="git@4.4.5">
                        <configVersion>2</configVersion>
                        <userRemoteConfigs>
                            <hudson.plugins.git.UserRemoteConfig>
                                <url>${repoUrl}</url>
                                <credentialsId>${credentialId}</credentialsId>
                            </hudson.plugins.git.UserRemoteConfig>
                        </userRemoteConfigs>
                        <branches>
                            <hudson.plugins.git.BranchSpec>
                                <name>*/${branch}</name>
                            </hudson.plugins.git.BranchSpec>
                        </branches>
                        <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
                        <submoduleCfg class="list"/>
                        <extensions/>
                    </scm>
                    <scriptPath>${jenkinsfilePath}</scriptPath>
                    <lightweight>true</lightweight>
                </definition>
                <disabled>false</disabled>
            </flow-definition>
            `;
      const response = await this.client.post(
        `${path}?name=${encodeURIComponent(jobName)}`,
        jobConfigXml,
        {
          headers: {
            'Content-Type': 'application/xml',
          },
        }
      );
      // Check if the response indicates success
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to create job: ${response.statusText}`);
      }
      // Return the response data
      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      console.error('Failed to create job:', error);
      throw error;
    }
  }

  /**
   * Creates a credential in Jenkins using the plain-credentials plugin
   * @param folderName Optional folder where to create the credential. If not provided, credential will be created at root level
   * @param credentialId The ID for the credential
   * @param secretValue The secret value
   * @param credentialType The type of credential (default: CredentialType.SECRET_TEXT), valid options are CredentialType.SECRET_TEXT and CredentialType.USERNAME_PASSWORD
   */
  public async createCredential(
    folderName: string,
    credentialId: string,
    secretValue: string,
    credentialType: CredentialType = CredentialType.SECRET_TEXT
  ): Promise<any> {
    try {
      // The path to create credentials in Jenkins
      const path = folderName
        ? `job/${encodeURIComponent(folderName)}/credentials/store/folder/domain/_/createCredentials`
        : `credentials/store/system/domain/_/createCredentials`;

      // XML for creating secret text credentials using plain-credentials plugin
      let credentialXml;

      if (credentialType === CredentialType.SECRET_TEXT) {
        credentialXml = `
                <org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl plugin="plain-credentials">
                    <scope>GLOBAL</scope>
                    <id>${credentialId}</id>
                    <description>Secret variable for ${credentialId}</description>
                    <secret>${secretValue}</secret>
                </org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>
                `;
      } else if (credentialType === CredentialType.USERNAME_PASSWORD) {
        // For username-password credentials
        const [username, password] = secretValue.split(':');
        credentialXml = `
                <com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
                    <scope>GLOBAL</scope>
                    <id>${credentialId}</id>
                    <description>Credentials for ${credentialId}</description>
                    <username>${username}</username>
                    <password>${password}</password>
                </com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
                `;
      } else {
        throw new Error(`Unsupported credential type: ${credentialType}`);
      }

      const response = await this.client.post(path, credentialXml, {
        headers: {
          'Content-Type': 'application/xml',
        },
      });
      // Check if the response indicates success
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to create credential: ${response.statusText}`);
      }
      // Return the response data
      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      console.error(`Failed to create credential ${credentialId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger a build for a job
   * @param jobName The name of the job to build
   * @param folderName Optional folder where the job is located. If not provided, job is assumed to be at root level
   * @param parameters Optional build parameters
   */
  public async build(
    jobName: string,
    folderName?: string,
    parameters?: Record<string, string>
  ): Promise<any> {
    try {
      // Determine the path based on whether folderName is provided
      const path = folderName
        ? `job/${encodeURIComponent(folderName)}/job/${encodeURIComponent(jobName)}/build`
        : `job/${encodeURIComponent(jobName)}/build`;

      // If parameters are provided, use buildWithParameters endpoint instead
      const endpoint = parameters ? `${path.replace('build', 'buildWithParameters')}` : path;

      const response = await this.client.post(endpoint, null, {
        headers: {
          'Content-Type': 'application/json',
        },
        params: parameters,
      });

      // Check if the response indicates success
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to trigger job: ${response.statusText}`);
      }

      // Return the response data
      return {
        success: true,
        status: response.status,
        data: response.data,
        location: response.headers.location, // Contains the queue item URL
      };
    } catch (error) {
      console.error('Failed to trigger job:', error);
      throw error;
    }
  }

  /**
   * Get information about a build
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located. If not provided, job is assumed to be at root level
   * @returns JenkinsBuild object with build information
   */
  /**
   * Get information about a build
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located. If not provided, job is assumed to be at root level
   * @param includeTriggerInfo Whether to include trigger information (default: false)
   * @returns JenkinsBuild object with build information
   */
  public async getBuild(
    jobName: string,
    buildNumber: number,
    folderName?: string,
    includeTriggerInfo: boolean = false
  ): Promise<JenkinsBuild> {
    try {
      // Determine the path based on whether folderName is provided
      const path = folderName
        ? `job/${encodeURIComponent(folderName)}/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`
        : `job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`;

      const response = await this.client.get(path, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const buildInfo = response.data as JenkinsBuild;

      // Determine trigger type if requested
      if (includeTriggerInfo) {
        buildInfo.triggerType = this.determineBuildTrigger(buildInfo);
      }

      return buildInfo;
    } catch (error) {
      console.error('Failed to get build information:', error);
      throw error;
    }
  }

  /**
   * Get all currently running builds for a job
   * @param jobName The name of the job
   * @param folderName Optional folder where the job is located. If not provided, job is assumed to be at root level
   * @returns Array of running build objects or empty array if none are running
   */
  public async getRunningBuilds(jobName: string, folderName?: string): Promise<JenkinsBuild[]> {
    try {
      // Determine the path based on whether folderName is provided
      const path = folderName
        ? `job/${encodeURIComponent(folderName)}/job/${encodeURIComponent(jobName)}/api/json`
        : `job/${encodeURIComponent(jobName)}/api/json`;

      // Get job information with build data
      const response = await this.client.get(path, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        params: {
          tree: 'builds[number,url]', // Request only the build numbers and URLs
        },
      });

      const runningBuilds = [];

      // If job has builds, check each one to see if it's running
      if (response.data.builds && response.data.builds.length > 0) {
        for (const build of response.data.builds) {
          // Get detailed build information
          const buildDetails = await this.getBuild(jobName, build.number, folderName, false);

          // If the build is currently running, add it to our results
          if (buildDetails.building === true) {
            runningBuilds.push(buildDetails);
          }
        }
      }

      return runningBuilds;
    } catch (error) {
      console.error('Failed to get running builds:', error);
      throw error;
    }
  }

  /**
   * Get the latest build number for a job
   * @param jobName The name of the job
   * @param folderName Optional folder where the job is located
   * @returns The latest build information or null if no builds exist
   */
  public async getLatestBuild(jobName: string, folderName?: string): Promise<JenkinsBuild | null> {
    try {
      // Get job info which includes lastBuild details
      const jobInfo = await this.getJob(folderName ? `${folderName}/${jobName}` : jobName);

      // If there's no lastBuild, return null
      if (!jobInfo.lastBuild) {
        return null;
      }

      // Return the build information
      return await this.getBuild(jobName, jobInfo.lastBuild.number, folderName, false);
    } catch (error) {
      console.error('Failed to get latest build:', error);
      throw error;
    }
  }

  /**
   * Get the console log for a build
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located
   * @param start Optional starting position (byte offset) in the log
   */
  public async getBuildLog(
    jobName: string,
    buildNumber: number,
    folderName?: string,
  ): Promise<string> {
    try {
      const path = folderName
        ? `job/${encodeURIComponent(folderName)}/job/${encodeURIComponent(jobName)}/${buildNumber}/logText/progressiveText`
        : `job/${encodeURIComponent(jobName)}/${buildNumber}/logText/progressiveText`;

      const start: number = 0; // Start from the beginning of the log
      const response = await this.client.get(path, {
        headers: {
          Accept: 'text/plain',
        },
        params: {
          start,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get build log:', error);
      throw error;
    }
  }

  /**
   * Wait for a build to complete with timeout
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located
   * @param timeoutMs Timeout in milliseconds (default: 10 minutes)
   * @param pollIntervalMs Polling interval in milliseconds (default: 5 seconds)
   * @returns The completed build information
   */
  public async waitForBuildCompletion(
    jobName: string,
    buildNumber: number,
    folderName?: string,
    timeoutMs: number = 10 * 60 * 1000,
    pollIntervalMs: number = 5000
  ): Promise<JenkinsBuild> {
    try {
      const startTime = Date.now();
      let buildInfo;

      // Poll until build is complete or timeout
      while (true) {
        buildInfo = await this.getBuild(jobName, buildNumber, folderName, false);

        // Check if build has completed
        if (!buildInfo.building) {
          return buildInfo;
        }

        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Build #${buildNumber} did not complete within the timeout period`);
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    } catch (error) {
      console.error('Error waiting for build completion:', error);
      throw error;
    }
  }

  /**
   * Get the build associated with a specific git commit SHA
   * @param jobName The name of the job
   * @param commitSha The git commit SHA to search for (can be full SHA or shortened)
   * @param folderName Optional folder where the job is located
   * @param maxBuildsToCheck Maximum number of recent builds to check (default: 50)
   * @returns The latest matching build information or null if no match found
   */
  public async getBuildByCommitSha(
    jobName: string,
    commitSha: string,
    folderName?: string,
    maxBuildsToCheck: number = 50
  ): Promise<JenkinsBuild | null> {
    try {
      // Normalize commitSha by trimming and lowercasing
      const normalizedCommitSha = commitSha.trim().toLowerCase();
      console.log(`Looking for build with commit SHA: ${normalizedCommitSha} in job: ${jobName}`);

      // Get job info to access the builds list
      const jobInfo = await this.getJob(folderName ? `${folderName}/${jobName}` : jobName);

      if (!jobInfo.builds || jobInfo.builds.length === 0) {
        console.log(`No builds found for job: ${jobName}`);
        return null;
      }

      console.log(`Found ${jobInfo.builds.length} builds, checking up to ${maxBuildsToCheck}`);

      // Limit the number of builds to check
      const buildsToCheck = jobInfo.builds.slice(0, maxBuildsToCheck);

      // Array to collect all matching builds
      const matchingBuilds: any[] = [];

      // Check each build for the commit SHA
      for (const buildRef of buildsToCheck) {
        console.log(`Checking build #${buildRef.number}`);
        const buildInfo = await this.getBuild(jobName, buildRef.number, folderName, false);
        let isMatch = false;

        // Check if the build has actions containing SCM information
        if (buildInfo.actions) {
          for (const action of buildInfo.actions) {
            // Method 1: Check lastBuiltRevision.SHA1
            if (action._class?.includes('hudson.plugins.git') && action.lastBuiltRevision?.SHA1) {
              const buildSha = action.lastBuiltRevision.SHA1.toLowerCase();
              if (
                buildSha === normalizedCommitSha ||
                buildSha.startsWith(normalizedCommitSha) ||
                normalizedCommitSha.startsWith(buildSha)
              ) {
                console.log(`Found matching commit in lastBuiltRevision: ${buildSha}`);
                isMatch = true;
                break;
              }
            }

            // Method 2: Check buildsByBranchName
            if (action.buildsByBranchName) {
              for (const branch in action.buildsByBranchName) {
                if (action.buildsByBranchName[branch].revision?.SHA1) {
                  const branchSha = action.buildsByBranchName[branch].revision.SHA1.toLowerCase();
                  if (
                    branchSha === normalizedCommitSha ||
                    branchSha.startsWith(normalizedCommitSha) ||
                    normalizedCommitSha.startsWith(branchSha)
                  ) {
                    console.log(
                      `Found matching commit in buildsByBranchName for branch ${branch}: ${branchSha}`
                    );
                    isMatch = true;
                    break;
                  }
                }
              }
              if (isMatch) break;
            }

            // Method 3: Check GIT_COMMIT environment variable in build parameters
            if (action.parameters) {
              for (const param of action.parameters) {
                if (
                  (param.name === 'GIT_COMMIT' || param.name === 'ghprbActualCommit') &&
                  param.value
                ) {
                  const paramSha = param.value.toLowerCase();
                  if (
                    paramSha === normalizedCommitSha ||
                    paramSha.startsWith(normalizedCommitSha) ||
                    normalizedCommitSha.startsWith(paramSha)
                  ) {
                    console.log(
                      `Found matching commit in build parameter ${param.name}: ${paramSha}`
                    );
                    isMatch = true;
                    break;
                  }
                }
              }
              if (isMatch) break;
            }

            // Method 4: Check pull request related information
            if (action._class?.includes('pull-request') && action.pullRequest?.source?.commit) {
              const prSha = action.pullRequest.source.commit.toLowerCase();
              if (
                prSha === normalizedCommitSha ||
                prSha.startsWith(normalizedCommitSha) ||
                normalizedCommitSha.startsWith(prSha)
              ) {
                console.log(`Found matching commit in pull request info: ${prSha}`);
                isMatch = true;
                break;
              }
            }
          }
        }

        if (!isMatch) {
          // Method 5: Check in build causes
          if (buildInfo.causes) {
            for (const cause of buildInfo.causes) {
              if (cause.shortDescription && cause.shortDescription.includes(normalizedCommitSha)) {
                console.log(`Found matching commit in build causes: ${cause.shortDescription}`);
                isMatch = true;
                break;
              }
            }
          }
        }

        if (!isMatch) {
          // Method 6: Check in build display name or description
          if (buildInfo.displayName && buildInfo.displayName.includes(normalizedCommitSha)) {
            console.log(`Found matching commit in build display name: ${buildInfo.displayName}`);
            isMatch = true;
          } else if (buildInfo.description && buildInfo.description.includes(normalizedCommitSha)) {
            console.log(`Found matching commit in build description: ${buildInfo.description}`);
            isMatch = true;
          }
        }

        // If this build matches, add it to our collection
        if (isMatch) {
          matchingBuilds.push(buildInfo);
        }
      }

      // If no matching build was found
      if (matchingBuilds.length === 0) {
        console.log(
          `No builds found matching commit SHA: ${normalizedCommitSha} after checking ${buildsToCheck.length} builds`
        );
        return null;
      }

      // Sort matching builds by build number in descending order to get the latest one first
      matchingBuilds.sort((a, b) => b.number - a.number);

      console.log(
        `Found ${matchingBuilds.length} builds matching commit SHA: ${normalizedCommitSha}, returning the latest: #${matchingBuilds[0].number}`
      );
      return matchingBuilds[0];
    } catch (error) {
      console.error(`Failed to find build by commit SHA ${commitSha}:`, error);
      throw error;
    }
  }

  /**
   * Convert a JenkinsBuild to a Pipeline object
   * This helper method makes it easier to transform a Jenkins build into the standardized Pipeline format
   *
   * @param build The Jenkins build to convert
   * @param repositoryName The name of the repository associated with this build
   * @param logs Optional build logs
   * @param sha Optional git commit SHA that triggered this build
   * @returns A standardized Pipeline object
   */
  public convertBuildToPipeline(
    build: JenkinsBuild,
    jobName: string,
    repositoryName: string,
    logs: string = '',
    sha?: string
  ) {
    // Import required types
    const { Pipeline, PipelineStatus } = require('../../../rhtap/core/integration/ci/pipeline');

    // Map Jenkins build status to standardized PipelineStatus
    let status = PipelineStatus.UNKNOWN;

    if (build.building) {
      status = PipelineStatus.RUNNING;
    } else if (build.result) {
      switch (build.result) {
        case JenkinsBuildResult.SUCCESS:
          status = PipelineStatus.SUCCESS;
          break;
        case JenkinsBuildResult.FAILURE:
          status = PipelineStatus.FAILURE;
          break;
        case JenkinsBuildResult.UNSTABLE:
          status = PipelineStatus.FAILURE; // Map unstable to failure
          break;
        case JenkinsBuildResult.ABORTED:
          status = PipelineStatus.FAILURE; // Map aborted to failure
          break;
        case JenkinsBuildResult.NOT_BUILT:
          status = PipelineStatus.PENDING;
          break;
        default:
          status = PipelineStatus.UNKNOWN;
      }
    }

    // Create a results string from build actions
    const results = JSON.stringify(build.actions || {});

    // Create and return a Pipeline object
    return Pipeline.createJenkinsPipeline(
      jobName,
      build.number,
      status,
      repositoryName,
      logs,
      results,
      build.url,
      sha
    );

    // Create and return a Pipeline object
    return Pipeline.createJenkinsPipeline(
      jobName,
      build.number,
      status,
      repositoryName,
      logs,
      results,
      build.url,
      sha
    );
  }

  /**
   * Determines the trigger type of a Jenkins build
   * @param build The Jenkins build object
   * @returns The identified trigger type
   */
  private determineBuildTrigger(build: JenkinsBuild): JenkinsBuildTrigger {
    // Check if build has actions array
    if (build.actions && Array.isArray(build.actions)) {
      // Look for pull request related information in actions
      for (const action of build.actions) {
        // Check for GitHub/GitLab pull request plugin information
        if (
          action._class?.includes('pull-request') ||
          action._class?.includes('PullRequestAction') ||
          action.pullRequest ||
          (action.parameters &&
            action.parameters.some(
              (p: any) =>
                p.name?.includes('ghpr') || p.name?.includes('pull') || p.name?.includes('PR')
            ))
        ) {
          return JenkinsBuildTrigger.PULL_REQUEST;
        }
      }
    }

    // Check causes for trigger information
    if (build.causes && Array.isArray(build.causes)) {
      for (const cause of build.causes) {
        // Check for pull request related causes
        if (
          cause.shortDescription &&
          (cause.shortDescription.toLowerCase().includes('pull request') ||
            cause.shortDescription.toLowerCase().includes('pr ') ||
            cause._class?.toLowerCase().includes('pullrequest'))
        ) {
          return JenkinsBuildTrigger.PULL_REQUEST;
        }

        // Check for push related causes
        if (
          cause.shortDescription &&
          (cause.shortDescription.includes('push') ||
            cause._class?.includes('GitHubPushCause') ||
            cause._class?.includes('GitLabWebHookCause'))
        ) {
          return JenkinsBuildTrigger.PUSH;
        }

        // Check for manual build causes
        if (
          cause.shortDescription &&
          (cause.shortDescription.includes('Started by user') ||
            cause._class?.includes('UserIdCause'))
        ) {
          return JenkinsBuildTrigger.MANUAL;
        }

        // Check for scheduled build causes
        if (
          cause.shortDescription &&
          (cause.shortDescription.includes('timer') || cause._class?.includes('TimerTrigger'))
        ) {
          return JenkinsBuildTrigger.SCHEDULED;
        }

        // Check for API/remote build causes
        if (
          cause.shortDescription &&
          (cause.shortDescription.includes('remote') || cause._class?.includes('RemoteCause'))
        ) {
          return JenkinsBuildTrigger.API;
        }
      }
    }

    // Default to PUSH if we have git information but couldn't identify as PR
    if (
      build.actions &&
      build.actions.some(
        action =>
          action._class?.includes('git') || action.lastBuiltRevision || action.buildsByBranchName
      )
    ) {
      return JenkinsBuildTrigger.PUSH;
    }

    return JenkinsBuildTrigger.UNKNOWN;
  }

  /**
   * Get the trigger type of a build (Pull Request, Push, etc.)
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located
   * @returns The identified trigger type
   */
  public async getBuildTriggerType(
    jobName: string,
    buildNumber: number,
    folderName?: string
  ): Promise<JenkinsBuildTrigger> {
    const buildInfo = await this.getBuild(jobName, buildNumber, folderName, true);
    return buildInfo.triggerType || JenkinsBuildTrigger.UNKNOWN;
  }

  /**
   * Check if a build was triggered by a pull request
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located
   * @returns True if the build was triggered by a pull request
   */
  public async isBuildTriggeredByPullRequest(
    jobName: string,
    buildNumber: number,
    folderName?: string
  ): Promise<boolean> {
    const triggerType = await this.getBuildTriggerType(jobName, buildNumber, folderName);
    return triggerType === JenkinsBuildTrigger.PULL_REQUEST;
  }

  /**
   * Check if a build was triggered by a push event
   * @param jobName The name of the job
   * @param buildNumber The build number
   * @param folderName Optional folder where the job is located
   * @returns True if the build was triggered by a push event
   */
  public async isBuildTriggeredByPush(
    jobName: string,
    buildNumber: number,
    folderName?: string
  ): Promise<boolean> {
    const triggerType = await this.getBuildTriggerType(jobName, buildNumber, folderName);
    return triggerType === JenkinsBuildTrigger.PUSH;
  }
}
