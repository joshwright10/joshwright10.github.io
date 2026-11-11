---
title: "Seamless NuGet Authentication to Azure DevOps Artifacts from Dockerfile"
date: 2023-08-27
draft: false
tags: ["nuget", "azure-devops", "dotnet", "docker", "azure-devops-artifacts", "pipeline"]
description: "Authenticate multi-stage .NET Docker builds against private Azure Artifacts NuGet feeds using the Azure Artifacts Credential Provider and pipeline job access tokens."
---
When performing .NET multi-stage builds within a Dockerfile, it may be required to restore some artifacts from an Azure DevOps Artifact Feed.
I have previously seen this process achieved by using the [Replace Tokens](https://marketplace.visualstudio.com/items?itemName=qetza.replacetokens) Azure DevOps Task to insert a Personal Access Token (PAT) into the `nuget.config` file during the build pipeline.

This approach requires you to update your `nuget.config` files to include a `<packageSourceCredentials></packageSourceCredentials>` section with a `Username` and `ClearTextPassword` key, and then use token replacement for the values.

#### Example `nuget.config` file with `packageSourceCredentials`

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="InternalNuGetFeed" value="https://pkgs.dev.azure.com/MyOrg/MyProject/_packaging/MyFeed/nuget/v3/index.json" />
  </packageSources>
  <packageSourceCredentials>
    <InternalNuGetFeed>
      <add key="Username" value="#{AZDOBuildAccountEmail}#" />
      <add key="ClearTextPassword" value="#{AZDOBuildAccountPAT}#" />
    </InternalNuGetFeed>
  </packageSourceCredentials>
</configuration>
```

This is a valid approach, but when implemented with manually created PATs stored in Key Vault or Pipeline Library Variables, we see pipeline builds failing every 12 months once the PAT expires. A better approach is to use the Access Token of the Azure DevOps Build Service Account. Also with the token replacement approach, problems arise when trying to run Docker builds locally, as the developer must manually perform the token replacement before running the Docker build and then ensure that they do not commit the updated `nuget.config` file containing the PAT or updated username (which would break the pipeline or leak credentials).

## Solution

We can create a more robust setup by utilising two components:

- [Azure Artifacts Credential Provider](https://github.com/microsoft/artifacts-credprovider)
- Azure DevOps Job Access Token

Full documentation on how to implement the [Azure Artifacts Credential Provider](https://github.com/microsoft/artifacts-credprovider) can be found in [Managing NuGet credentials in Docker scenarios](https://github.com/dotnet/dotnet-docker/blob/main/documentation/scenarios/nuget-credentials.md#using-the-azure-artifact-credential-provider). The technique requires that you update your `Dockerfile` to install the credential provider using cURL and then pass in the Access Token and NuGet Username as Docker build arguments. These are then used to populate the `VSS_NUGET_EXTERNAL_FEED_ENDPOINTS` environment variable within the Dockerfile, which NuGet will use via the credential provider. Multiple feeds can be added, as this is just a standard JSON array. Just be sure to escape the required characters.

```docker
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app

# Setup Artifact Feed Credentials
ARG FEED_ACCESSTOKEN
ARG FEED_USERNAME=MyOrgName

RUN curl -L https://raw.githubusercontent.com/Microsoft/artifacts-credprovider/master/helpers/installcredprovider.sh | sh

ENV VSS_NUGET_EXTERNAL_FEED_ENDPOINTS="{\"endpointCredentials\": [{\"endpoint\":\"https://pkgs.dev.azure.com/MyOrg/MyProject/_packaging/MyFeed/nuget/v3/index.json\", \"username\":\"${FEED_USERNAME}\", \"password\":\"${FEED_ACCESSTOKEN}\"}]}"


# Copy csproj and restore as distinct layers
COPY *.csproj .
COPY ./nuget.config .
RUN dotnet restore

# Copy and publish app and libraries
COPY . .
RUN dotnet publish -c Release -o out --no-restore


FROM mcr.microsoft.com/dotnet/runtime:6.0 AS runtime
WORKDIR /app/
COPY --from=build /app/out ./
ENTRYPOINT ["dotnet", "dotnetapp.dll"]
```

Now when we run `docker build`, we just need to pass in the argument `--build-arg FEED_ACCESSTOKEN=` during the pipeline. For local Docker builds, a developer can provide their PAT via `FEED_ACCESSTOKEN` and optionally pass their Azure DevOps username via `FEED_USERNAME` (the Azure Artifacts Credential Provider accepts any non-empty username when authenticating with a PAT or access token).

### Example Docker Build locally

```bash
docker build -t image/name:latest --build-arg FEED_ACCESSTOKEN=yjs2digmdwpdlefhiccjhq --build-arg FEED_USERNAME=joshua.wright@company.com .
```

## Docker Build Azure DevOps Pipeline Template

Below you can see a sample Azure Pipeline template and the calling pipeline that authenticates with Azure Artifacts and passes the temporary job token into the Docker build.
Many steps have been omitted to stay focused.

```yaml
# template.yaml

################
# AZDO Template to create a Docker Container Image and upload it to ACR.
#
################
# Parameters
################
#
# privateAgentPool
#   (Optional) Name of the private Agent Pool to use.
#   If empty, ubuntu-latest will be used.
#   Default: AZDO-VMSS-LinuxAgentPool01. To override this, set the parameter to the required pool name, or "" to use ubuntu-latest.
#
# dependsOnStage
#   (Optional) List of stages that this template depends upon.
#   Default: empty
#
# imageTag
#   (Optional) Value to tag the Docker image with.
#   Default: $(Build.BuildNumber)
#
# dockerCliVersion
#   (Mandatory) Docker CLI Version to use.
#   Default: ""
#
# dockerRegistryServiceConnection
#   (Mandatory) Service Connection name in Azure DevOps to use to authenticate to Azure Container Registry.
#   Default: ""
#
# imageRepository
#   (Mandatory) Specifies the name of the repository.
#   Default: ""
#
# dockerfilePath
#   (Mandatory) Relative path to the Dockerfile.
#   Default: ""
#
# buildContext
#   (Mandatory) Specifies the path to the build context. Pass ** to indicate the directory that contains the Dockerfile.
#   Default: **
#
# nuGetServiceConnections
#   (Optional) Comma-separated list of NuGet service connection names for feeds outside this organization or collection.
#   For feeds in this organization or collection, leave this blank; the build's credentials are used automatically.
#   Default: ""
#
# Changelog:
#   1.0.0: November 2022, Initial Creation by Joshua Wright

parameters:
  - name: privateAgentPool
    default: "AZDO-VMSS-LinuxAgentPool01"
  - name: dependsOnStage
    type: object
    default: []
  - name: dockerCliVersion
    default: ""
  - name: dockerRegistryServiceConnection
    default: ""
  - name: imageRepository
    default: ""
  - name: dockerfilePath
    default: ""
  - name: buildContext
    default: "**"
  - name: imageTag
    default: "$(Build.BuildNumber)"
  - name: nuGetServiceConnections
    default: ""

stages:
  - stage: Docker_Build
    displayName: Build Docker and Push to ACR
    dependsOn: ${{ parameters.dependsOnStage }}
    variables:
      imageTag: ${{ parameters.imageTag }}
    jobs:
      - job: Docker_Build
        displayName: Docker Build and Push
        # Run on private self-hosted agent and clean the workspace if defined
        ${{ if parameters.privateAgentPool }}:
          pool: ${{ parameters.privateAgentPool }}
          workspace:
            clean: all
        ${{ else }}:
          pool:
            vmImage: "ubuntu-latest"
        steps:
          - checkout: self
            displayName: Checkout Self Repo

          - task: DockerInstaller@0
            displayName: "Install Docker CLI ${{ parameters.dockerCliVersion }}"
            inputs:
              dockerVersion: ${{ parameters.dockerCliVersion }}

          - task: NuGetAuthenticate@1
            displayName: "Authenticate to NuGet"
            inputs:
              nuGetServiceConnections: ${{ parameters.nuGetServiceConnections }}

          - task: Docker@2
            displayName: Build image using Integrated NuGet Authentication
            inputs:
              command: build
              repository: "${{ parameters.imageRepository }}"
              dockerfile: "${{ parameters.dockerfilePath }}"
              containerRegistry: "${{ parameters.dockerRegistryServiceConnection }}"
              arguments: "--build-arg FEED_ACCESSTOKEN=$(VSS_NUGET_ACCESSTOKEN)"
              buildContext: "${{ parameters.buildContext }}"
              tags: |
                $(imageTag)

          - task: Docker@2
            displayName: Push image '${{ parameters.imageRepository }}' to ACR
            inputs:
              command: push
              repository: "${{ parameters.imageRepository }}"
              dockerfile: "${{ parameters.dockerfilePath }}"
              containerRegistry: "${{ parameters.dockerRegistryServiceConnection }}"
              tags: |
                $(imageTag)
```

We use the [NuGetAuthenticate@1](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-authenticate-v1?view=azure-pipelines) task, as this will populate the `VSS_NUGET_ACCESSTOKEN` variable on the build agent and also allow us to authenticate with external feeds if we wish. The `VSS_NUGET_ACCESSTOKEN` variable is later passed to the Docker Build task as the value for the `FEED_ACCESSTOKEN` build argument. Providing the task with an empty `nuGetServiceConnections` parameter generates a token for feeds inside our organisation.

```yaml
# docker_build.yaml
stages:
  - template: template.yaml
    parameters:
      dockerCliVersion: "20.10.21"
      dockerRegistryServiceConnection: "dockerRegistryServiceConnection"
      imageRepository: "myapp"
      dockerfilePath: "Dockerfile" # Expects file in the repo: /Dockerfile
```

```xml
<!-- nuget.config -->
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="InternalNuGetFeed" value="https://pkgs.dev.azure.com/MyOrg/MyProject/_packaging/MyFeed/nuget/v3/index.json" />
  </packageSources>
</configuration>
```

## Azure Artifact Feed Access

As we are taking advantage of the dynamically created Build Service Account used by the Pipeline job, we need to ensure that this service account has been given `Read` permission on the Artifact Feed. You will need to know which scope your Build account is running in. This can be determined based on this article [Access repositories, artifacts, and other resources - Scoped build identities](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/access-tokens?view=azure-devops&tabs=yaml#scoped-build-identities). It will either be `Project Collection Build Service ({OrgName})` or `{Project Name} Build Service ({Org Name})`.
