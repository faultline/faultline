# faultline Environment / config.yml

|  | Environment | config.yml key | default |
| --- | --- | --- | --- |
| Service name | `FAULTLINE_SERVICE_NAME` | `serviceName` | faultline |
| Stage | `FAULTLINE_STAGE` | `stage` | dev |
| AWS deploy region | `FAULTLINE_REGION` | `region` | us-east-1 |
| S3 bucket name | `FAULTLINE_S3_BUCKET_NAME` | `s3BucketName` |  |
| Serverless Framework Deployment bucket | `FAULTLINE_DEPLOYMENT_BUCKET` | `deploymentBucket` |  |
| Dynamodb table prefix | `FAULTLINE_DYNAMODB_TABLE_PREFIX` | `dynamodbTablePrefix` | faultline |
| Dynamodb table suffix | `FAULTLINE_DYNAMODB_TABLE_SUFFIX` | `dynamodbTableSuffix` | `-{env:FAULTLINE_STAGE}` |
| Dynamodb Read Capacity Units | `FAULTLINE_DYNAMODB_READ_CAPACITY_UNITS` | `dynamodbReadCapacityUnits` | 1 |
| Dynamodb Write Capacity Units | `FAULTLINE_DYNAMODB_WRITE_CAPACITY_UNITS` | `dynamodbWriteCapacityUnits` | 1 |
| Error tracking count interval (year / month / day / hour / minute) | `FAULTLINE_TIMEOUT` | `timeunit` | minute |
| faultline API Key for full control (!This is not API Gateway API Key!) | `FAULTLINE_MASTER_API_KEY` | `masterApiKey` | |
| faultline API Key for POST errors only (!This is not API Gateway API Key!) | `FAULTLINE_MASTER_API_KEY` | `clientApiKey` | |
| faultline error data Retention (days / -1 is unlimited) | `FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS` | `errorDataRetentionInDays` | -1 |
| faultline functions CloudWatchLogs Retention (days / -1 is unlimited) | `FAULTLINE_LOG_RETENTION_IN_DAYS` | `logRetentionInDays` | 180 |
| Use AWS KMS Key to encrypt POST params (notifications) | `FAULTLINE_USE_KMS` | `useKms` | 0 |
| AWS KMS Key alias | `FAULTLINE_KMS_KEY_ALIAS` | `kmsKeyAlias` | faultline |
