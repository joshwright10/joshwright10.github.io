---
title: "Create Dynamic Azure DevOps Variable Insertion when using Templates"
date: 2023-03-06
draft: false
tags: ["azure-devops", "pipeline"]
---
There are scenarios where it might be useful to call a template and have that template define variables dynamically based on the provided parameters.
The main use case I have seen for this is when the [Replace Tokens](https://marketplace.visualstudio.com/items?itemName=qetza.replacetokens) Azure DevOps Task is called.
Token replacement can be extremely useful if you have lots of dynamic values that need to be inserted into your configuration based on inputs from the pipeline. For example, when using the same repo for DEV, UAT and PROD.

## Replace Tokens
First, a little background about the Replace Tokens task.  
This task can substitute the values in text files with variables defined in your pipeline. It does this by looking for defined patterns, such as anything between `#{}#` or a custom pattern that you can define yourself. 

This means that you could insert the value `#{myVariable}#` into your configuration file and the value of the Azure DevOps variable `myVariable` would be inserted when the Replace Tokens task runs. The are many configurable parameters with this task, and I encourage you to make yourself familiar with them. I particularly like to set `actionOnMissing` to `fail` as it is usually a mistake if I define a variable in the config file, but then forget to add it to Azure DevOps pipeline. I prefer for my pipeline to fail, rather than deploy with a value not correctly changed.

## Variable Insertion in the Pipeline Template
In order to avoid defining many different variables in your pipeline template, it is possible to simply pass in an object. I add an input parameter named `additionalVariables` to all of my pipeline templates that use token replacement just in case a use case needs an extra variable quickly.

Below you can see a sample Azure Pipeline template and the calling pipeline.
Many steps have been omitted to stay focused. 

```yaml
# template.yaml
parameters:
  - name: aksResourceGroup
    default: ""
  - name: aksClusterName
    default: ""
  - name: additionalVariables
    type: object
    default: {}

stages:
  - stage: Deploy_To_AKS
    variables:
      # This insert syntax creates a variable for each object in the map
      ${{ insert }}: ${{ parameters.additionalVariables }}
      aksResourceGroup: ${{ parameters.aksResourceGroup }}
      aksClusterName: ${{ parameters.aksClusterName }}
    jobs:
      - job: Deploy
        pool:
          vmimage: "ubuntu-latest"
        steps:
          - task: replacetokens@5
            displayName: "Replace Kubernetes Manifest Tokens"
            inputs:
              rootDirectory: "$(Build.SourcesDirectory)/kubernetes"
              targetFiles: |
                **/*.yml
                **/*.yaml
              actionOnMissing: "fail"
```

This is what the calling pipeline would look like. Here we are asking the template to generate the variables `AppDynamicsTier` and `LogLevel` with their respective values.

```yaml
# deploy_to_aks.yaml
stages:
  - template: template.yaml
    parameters:
      aksResourceGroup: "rg-dev01-aks"
      aksClusterName: "aks-dev01"
      azureServiceConnection: "NonProd-Azure"
      additionalVariables:
        AppDynamicsTier: DEV01
        LogLevel: Debug
```

This simple approach of adding an object parameter and the special `${{ insert }}` syntax to the template can make it much for flexible.

## Additional Reading
- [Azure DevOps Template Insertion](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/templates?view=azure-devops#insertion)