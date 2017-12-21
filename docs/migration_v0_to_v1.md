# Migration Guide: from v0.x to v1.x

If you are using faultline v0 now, Set `FAULTLINE_STAGE=v0`.

```sh
$ FAULTLINE_STAGE=v0 AWS_PROFILE=XXxxXXX npm run deploy
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
