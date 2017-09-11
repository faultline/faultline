# faultline Environment / config.yml

|  | Environment | config.yml key | default |
| --- | --- | --- | --- |
| Service name | `FAULTLINE_SERVICE_NAME` | `serviceName` | faultline |
| AWS deploy region | `FAULTLINE_REGION` | `region` | ap-northeast-1 |
| S3 bucket name | `FAULTLINE_S3_BUCKET_NAME` | `s3BucketName` |  |
| Dynamodb table prefix | `FAULTLINE_DYNAMODB_TABLE_PREFIX` | `dynamodbTablePrefix` | faultline |
| Error tracking count interval (year / month / day / hour / minute) | `FAULTLINE_TIMEOUT` | `timeunit` | minute |
| faultline API Key for full control (!This is not API Gateway API Key!) | `FAULTLINE_MASTER_API_KEY` | `masterApiKey` | |
| faultline API Key for POST errors only (!This is not API Gateway API Key!) | `FAULTLINE_MASTER_API_KEY` | `clientApiKey` | |
| faultline functions CloudWatchLogs Retention (days / -1 is unlimited) | `FAULTLINE_LOG_RETENTION_IN_DAYS` | `logRetentionInDays` | 180 |
| Use AWS KMS Key to encrypt POST params (notifications) | `FAULTLINE_USE_KMS` | `useKms` | 0 |
| AWS KMS Key alias | `FAULTLINE_KMS_KEY_ALIAS` | `kmsKeyAlias` | faultline |
