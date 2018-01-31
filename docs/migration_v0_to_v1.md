# Migration Guide: from v0.x to v1.x

If you are using faultline v0 now, please choice migration method.

## a. Create new faultline v1 stack and copy data

```sh
$ AWS_PROFILE=XXxxXXX npm run deploy
$ [Copy S3 objects]
$ [Copy DynamoDB table records]
```

## b. Use current v0 stack

Set `FAULTLINE_STAGE=v0 FAULTLINE_DYNAMODB_TABLE_SUFFIX=` or Edit config.yml

```sh
$ FAULTLINE_STAGE=v0 FAULTLINE_DYNAMODB_TABLE_SUFFIX= AWS_PROFILE=XXxxXXX npm run deploy
```

```yaml
...

stage: v0
dynamodbTableSuffix: ''

...
```

## FAQ

### Does the API schema change ?

| API HTTP Method | Request Schema | Response Schema |
| --- | --- | --- |
| GET | No | Yes |
| [POST](https://github.com/faultline/faultline/blob/master/docs/api.md#post-projectsprojecterrors) | No | Yes |
| PATCH | No | Yes |
| DELETE | No | Yes |

API Document is [here](api.md) :book: .

### Is it necessary to update SDKs ?

No

### Is it necessary to update WebUI ?

Yes
