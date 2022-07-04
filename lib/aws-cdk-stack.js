const { Stack, Duration, aws_iam, aws_ecs, aws_ecs_patterns} = require('aws-cdk-lib');
// const sqs = require('aws-cdk-lib/aws-sqs');

// Stack properties - what region to deploy to
const props = {
  env: {
    region: "ap-northeast-2",
    account: "082700957330",
  }
};

class AwsCdkStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // IAM inline role - the service principal is required
    const taskRole = new aws_iam.Role(this, "dt-fargate-task-role", {
      assumedBy: new aws_iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });

    taskRole.addToPolicy(new aws_iam.PolicyStatement({
      resources: ['*'],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
    }))


    // Define a fargate task with the newly created execution and task roles
    const taskDefinition = new aws_ecs.FargateTaskDefinition(
        this,
        "dt-fargate-task-definition",
        {
          taskRole: taskRole,
          executionRole: taskRole
        }
    );


    // Import a local docker image and set up logger
    const container = taskDefinition.addContainer(
        "dt-fargate-container",
        {
          image: aws_ecs.ContainerImage.fromRegistry(
              "082700957330.dkr.ecr.ap-northeast-2.amazonaws.com/a1"
                ),
          logging: new aws_ecs.AwsLogDriver({
                streamPrefix: "dt-fargate-log-prefix"
          })
          }
    );


    container.addPortMappings({
      containerPort: 3000,
      protocol: aws_ecs.Protocol.TCP
    });


    // NOTE: I've been creating a new VPC in us-east-2 (Ohio) to keep it clean, so se that at the top in stackProps
    // Create a vpc to hold everything - this creates a brand new vpc
    // Remove this if you are using us-east-1 and the existing non-prod vpc as commented out below

    // const vpc = new ec2.Vpc(this, "juna-fargate-vpc", {
    // 	maxAzs: 2,
    // 	natGateways: 1
    // });

    // Create the cluster
    // const cluster = new ecs.Cluster(this, "juna-fargate-cluster", { vpc });
    const cluster = new aws_ecs.Cluster(this, "dt-fargate-cluster");

    // Create a load-balanced Fargate service and make it public
    new aws_ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "dtService",
        {
          cluster: cluster, // Required
          cpu: 256, // Default is 256
          desiredCount: 1, // Default is 1
          taskDefinition: taskDefinition,
          memoryLimitMiB: 512, // Default is 512
          publicLoadBalancer: true // Default is false
        }
    );

    // example resource
    // const queue = new sqs.Queue(this, 'AwsCdkQueue', {
    //   visibilityTimeout: Duration.seconds(300)
    // });
  }
}

module.exports = { AwsCdkStack }
