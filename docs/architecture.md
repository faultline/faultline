# Architecture of faultline

![Architecture](architecture.png)

## Data store on AWS managed services.

faultline store error data in AWS managed services.

### S3 Bucket

faultline put raw error data in JSON format.

#### FaultlineBucket

`/projects/{project}/errors/{message}/occurrences/{reversedUnixtime}.json`

- `{project}` : Project name
- `{message}` : Error message
- `{reversedUnixtime}` : `(Math.pow(2, 53) - 1) - unixtime`

### DynamoDB Table

#### FaultlineTable

| project | message | status | type | lastUpdated | count |
| - | - | - | - | - | - |
| `{project}`| `{message}` | | | | |

- **project** : Project name
- **messsge** : Error message
- **status** : `unresolved` or `resolved`
- **type** : Error type
- **lastUpdated** : `2017-04-07T07:59:39+00:00`
- **count** : Error count

##### Key Schema

- **Partition key (HASH)** : project
- **Sort key (RANGE)** : message

##### Local Secondary Index

- **Partition key (HASH)** : project
- **Sort key (RANGE)** : status

#### FaultlineTableByTimeunit

| key | timestamp | type | count |
| - | - | - | - |
| `{project}##{message}` | | | |

- **key** : `{project}##{message}`
- **timestamp** : timestamp by [timeunit](env.yml)
- **type** : Error type
- **count** : Error count by [timeunit](env.yml)

##### Key Schema

- **Partition key (HASH)** : key
- **Sort key (RANGE)** : timestamp

## API request validation with JSON Hyper-Schema

JSON Hyper-Schema is [here](../schema.json).
