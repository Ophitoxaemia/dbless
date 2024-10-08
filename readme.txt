Serverless and Databaseless key-value database API

Used in a production application for 4+ years

There was a breaking change in node between v 14.x and 18.x, so you can't use the latest Lambda node version right now

-For when you only need a little bit of database-

API Gateway with Lambda Proxy Integration <=> Lambda/node.js <=> S3

Shortcut syntax for insert and retrieve:
	Retrieve: { "name2" : ""}
	Insert: { "name2" : "New name"}

Commands:
	List keys: { "$ls" : ""}
	Remove key: { "$rm" : "keyname"}

Multiple keys are executed in order:
	Data: { "name2" : "this is an insert", "name" : ""}
	Returns: {"messages":["Insert name2"],"name":"James"}

Examples: (Blue part is the Invoke URL below)

	curl 'https://0v198999cc.execute-api.us-east-1.amazonaws.com/YourEndpoint' -H 'content-type: application/json' -d '{ "name2" : "New name"}'

		{"messages":["Inserted name2"]}

	curl 'https://0v198999cc.execute-api.us-east-1.amazonaws.com/YourEndpoint' -H 'content-type: application/json' -d '{ "$ls" : "", "name" : ""}'

		{"$ls":["name","name2","name3","someid","someid2"],"name":"James"}

Installation
------------

Note: Todo: Write Terraform to do this

1. Set up S3 bucket
	a. -> IAM -> Roles -> Create new role -> 
	   (Select type of trusted entity) -> AWS service -> Lambda -> Next: Permissions
	b. Create Policy -> JSON -> paste:

{
"Version": "2012-10-17",
"Statement": [
{
    "Sid": "VisualEditor0",
    "Effect": "Allow",
    "Action": [
	"logs:CreateLogStream",
	"logs:PutLogEvents"
    ],
    "Resource": "arn:aws:logs:*:*:*"
},
{
    "Sid": "VisualEditor1",
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": [
	"arn:aws:s3:::YourBucketName",
	"arn:aws:s3:::YourBucketName/*",
	"arn:aws:s3:*:YourAWSAccountNumber:job/*"
    ]
}
]
}
	c. -> Review policy
	d. Fill in Name (this will be used in the Lambda) e.g. dbless-policy
	e. -> Create policy
	
1.5 Create role
	a. Create a role and attach the policy you just created
	b. Name it, e.g. dbless-role

2. Create Lambda
	a. -> Lambda -> Functions -> Create function
	b. -> Author from scratch
	c. fill in Function name 
	d. Permissions -> Choose the execution role you just created
	e. Execution role -> Use an existing role
	f. choose role you created above from dropdown
	g. -> Create function

3. Set up Lambda
	a. Paste the dbless code into the inline editor (change the allowed IP or make available on a private VPC) -> Save
	b. Set Lambda environment variables:
		bucketName		
		folderName

4. Set up the Lambda Proxy Integration

	Goto the API Gateway console

	a. For Choose the Protocol, select REST
	b. For Create API, select New API
	c. Settings -> API Name enter lsp
	d. Click Create API

	Goto the Resources tree

	a. Actions -> Create Resource
	b. In Resource Name, enter db
	c. Click Create Resource

	Goto the resources list, choose /db

	a. Actions menu -> Create method
	b. Pick ANY from the dropdown and click checkmark icon
	c. Select Use Lambda Proxy Integration
	d. Lambda Region -> lpi integratin region
	e. Lambda function -> lpi
	f. Click Save
	g. Click Ok on Add Permission to Lambda Function

	Actions menu -> Deploy API

	a. Deployment stage select New stage
	b. Stage name test
	c. Select Deploy

	The Invoke URL displayed is the url of the API, this is the database URL to replace the endpoint URL in the examples above. Note: the invoke url does not include the stage name, you will have to add it. 
	
== Calling from a browser ==

You can use "await fetch" to call from a web app.

You'll need to configure CORS on the API Gateway:

Benchmarking
------------
	50% of requests completed in under 35ms 
	ab run from an EC2 instance in the same region
	
	Might be faster as an HTTP endpoint instead of REST

License
-------
	See license.txt
